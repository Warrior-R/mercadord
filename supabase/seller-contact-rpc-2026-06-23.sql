-- ════════════════════════════════════════════════════════════════════
--  Endurecimiento: leer el WhatsApp del vendedor SOLO por RPC (2026-06-23)
--  Antes: el frontend hacía `select wa from seller_contacts` (gated por RLS a
--  verificados). Ahora la lectura pasa por una función SECURITY DEFINER y se
--  REVOCA el select directo → la tabla deja de ser legible/enumerable por el
--  cliente; el número solo sale de a uno, por ref concreta, y solo a verificados.
--
--  ORDEN DE DESPLIEGUE (sin downtime):
--   1) Aplicar la RPC (este bloque de arriba). El frontend viejo sigue con
--      select directo, que aún funciona.
--   2) Desplegar el frontend que usa get_seller_contact.
--   3) SOLO ENTONCES ejecutar el bloque de REVOKE del final.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.get_seller_contact(p_ref_id uuid, p_kind text)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare v_wa text;
begin
  -- gate: el solicitante debe estar verificado (KYC)
  if not exists (select 1 from public.profiles where id = auth.uid() and is_verified is true) then
    return null;
  end if;
  select wa into v_wa
    from public.seller_contacts
   where ref_id = p_ref_id and kind = p_kind;
  return v_wa;
end;
$$;

revoke all on function public.get_seller_contact(uuid, text) from public, anon;
grant execute on function public.get_seller_contact(uuid, text) to authenticated;

-- ── PASO 3 (ejecutar SOLO después de desplegar el frontend que usa la RPC) ──
-- drop policy if exists sc_select_verified on public.seller_contacts;
-- revoke select on public.seller_contacts from authenticated;
