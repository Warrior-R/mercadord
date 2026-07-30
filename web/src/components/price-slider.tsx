"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browseHref, type BrowseParams } from "@/lib/browse-url";
import { formatPrice } from "@/lib/format";

export const PRICE_MIN = 500;
export const PRICE_MAX = 200_000;

/**
 * Filtro de precio máximo. Al soltar el control navega con `max` en la URL;
 * en el tope (200K) se elimina el filtro ("sin límite").
 */
export function PriceSlider({
  basePath,
  params,
  value,
}: {
  basePath: string;
  params: BrowseParams;
  value?: number;
}) {
  const router = useRouter();
  const [local, setLocal] = useState(value ?? PRICE_MAX);

  const commit = (v: number) => {
    router.push(
      browseHref(basePath, params, {
        max: v >= PRICE_MAX ? undefined : String(v),
      }),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">
        Máximo:{" "}
        <strong className="text-ink">
          {local >= PRICE_MAX ? `${formatPrice(PRICE_MAX)}+` : formatPrice(local)}
        </strong>
      </p>
      <input
        type="range"
        min={PRICE_MIN}
        max={PRICE_MAX}
        step={500}
        value={local}
        aria-label="Precio máximo"
        onChange={(e) => setLocal(Number(e.target.value))}
        onMouseUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-ink-soft">
        <span>{formatPrice(PRICE_MIN)}</span>
        <span>{formatPrice(PRICE_MAX)}+</span>
      </div>
    </div>
  );
}
