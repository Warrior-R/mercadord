-- ═══════════════════════════════════════════════════
--  MercadoRD — Esquema de base de datos (Supabase)
--  Ejecutar completo en: Dashboard → SQL Editor → Run
--  Idempotente: se puede ejecutar más de una vez sin romper nada.
-- ═══════════════════════════════════════════════════

-- ─── PERFILES ───────────────────────────────────────
-- Un perfil por usuario de auth.users, creado automáticamente al registrarse.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  full_name           text,
  phone               text,
  cedula              text unique,
  birth_date          date,
  province            text,
  is_verified         boolean default false,
  verification_status text default 'none',  -- none | pending | verified | rejected
  created_at          timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfil: leer propio"      on public.profiles;
drop policy if exists "perfil: actualizar propio" on public.profiles;
create policy "perfil: leer propio"       on public.profiles for select using (auth.uid() = id);
create policy "perfil: actualizar propio" on public.profiles for update using (auth.uid() = id);

-- Protección anti auto-verificación: un usuario (anon key) NO puede ponerse
-- is_verified=true ni cambiar verification_status salvo a 'pending'.
-- El dashboard / service_role (auth.uid() null) puede cambiar todo:
-- aprobar = marcar is_verified en el Table Editor.
create or replace function public.protect_verification_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.is_verified := old.is_verified;
    if new.verification_status is distinct from old.verification_status
       and new.verification_status <> 'pending' then
      new.verification_status := old.verification_status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_verification on public.profiles;
create trigger protect_profiles_verification
  before update on public.profiles
  for each row execute function public.protect_verification_fields();

-- Trigger: crea el perfil al registrarse (email o Google) copiando los
-- metadatos del formulario de registro. Si la cédula ya existe en otro
-- perfil, crea el perfil sin cédula en lugar de bloquear el registro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Los metadatos vienen del cliente (anon key): cualquier valor corrupto
  -- (cédula duplicada, fecha malformada…) NO debe abortar el registro.
  begin
    insert into public.profiles (id, email, full_name, phone, cedula, birth_date, province)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'phone',
      nullif(new.raw_user_meta_data->>'cedula', ''),
      nullif(new.raw_user_meta_data->>'birth_date', '')::date,
      new.raw_user_meta_data->>'province'
    )
    on conflict (id) do nothing;
  exception when others then
    -- Plan B: perfil mínimo (sin cédula/fecha) en vez de bloquear la cuenta
    insert into public.profiles (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── VERIFICACIONES DE IDENTIDAD ────────────────────
create table if not exists public.verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  doc_type    text,
  doc_number  text,
  full_name   text,
  doc_file_url     text,
  face_capture_url text,
  status      text default 'pending',  -- pending | verified | rejected
  created_at  timestamptz default now(),
  verified_at timestamptz
);

alter table public.verifications enable row level security;

drop policy if exists "verificacion: crear propia" on public.verifications;
drop policy if exists "verificacion: leer propia"  on public.verifications;
create policy "verificacion: crear propia" on public.verifications for insert with check (auth.uid() = user_id);
create policy "verificacion: leer propia"  on public.verifications for select using (auth.uid() = user_id);

-- ─── PRODUCTOS (para migrar los anuncios de localStorage) ───
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  seller_name text,                       -- denormalizado (RLS de profiles no deja leer nombres ajenos)
  title       text not null,
  description text,
  price       numeric(12,2) not null check (price > 0),
  old_price   numeric(12,2),
  category    text,
  condition   text,
  location    text,
  image_url   text,
  rating      numeric(2,1) default 0,
  reviews     integer default 0,
  views       integer default 0,
  created_at  timestamptz default now()
);

alter table public.products enable row level security;

drop policy if exists "productos: ver todos"        on public.products;
drop policy if exists "productos: crear propios"    on public.products;
drop policy if exists "productos: editar propios"   on public.products;
drop policy if exists "productos: eliminar propios" on public.products;
-- Idempotente: añade seller_name si la tabla products ya existía sin esa columna
alter table public.products add column if not exists seller_name text;

create policy "productos: ver todos"        on public.products for select using (true);
create policy "productos: crear propios"    on public.products for insert with check (auth.uid() = user_id);
create policy "productos: editar propios"   on public.products for update using (auth.uid() = user_id);
create policy "productos: eliminar propios" on public.products for delete using (auth.uid() = user_id);

-- ─── PEDIDOS ────────────────────────────────────────
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,                 -- MRD-XXXX visible al cliente
  buyer_id    uuid references auth.users(id) on delete cascade,
  items       jsonb not null,              -- [{title, qty, price}, ...]
  subtotal    numeric(12,2),
  shipping    numeric(12,2),
  itbis       numeric(12,2),
  total       numeric(12,2),
  buyer_info  jsonb,                       -- {name, phone, addr, prov}
  payment     text,
  status      text default 'pendiente',    -- pendiente | enviado | entregado
  created_at  timestamptz default now()
);

alter table public.orders enable row level security;

drop policy if exists "pedidos: crear propios" on public.orders;
drop policy if exists "pedidos: leer propios"  on public.orders;
create policy "pedidos: crear propios" on public.orders for insert with check (auth.uid() = buyer_id);
create policy "pedidos: leer propios"  on public.orders for select using (auth.uid() = buyer_id);

-- ─── FAVORITOS ──────────────────────────────────────
create table if not exists public.favorites (
  user_id    uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favoritos: gestionar propios" on public.favorites;
create policy "favoritos: gestionar propios" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices en columnas FK / de filtro (evitan seq-scans en lecturas y en los ON DELETE)
create index if not exists products_user_idx on public.products(user_id);
create index if not exists orders_buyer_idx on public.orders(buyer_id);
create index if not exists favorites_product_idx on public.favorites(product_id);
create index if not exists verifications_user_idx on public.verifications(user_id);
