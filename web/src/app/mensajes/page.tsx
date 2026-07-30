import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyMessages } from "@/lib/messages";
import { slugify } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes", robots: { index: false } };

export default async function MensajesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=/mensajes&message=${encodeURIComponent("Inicia sesión para ver tus mensajes.")}`,
    );
  }

  const messages = await listMyMessages();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">Mensajes</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Conversaciones sobre tus anuncios y los que te interesan.
      </p>

      {messages.length === 0 ? (
        <div className="mt-6 rounded-[10px] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-medium text-ink">Sin mensajes todavía</p>
          <p className="mt-1 text-sm text-ink-soft">
            Cuando escribas a un vendedor o alguien te contacte, aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {messages.map((m) => {
            const received = m.recipient_id === user.id;
            const href =
              m.product_id && m.product_title
                ? `/producto/${slugify(m.product_title)}-${m.product_id}`
                : null;
            return (
              <li
                key={m.id}
                className="rounded-xl border border-line bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                      (received
                        ? "bg-blue-50 text-primary"
                        : "bg-neutral-100 text-ink-soft")
                    }
                  >
                    {received ? "Recibido" : "Enviado"}
                  </span>
                  {received && !m.read && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                      Nuevo
                    </span>
                  )}
                </div>
                {m.product_title && (
                  <p className="mt-2 text-xs text-ink-soft">
                    Sobre:{" "}
                    {href ? (
                      <Link href={href} className="font-medium text-primary hover:underline">
                        {m.product_title}
                      </Link>
                    ) : (
                      <span className="font-medium">{m.product_title}</span>
                    )}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-line text-sm text-ink">
                  {m.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
