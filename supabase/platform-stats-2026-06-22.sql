-- ════════════════════════════════════════════════════════════════════
--  Estadísticas reales del hero (auto-actualizables) — 2026-06-22
--  Reemplaza los números ficticios (+120K, +45K, +800K) por conteos vivos.
--  Expuesto al público (anon) vía RPC: solo devuelve TOTALES agregados,
--  ningún dato personal. SECURITY DEFINER para poder contar profiles
--  (cuya RLS no deja al anon leer filas individuales).
-- ════════════════════════════════════════════════════════════════════

-- 1) Contador histórico de anuncios publicados (acumulado; no baja al borrar).
--    Se inicializa con los productos activos actuales (hoy 0 tras la limpieza).
insert into public.app_settings (key, value)
select 'ads_published_total', count(*)::text from public.products
on conflict (key) do nothing;

-- 2) Trigger: cada anuncio insertado en `products` incrementa el contador.
create or replace function public.bump_ads_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (key, value)
  values ('ads_published_total', '1')
  on conflict (key)
  do update set value = ((coalesce(public.app_settings.value, '0'))::bigint + 1)::text;
  return new;
end;
$$;

revoke all on function public.bump_ads_published() from public;

drop trigger if exists trg_bump_ads_published on public.products;
create trigger trg_bump_ads_published
  after insert on public.products
  for each row execute function public.bump_ads_published();

-- 3) RPC pública de estadísticas: devuelve solo totales agregados.
create or replace function public.get_platform_stats()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'products',         (select count(*) from public.products),
    'sellers_verified', (select count(*) from public.profiles where is_verified is true),
    'ads_total',        coalesce(
                          (select value::bigint from public.app_settings where key = 'ads_published_total'),
                          (select count(*) from public.products)
                        ),
    'provinces',        (select count(distinct location) from public.products
                          where location is not null and location <> ''),
    'provinces_total',  32
  );
$$;

-- Solo lectura agregada: accesible para visitantes (anon) y usuarios.
revoke all on function public.get_platform_stats() from public;
grant execute on function public.get_platform_stats() to anon, authenticated;
