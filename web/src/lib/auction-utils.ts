/**
 * Incremento mínimo de puja. ESPEJO EXACTO de public.bid_step() en
 * supabase/auctions.sql: 2% redondeado a centenas, mínimo RD$500.
 * Debe coincidir o el cliente mostraría un mínimo distinto al que valida el RPC.
 */
export function bidStep(price: number): number {
  const p = Number.isFinite(price) && price > 0 ? price : 0;
  return Math.max(500, Math.round((p * 0.02) / 100) * 100);
}

/** Puja mínima siguiente = puja actual + incremento. */
export function minNextBid(currentBid: number): number {
  return currentBid + bidStep(currentBid);
}

/** ¿La subasta sigue viva? (activa y sin vencer). */
export function isAuctionLive(status: string | null, endsAt: string | null): boolean {
  if (status !== "active" || !endsAt) return false;
  return new Date(endsAt).getTime() > Date.now();
}

/**
 * Formatea el tiempo restante a partir de milisegundos. "2d 3h", "3h 12m",
 * "12m 05s", "45s", o "Finalizada" si ya venció.
 */
export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "Finalizada";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}
