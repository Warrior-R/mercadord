"use client";

import { useEffect, useState } from "react";
import { formatTimeLeft } from "@/lib/auction-utils";

/** Cuenta atrás ligera para tarjetas de subasta. */
export function AuctionCountdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(
    () => new Date(endsAt).getTime() - Date.now(),
  );

  useEffect(() => {
    const tick = () => setRemaining(new Date(endsAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const urgent = remaining > 0 && remaining < 120_000;
  return (
    <span
      className={`tabular-nums ${urgent ? "text-accent font-bold" : ""} ${className ?? ""}`}
    >
      {remaining > 0 ? `⏱️ ${formatTimeLeft(remaining)}` : "Finalizada"}
    </span>
  );
}
