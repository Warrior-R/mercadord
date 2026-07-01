"use client";

import { useRouter } from "next/navigation";
import { SORTS } from "@/lib/filters";

/**
 * Selector de orden. Recibe el query actual SIN el parámetro sort (`query`) y
 * navega a `basePath` preservando los demás filtros. No usa useSearchParams
 * (evita requerir Suspense).
 */
export function SortSelect({
  value,
  query,
  basePath = "/buscar",
}: {
  value: string;
  query: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="whitespace-nowrap text-ink-soft">Ordenar por:</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(query);
          if (e.target.value !== "recent") params.set("sort", e.target.value);
          else params.delete("sort");
          const qs = params.toString();
          router.push(qs ? `${basePath}?${qs}` : basePath);
        }}
        className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
