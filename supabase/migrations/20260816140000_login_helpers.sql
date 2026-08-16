-- Helpers de login (verificar se usuário existe antes de autenticar)
create or replace function public.check_username_exists(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles where lower(username) = lower(trim(p_username))
  );
$$;

revoke all on function public.check_username_exists(text) from public;
grant execute on function public.check_username_exists(text) to anon, authenticated;
