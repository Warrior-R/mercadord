import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/message-actions";
import { whatsappLink } from "@/lib/format";
import type { Product } from "@/lib/types";

export async function ContactSeller({
  product,
  slug,
  status,
}: {
  product: Product;
  slug: string;
  status?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user && user.id === product.user_id;

  // Se consulta aparte y con tolerancia: si la columna `whatsapp` aún no existe
  // (migración F2 sin correr), el error se ignora y no se muestra el botón.
  let whatsapp: string | null = null;
  try {
    const { data } = await supabase
      .from("products")
      .select("whatsapp")
      .eq("id", product.id)
      .maybeSingle();
    whatsapp = (data?.whatsapp as string | null | undefined) ?? null;
  } catch {
    whatsapp = null;
  }

  const wa = whatsapp
    ? whatsappLink(whatsapp, `Hola, me interesa "${product.title}" en MercadoRD.`)
    : null;

  return (
    <section
      aria-label="Contactar al vendedor"
      className="mt-6 rounded-xl border border-line bg-tile p-4"
    >
      <h2 className="text-sm font-semibold text-ink">Contactar al vendedor</h2>

      {isOwner ? (
        <p className="mt-2 text-sm text-ink-soft">
          Este es tu anuncio. Verás aquí los mensajes de compradores interesados
          en <strong>Mensajes</strong>.
        </p>
      ) : (
        <>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
            >
              <span aria-hidden>🟢</span> Contactar por WhatsApp
            </a>
          )}

          {status === "sent" && (
            <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
              Mensaje enviado. El vendedor lo verá en su bandeja.
            </p>
          )}
          {status === "empty" && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Escribe un mensaje antes de enviar.
            </p>
          )}
          {status === "error" && (
            <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              No se pudo enviar el mensaje. Inténtalo de nuevo.
            </p>
          )}

          <form action={sendMessage} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="product_id" value={product.id} />
            <input type="hidden" name="slug" value={slug} />
            <label className="text-xs font-medium text-ink-soft" htmlFor="msg-body">
              Enviar un mensaje
            </label>
            <textarea
              id="msg-body"
              name="body"
              rows={3}
              required
              placeholder="Hola, ¿sigue disponible? ¿Aceptas ofertas?"
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
            >
              {user ? "Enviar mensaje" : "Inicia sesión para enviar"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
