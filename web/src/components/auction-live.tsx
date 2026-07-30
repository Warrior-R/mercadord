"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { placeBid, buyNow } from "@/lib/auction-actions";
import { formatPrice } from "@/lib/format";
import { minNextBid, formatTimeLeft } from "@/lib/auction-utils";

type Props = {
  auctionId: string;
  slug: string;
  initialCurrentBid: number;
  initialBidCount: number;
  initialEndsAt: string;
  initialLeader: string | null;
  initialStatus: string;
  buyNowPrice: number | null;
  isOwner: boolean;
  isLoggedIn: boolean;
  bidStatus?: string;
};

const BID_MESSAGES: Record<string, { text: string; tone: "ok" | "warn" | "err" }> = {
  ok: { text: "¡Puja registrada! Vas ganando… por ahora.", tone: "ok" },
  bought: { text: "¡Compra confirmada! Contacta al vendedor para coordinar.", tone: "ok" },
  low: { text: "Tu puja quedó por debajo del mínimo. Intenta con el monto sugerido.", tone: "warn" },
  closed: { text: "La subasta ya cerró.", tone: "warn" },
  own: { text: "No puedes pujar en tu propia subasta.", tone: "warn" },
  nobuynow: { text: "Esta subasta no tiene precio de compra directa.", tone: "warn" },
  notfound: { text: "No se encontró la subasta.", tone: "err" },
  error: { text: "No se pudo procesar la puja. Inténtalo de nuevo.", tone: "err" },
};

export function AuctionLive({
  auctionId,
  slug,
  initialCurrentBid,
  initialBidCount,
  initialEndsAt,
  initialLeader,
  initialStatus,
  buyNowPrice,
  isOwner,
  isLoggedIn,
  bidStatus,
}: Props) {
  const router = useRouter();
  const [currentBid, setCurrentBid] = useState(initialCurrentBid);
  const [bidCount, setBidCount] = useState(initialBidCount);
  const [endsAt, setEndsAt] = useState(initialEndsAt);
  const [leader, setLeader] = useState(initialLeader);
  const [status, setStatus] = useState(initialStatus);
  const [remaining, setRemaining] = useState(() =>
    new Date(initialEndsAt).getTime() - Date.now(),
  );

  // Suscripción Realtime: cualquier puja de otro usuario actualiza el panel al instante.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          setCurrentBid(Number(n.current_bid));
          setBidCount(Number(n.bid_count));
          setEndsAt(String(n.ends_at));
          setLeader((n.leader_masked as string | null) ?? null);
          setStatus(String(n.status));
          // Refresca el feed de pujas (renderizado por el server component padre).
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, router]);

  // Cuenta atrás en vivo.
  useEffect(() => {
    const tick = () => setRemaining(new Date(endsAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const live = status === "active" && remaining > 0;
  const nextMin = minNextBid(currentBid);
  const msg = bidStatus ? BID_MESSAGES[bidStatus] : undefined;

  return (
    <section
      aria-label="Puja en vivo"
      className="rounded-xl border border-line bg-white p-5"
    >
      {msg && (
        <p
          className={`mb-4 rounded-lg border p-3 text-sm ${
            msg.tone === "ok"
              ? "border-green-300 bg-green-50 text-green-800"
              : msg.tone === "warn"
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Puja actual
          </p>
          <p className="text-3xl font-bold text-accent">
            {formatPrice(currentBid)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {bidCount} puja{bidCount === 1 ? "" : "s"}
            {leader ? ` · líder: ${leader}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {live ? "Termina en" : "Estado"}
          </p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              live && remaining < 120_000 ? "text-accent" : "text-ink"
            }`}
          >
            {live ? formatTimeLeft(remaining) : "Finalizada"}
          </p>
          {live && remaining < 120_000 && (
            <p className="text-xs font-semibold text-accent">
              ¡Últimos minutos! Pujar extiende el cierre.
            </p>
          )}
        </div>
      </div>

      {!live ? (
        <p className="mt-5 rounded-lg border border-line bg-tile p-3 text-sm text-ink-soft">
          Esta subasta ha finalizado. {leader ? `Ganador: ${leader}.` : ""}
        </p>
      ) : isOwner ? (
        <p className="mt-5 rounded-lg border border-line bg-tile p-3 text-sm text-ink-soft">
          Es tu subasta. Verás las pujas en vivo aquí.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <form action={placeBid} className="flex flex-col gap-2">
            <input type="hidden" name="auction_id" value={auctionId} />
            <input type="hidden" name="slug" value={slug} />
            <label className="text-xs font-medium text-ink-soft" htmlFor="bid-amount">
              Tu puja (mínimo {formatPrice(nextMin)})
            </label>
            <div className="flex gap-2">
              <input
                id="bid-amount"
                type="number"
                name="amount"
                min={nextMin}
                step={100}
                defaultValue={nextMin}
                required
                className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light"
              >
                {isLoggedIn ? "Pujar" : "Inicia sesión para pujar"}
              </button>
            </div>
          </form>

          {buyNowPrice && (
            <form action={buyNow}>
              <input type="hidden" name="auction_id" value={auctionId} />
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                className="w-full rounded-lg border-2 border-brand-green px-4 py-2.5 text-sm font-bold text-brand-green transition hover:bg-brand-green hover:text-white"
              >
                Cómpralo ya por {formatPrice(buyNowPrice)}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
