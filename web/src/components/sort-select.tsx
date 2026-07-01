"use client";

import { useRouter } from "next/navigation";
import { SORTS } from "@/lib/filters";

/**
 * Selector de orden. Recibe el query actual SIN el parámetro sort (`query`)
 * y navega preservando los demás filtros. No usa useSearchParams (evita
 * requerir Suspense).
 */
export function SortSelect({ value, query }: { value: string; query: string }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="whitespace-nowrap text-neutral-500">Ordenar:</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(query);
          if (e.target.value !== "recent") params.set("sort", e.target.value);
          const qs = params.toString();
          router.push(qs ? `/buscar?${qs}` : "/buscar");
        }}
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-neutral-700 dark:bg-neutral-900"
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
