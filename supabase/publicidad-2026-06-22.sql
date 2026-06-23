-- ════════════════════════════════════════════════════════════════════
--  Publicidad / Monetización — 2026-06-22
--   1) Rol admin (profiles.is_admin) → solo el dueño gestiona publicidad.
--   2) ad_banners: banners de patrocinadores (lectura pública de activos,
--      escritura solo admin).
--   3) featured_products: anuncios destacados, en tabla aparte y admin-only
--      para que NINGÚN vendedor pueda auto-destacarse editando su producto.
-- ════════════════════════════════════════════════════════════════════

-- 1) Rol administrador
alter table public.profiles add column if not exists is_admin boolean not null default false;
update public.profiles set is_admin = true where lower(email) = lower('carguerrero1998@gmail.com');

-- 2) Banners de patrocinadores
create table if not exists public.ad_banners (
  id         uuid primary key default gen_random_uuid(),
  slot       text not null default 'top' check (slot in ('top','footer')),
  title      text,
  image_url  text not null,
  link_url   text not null,
  active     boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.ad_banners enable row level security;

-- Público: solo banners ACTIVOS. Admin (vía policy 'for all') ve y gestiona todos.
drop policy if exists ab_public_read on public.ad_banners;
create policy ab_public_read on public.ad_banners
  for select to anon, authenticated using (active is true);

drop policy if exists ab_admin_write on public.ad_banners;
create policy ab_admin_write on public.ad_banners
  for all to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true));

grant select on public.ad_banners to anon, authenticated;
grant insert, update, delete on public.ad_banners to authenticated;  -- RLS lo limita a admin

-- 3) Anuncios destacados (admin-controlado; separado de products)
create table if not exists public.featured_products (
  product_id uuid primary key references public.products(id) on delete cascade,
  until      timestamptz,
  created_at timestamptz not null default now()
);
alter table public.featured_products enable row level security;

drop policy if exists fp_public_read on public.featured_products;
create policy fp_public_read on public.featured_products
  for select to anon, authenticated using (true);

drop policy if exists fp_admin_write on public.featured_products;
create policy fp_admin_write on public.featured_products
  for all to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true));

grant select on public.featured_products to anon, authenticated;
grant insert, update, delete on public.featured_products to authenticated;  -- RLS lo limita a admin
