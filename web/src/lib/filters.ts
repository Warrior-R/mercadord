/** Condiciones — el valor es la clave guardada en products.condition (ver js/app.js). */
export const CONDITIONS = [
  { value: "new", label: "Nuevo" },
  { value: "used", label: "Usado" },
  { value: "refurb", label: "Reacondicionado" },
] as const;

export function conditionLabel(key: string | null | undefined): string {
  return CONDITIONS.find((c) => c.value === key)?.label ?? key ?? "";
}

export const SORTS = [
  { value: "recent", label: "Publicación más nueva" },
  { value: "oldest", label: "Publicación más antigua" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
] as const;

export type SortKey = (typeof SORTS)[number]["value"];

export type SearchFilters = {
  q?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  sort: SortKey;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Normaliza los searchParams de la URL a filtros validados. */
export function parseFilters(sp: RawParams): SearchFilters {
  const q = first(sp.q)?.trim() || undefined;
  const category = first(sp.cat)?.trim() || undefined;

  const condRaw = first(sp.cond);
  const condition = CONDITIONS.some((c) => c.value === condRaw)
    ? condRaw
    : undefined;

  const minRaw = Number(first(sp.min));
  const maxRaw = Number(first(sp.max));
  const minPrice = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : undefined;
  const maxPrice = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : undefined;

  const location = first(sp.loc)?.trim() || undefined;

  const sortRaw = first(sp.sort);
  const sort: SortKey = SORTS.some((s) => s.value === sortRaw)
    ? (sortRaw as SortKey)
    : "recent";

  return { q, category, condition, minPrice, maxPrice, location, sort };
}

/** ¿Hay al menos un filtro activo (además del orden)? */
export function hasActiveFilters(f: SearchFilters): boolean {
  return Boolean(
    f.q || f.category || f.condition || f.minPrice || f.maxPrice || f.location,
  );
}
