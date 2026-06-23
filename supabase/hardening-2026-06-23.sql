-- ════════════════════════════════════════════════════════════════════
--  MercadoRD — Hardening de seguridad 2026-06-23
--  Cierra hallazgos de la auditoría:
--    · B1 (CRÍTICO/BLOQUEANTE) escalada a admin vía UPDATE de profiles
--    · A1  falseo de phone_verified / cédula / email por el cliente
--    · A2  pedidos: inserción directa con totales del cliente
--    · MED reports: spam / suplantación de reporter_email
--    · BAJO products UPDATE sin with check (reasignar user_id)
--  Idempotente y seguro de re-ejecutar.
--  Ejecutar completo en: Dashboard → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════════

-- ─── B1 + A1: congelar columnas sensibles en el trigger que ya protege
--     la verificación. El dashboard / service_role (auth.uid() = NULL) sí
--     puede cambiarlas; el usuario con la anon key, NO.
create or replace function public.protect_verification_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.is_verified    := old.is_verified;
    new.is_admin       := old.is_admin;        -- ← cierra la escalada a admin (BLOQUEANTE)
    new.phone_verified := old.phone_verified;  -- ← solo phone-verify (service_role) lo marca
    new.cedula         := old.cedula;          -- la cédula no debe mutar tras el alta
    new.email          := old.email;           -- el email lo gobierna auth.users
    if new.verification_status is distinct from old.verification_status
       and new.verification_status <> 'pending' then
      new.verification_status := old.verification_status;
    end if;
  end if;
  return new;
end;
$$;
-- El trigger protect_profiles_verification ya existe (setup.sql); basta recrear la función.

-- Saneamiento: revocar admin a cualquiera que se lo haya puesto indebidamente.
update public.profiles
   set is_admin = false
 where is_admin is true
   and lower(coalesce(email, '')) <> lower('carguerrero1998@gmail.com');

-- ─── A2: los pedidos solo se crean vía la RPC create_order() (SECURITY DEFINER),
--     que recalcula subtotal/itbis/total/envío desde products.price. Se quita la
--     inserción directa que confiaba en los totales enviados por el cliente.
--     ⚠️ Requisito: create_order() debe estar desplegada y funcionando (es el
--        camino normal del checkout). El fallback del frontend ya se eliminó.
drop policy if exists "pedidos: crear propios" on public.orders;
revoke insert on public.orders from anon, authenticated;

-- ─── reports: atar el reporte al usuario y evitar suplantar reporter_email.
--     El reporte anónimo legítimo sigue entrando por la Edge Function `chatbot`
--     con service_role (que bypassa RLS).
drop policy if exists rep_insert on public.reports;
create policy rep_insert on public.reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and (
      reporter_email is null
      or reporter_email = (select email from public.profiles where id = auth.uid())
    )
  );

-- ─── products: impedir reasignar user_id en el UPDATE (faltaba with check).
drop policy if exists "productos: editar propios" on public.products;
create policy "productos: editar propios" on public.products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Verificación rápida tras ejecutar (debe devolver 0 filas / solo el dueño):
-- select id, email, is_admin from public.profiles where is_admin is true;
