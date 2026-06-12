-- ═══════════════════════════════════════════════════
--  MercadoRD — Verificación de teléfono (Twilio Verify)
--  La Edge Function `phone-verify` valida el OTP y registra el teléfono
--  en phone_verifications; el trigger marca profiles.phone_verified.
--  Idempotente.
-- ═══════════════════════════════════════════════════

alter table public.profiles add column if not exists phone_verified boolean default false;

-- Registro server-side de teléfonos verificados (solo lo escribe la Edge
-- Function con service_role; sin policies = inaccesible para anon/authenticated).
create table if not exists public.phone_verifications (
  phone       text,
  verified_at timestamptz default now()
);
alter table public.phone_verifications enable row level security;
create index if not exists phone_verif_idx on public.phone_verifications(phone, verified_at desc);

-- Normaliza a solo dígitos quedándose con los últimos 10 (números RD)
create or replace function public.normalize_phone(p text)
returns text language sql immutable as $$
  select right(regexp_replace(coalesce(p,''), '\D', '', 'g'), 10);
$$;

-- handle_new_user (reemplaza el de setup.sql): además marca phone_verified
-- si el teléfono del registro fue verificado server-side hace < 2 horas.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare pv boolean := false;
begin
  begin
    pv := (nullif(new.raw_user_meta_data->>'phone','') is not null) and exists(
      select 1 from public.phone_verifications
      where public.normalize_phone(phone) = public.normalize_phone(new.raw_user_meta_data->>'phone')
        and verified_at > now() - interval '2 hours'
    );
  exception when others then pv := false; end;

  begin
    insert into public.profiles (id, email, full_name, phone, cedula, birth_date, province, phone_verified)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'phone',
      nullif(new.raw_user_meta_data->>'cedula', ''),
      nullif(new.raw_user_meta_data->>'birth_date', '')::date,
      new.raw_user_meta_data->>'province',
      pv
    )
    on conflict (id) do nothing;
  exception when others then
    insert into public.profiles (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;
