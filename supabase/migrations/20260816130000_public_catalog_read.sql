-- Catálogo e bairros visíveis antes do login
drop policy if exists "points_select_catalog_admin" on public.fishing_points;
create policy "points_select_catalog_admin"
  on public.fishing_points for select
  using (source in ('catalog', 'admin'));

drop policy if exists "places_select_auth" on public.places;
create policy "places_select_public"
  on public.places for select
  using (true);
