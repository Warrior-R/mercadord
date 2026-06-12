-- ═══════════════════════════════════════════════════
--  MercadoRD — Correos transaccionales de subastas (Resend)
--  Manda email "ganaste"/"perdiste" cuando se crea la notificación.
--  100% en la BD vía pg_net → API de Resend (sin Edge Function).
--  Idempotente.
-- ═══════════════════════════════════════════════════

-- HTTP saliente desde Postgres
create extension if not exists pg_net;

-- ─── Config no-secreta (remitente + interruptor) ────
create table if not exists public.app_settings (
  key   text primary key,
  value text
);
alter table public.app_settings enable row level security;  -- sin policies: solo funciones definer
insert into public.app_settings(key, value) values
  ('email_from',      'MercadoRD <onboarding@resend.dev>'),  -- cambiar a @mercadord.net al verificar el dominio
  ('emails_enabled',  'false')                               -- poner 'true' tras verificar el dominio en Resend
on conflict (key) do nothing;

-- ─── La API key de Resend va cifrada en Vault ───────
-- ⚠️ El valor de la key NO se guarda en este archivo (se commitea a GitHub).
-- Se carga UNA sola vez, fuera del repo, vía la Management API leyendo el valor
-- de .secrets/resend-key.txt (no versionado). En SQL/dashboard equivale a:
--   select vault.create_secret('<RESEND_API_KEY>', 'RESEND_API_KEY', 'Correos de subastas');
-- Para rotarla: vault.update_secret((select id from vault.secrets where name='RESEND_API_KEY'), '<nueva>');
-- Las funciones de abajo solo la LEEN por nombre desde vault.decrypted_secrets.

-- ─── Enviar un correo por Resend ────────────────────
create or replace function public.send_resend_email(p_to text, p_subject text, p_html text)
returns bigint
language plpgsql security definer set search_path = public, vault as $$
declare k text; sender text; rid bigint;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'RESEND_API_KEY';
  if k is null or p_to is null then return null; end if;
  select value into sender from public.app_settings where key = 'email_from';
  sender := coalesce(sender, 'MercadoRD <onboarding@resend.dev>');
  select net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
    body    := jsonb_build_object('from', sender, 'to', jsonb_build_array(p_to), 'subject', p_subject, 'html', p_html)
  ) into rid;
  return rid;
end $$;

-- ─── Plantilla HTML de correo de subasta ────────────
create or replace function public.auction_email_html(p_title text, p_body text)
returns text language sql immutable as $$
  select
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a2e">'
    || '<div style="font-size:22px;font-weight:700;color:#2b50d6;margin-bottom:4px">Mercado<span style="color:#ff7a00">RD</span></div>'
    || '<div style="height:3px;background:#2b50d6;border-radius:2px;margin-bottom:18px"></div>'
    || '<h2 style="font-size:18px;margin:0 0 8px">' || coalesce(p_title,'') || '</h2>'
    || '<p style="font-size:14px;line-height:1.6;color:#444">' || coalesce(p_body,'') || '</p>'
    || '<p style="margin:22px 0"><a href="https://mercadord.net" style="background:#2b50d6;color:#fff;padding:11px 22px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">Ir a MercadoRD</a></p>'
    || '<p style="color:#9aa0b8;font-size:11px;margin-top:24px">Recibes este correo porque participaste en una subasta en MercadoRD. '
    || 'República Dominicana 🇩🇴</p></div>';
$$;

-- ─── Disparador: al crear una notificación, mandar correo ─
create or replace function public.notif_email_trigger()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare em text; enabled text;
begin
  -- Solo ganaste/perdiste por correo (las demás quedan solo in-app)
  if NEW.type not in ('won','lost') then return NEW; end if;
  select value into enabled from public.app_settings where key = 'emails_enabled';
  if coalesce(enabled,'false') <> 'true' then return NEW; end if;  -- interruptor maestro
  select email into em from auth.users where id = NEW.user_id;
  if em is null then return NEW; end if;
  perform public.send_resend_email(em, NEW.title, public.auction_email_html(NEW.title, NEW.body));
  return NEW;
end $$;

drop trigger if exists notif_email on public.notifications;
create trigger notif_email after insert on public.notifications
  for each row execute function public.notif_email_trigger();
