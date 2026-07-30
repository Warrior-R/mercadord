import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";
import { countUnreadNotifications } from "@/lib/notifications";
import { isAdmin } from "@/lib/moderation";

const linkClass = "text-ink-soft transition hover:text-primary";

/** Barra superior fina (eyebrow) estilo eBay: saludo a la izquierda, accesos de cuenta a la derecha. */
export async function HeaderTopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
    user?.email?.split("@")[0] ||
    null;

  const [unread, admin] = user
    ? await Promise.all([countUnreadNotifications(), isAdmin()])
    : [0, false];

  return (
    <div className="hidden border-b border-line bg-tile md:block">
      <div className="mx-auto flex h-9 max-w-[1280px] items-center justify-between px-5 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-ink">
            {name ? (
              <>
                ¡Hola, <strong className="font-semibold">{name}</strong>!
              </>
            ) : (
              <>Bienvenido a MercadoRD</>
            )}
          </span>
          <Link href="/subastas" className={linkClass}>
            🔨 Subastas
          </Link>
          <Link href="/legal/sobre-nosotros" className={linkClass}>
            Ayuda
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/vender" className={linkClass}>
                Vender
              </Link>
              <Link href="/favoritos" className={linkClass}>
                Favoritos
              </Link>
              <Link href="/mensajes" className={linkClass}>
                Mensajes
              </Link>
              <Link
                href="/notificaciones"
                className={`relative ${linkClass}`}
                aria-label={
                  unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"
                }
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              {admin && (
                <Link href="/admin" className={linkClass} title="Panel admin">
                  🛡️ Admin
                </Link>
              )}
              <Link href="/cuenta" className="font-semibold text-primary hover:underline">
                Mi cuenta
              </Link>
              <form action={signOut}>
                <button type="submit" className={linkClass}>
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/vender" className={linkClass}>
                Vender
              </Link>
              <Link href="/entrar" className={linkClass}>
                Entrar
              </Link>
              <Link
                href="/registro"
                className="rounded-md bg-primary px-3 py-1 font-semibold text-white transition hover:bg-primary-light"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
