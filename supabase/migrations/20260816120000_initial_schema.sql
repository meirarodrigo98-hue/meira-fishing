-- Meira Fishing — schema inicial
-- Rode no Supabase: SQL Editor → New query → colar → Run
-- Ou: supabase db push (CLI)

-- ── Extensões ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Tipos ──────────────────────────────────────────────────────────────────
do $$ begin
  create type point_source as enum ('catalog', 'admin', 'user');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type point_mode as enum ('land', 'boat');
exception when duplicate_object then null;
end $$;

-- ── Perfis (ligado ao Supabase Auth) ───────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null default '',
  is_admin boolean not null default false,
  style text not null default 'todos'
    check (style in ('todos', 'terra', 'barco', 'lagoa')),
  level text not null default 'iniciante'
    check (level in ('iniciante', 'intermediario', 'avancado')),
  gear jsonb not null default '{"rod":null,"reel":null,"line":null,"baits":[],"sinkers":[],"extras":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9._-]{2,24}$')
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ── Pontos de pesca (catálogo + admin + usuário) ───────────────────────────
create table if not exists public.fishing_points (
  id text primary key,
  source point_source not null default 'user',
  owner_id uuid references public.profiles (id) on delete cascade,
  mode point_mode not null default 'land',
  name text not null,
  area text not null default '',
  lat double precision not null,
  lng double precision not null,
  point_type text not null default 'Pedra',
  confidence smallint not null default 70
    check (confidence between 0 and 100),
  species text[] not null default '{}',
  access_note text not null default '',
  coast jsonb,
  accuracy_m double precision,
  is_personal boolean not null default false,
  is_protected boolean not null default false,
  is_admin_point boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fishing_points_lat check (lat between -90 and 90),
  constraint fishing_points_lng check (lng between -180 and 180),
  constraint fishing_points_owner_source check (
    (source = 'user' and owner_id is not null)
    or (source in ('catalog', 'admin') and owner_id is null)
  )
);

create index if not exists fishing_points_source_idx on public.fishing_points (source);
create index if not exists fishing_points_owner_idx on public.fishing_points (owner_id);
create index if not exists fishing_points_geo_idx on public.fishing_points (lat, lng);

-- ── Bairros de fallback (GPS) ──────────────────────────────────────────────
create table if not exists public.places (
  id bigint generated always as identity primary key,
  name text not null unique,
  lat double precision not null,
  lng double precision not null
);

-- ── Cache de clima (opcional) ──────────────────────────────────────────────
create table if not exists public.weather_cache (
  point_id text not null references public.fishing_points (id) on delete cascade,
  fetched_at timestamptz not null default now(),
  estimated boolean not null default false,
  payload jsonb not null,
  primary key (point_id, fetched_at)
);

create index if not exists weather_cache_point_latest_idx
  on public.weather_cache (point_id, fetched_at desc);

-- ── Snapshots de backup dos pontos pessoais ──────────────────────────────────
create table if not exists public.point_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  point_count integer not null default 0,
  points jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists point_snapshots_owner_idx
  on public.point_snapshots (owner_id, created_at desc);

-- ── updated_at automático ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists fishing_points_set_updated_at on public.fishing_points;
create trigger fishing_points_set_updated_at
  before update on public.fishing_points
  for each row execute function public.set_updated_at();

-- ── Perfil ao criar conta no Auth ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  dname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  dname := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', uname);

  insert into public.profiles (id, username, display_name, is_admin)
  values (
    new.id,
    uname,
    dname,
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.fishing_points enable row level security;
alter table public.places enable row level security;
alter table public.weather_cache enable row level security;
alter table public.point_snapshots enable row level security;

-- helper: usuário é admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- fishing_points: catálogo e admin — leitura pública autenticada
drop policy if exists "points_select_catalog_admin" on public.fishing_points;
create policy "points_select_catalog_admin"
  on public.fishing_points for select
  using (
    auth.role() = 'authenticated'
    and source in ('catalog', 'admin')
  );

drop policy if exists "points_select_own_user" on public.fishing_points;
create policy "points_select_own_user"
  on public.fishing_points for select
  using (source = 'user' and owner_id = auth.uid());

drop policy if exists "points_insert_own" on public.fishing_points;
create policy "points_insert_own"
  on public.fishing_points for insert
  with check (
    source = 'user'
    and owner_id = auth.uid()
    and is_admin_point = false
  );

drop policy if exists "points_update_own" on public.fishing_points;
create policy "points_update_own"
  on public.fishing_points for update
  using (source = 'user' and owner_id = auth.uid())
  with check (source = 'user' and owner_id = auth.uid());

drop policy if exists "points_delete_own" on public.fishing_points;
create policy "points_delete_own"
  on public.fishing_points for delete
  using (source = 'user' and owner_id = auth.uid() and is_protected = false);

drop policy if exists "points_admin_all" on public.fishing_points;
create policy "points_admin_all"
  on public.fishing_points for all
  using (public.is_admin())
  with check (public.is_admin());

-- places: leitura para autenticados
drop policy if exists "places_select_auth" on public.places;
create policy "places_select_auth"
  on public.places for select
  using (auth.role() = 'authenticated');

drop policy if exists "places_admin_write" on public.places;
create policy "places_admin_write"
  on public.places for all
  using (public.is_admin())
  with check (public.is_admin());

-- weather_cache: leitura autenticada; escrita admin ou service role
drop policy if exists "weather_select_auth" on public.weather_cache;
create policy "weather_select_auth"
  on public.weather_cache for select
  using (auth.role() = 'authenticated');

drop policy if exists "weather_admin_write" on public.weather_cache;
create policy "weather_admin_write"
  on public.weather_cache for all
  using (public.is_admin())
  with check (public.is_admin());

-- snapshots: só dono
drop policy if exists "snapshots_own" on public.point_snapshots;
create policy "snapshots_own"
  on public.point_snapshots for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── Seed: bairros fallback ─────────────────────────────────────────────────
insert into public.places (name, lat, lng) values
  ('Copacabana', -22.971, -43.182),
  ('Ipanema', -22.984, -43.205),
  ('Lagoa', -22.972, -43.210),
  ('Urca', -22.952, -43.166),
  ('Centro', -22.906, -43.173),
  ('Barra', -23.011, -43.366),
  ('Niterói', -22.903, -43.108)
on conflict (name) do nothing;

-- ── View útil: todos os pontos visíveis ao usuário logado ────────────────────
create or replace view public.my_fishing_points as
select
  fp.*,
  case
    when fp.source in ('catalog', 'admin') then 'public'
    when fp.owner_id = auth.uid() then 'mine'
    else 'other'
  end as visibility
from public.fishing_points fp
where
  fp.source in ('catalog', 'admin')
  or fp.owner_id = auth.uid()
  or public.is_admin();

grant select on public.my_fishing_points to authenticated;
