-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN DE CONTENCIÓN — MarketplaceDR
-- SOLO LECTURA. No modifica nada. Correr en Supabase → SQL Editor.
-- Cada bloque devuelve PASS ✅ / FAIL ❌ / INFO ℹ️.
-- Si algo da FAIL, correr el archivo indicado y volver a verificar.
-- ═══════════════════════════════════════════════════════════════════════

-- 1) C1/B1 — ¿el trigger protect_verification_fields congela is_admin?
select
  'C1 · trigger congela is_admin' as verificacion,
  case when bool_or(prosrc ilike '%is_admin%')
       then 'PASS ✅'
       else 'FAIL ❌ → correr supabase/hardening-2026-06-23.sql' end as resultado
from pg_proc
where proname = 'protect_verification_fields';

-- 2) C1/B1 — ¿la política UPDATE de profiles tiene WITH CHECK?
select
  'C1 · profiles UPDATE con WITH CHECK' as verificacion,
  coalesce(
    string_agg(
      policyname || ': ' ||
      case when with_check is not null then 'PASS ✅' else 'FAIL ❌ (sin with_check)' end,
      ' | '),
    'FAIL ❌ (no hay policy UPDATE en profiles)') as resultado
from pg_policies
where schemaname = 'public' and tablename = 'profiles' and cmd = 'UPDATE';

-- 3) C1/B1 — admins actuales (debe devolver SOLO al dueño real)
select
  'C1 · admins actuales (revisar la lista)' as verificacion,
  id, email, is_admin
from public.profiles
where is_admin is true
order by email;

-- 4) H1 — ¿place_bid y buy_now exigen KYC (is_verified)?
select
  'H1 · ' || proname || ' exige KYC' as verificacion,
  case when prosrc ilike '%KYC_REQUIRED%' or prosrc ilike '%is_verified%'
       then 'PASS ✅'
       else 'FAIL ❌ → correr supabase/hardening2-2026-06-23.sql' end as resultado
from pg_proc
where proname in ('place_bid', 'buy_now')
order by proname;

-- 5) C2 (defensa server-side) — ¿hay CHECK/constraint sobre auctions.icon?
select
  'C2 · auctions.icon con validación server-side' as verificacion,
  case when exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = any(c.conkey)
    where t.relname = 'auctions' and a.attname = 'icon' and c.contype = 'c'
  ) then 'PASS ✅'
    else 'INFO ℹ️ sin CHECK en icon — el parche esc(a.icon) en el cliente es el mínimo; añadir CHECK/trigger como defensa en profundidad' end as resultado;

-- 6) Extra — ¿existe la tabla webhook_events (idempotencia de webhooks)?
select
  'Extra · webhook_events (idempotencia)' as verificacion,
  case when to_regclass('public.webhook_events') is not null
       then 'PASS ✅'
       else 'FAIL ❌ → correr supabase/hardening2-2026-06-23.sql' end as resultado;
