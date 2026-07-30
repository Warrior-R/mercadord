export const DEFAULT_PAGE_SIZE = 24;

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Normaliza el parámetro `page` de la URL a un entero >= 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/** Rango [from, to] inclusivo para `.range()` de Supabase (0-indexado). */
export function rangeFor(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): { from: number; to: number } {
  const p = Math.max(1, Math.floor(page));
  const size = Math.max(1, Math.floor(pageSize));
  const from = (p - 1) * size;
  return { from, to: from + size - 1 };
}

/** Nº total de páginas (mínimo 1, aunque no haya resultados). */
export function totalPages(
  total: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): number {
  const size = Math.max(1, Math.floor(pageSize));
  return Math.max(1, Math.ceil(Math.max(0, total) / size));
}

/** Construye el href de una página preservando los query params actuales. */
export function pageHref(
  basePath: string,
  params: Record<string, string | number | undefined>,
  page: number,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
  }
  if (page > 1) qs.set("page", String(page));
  else qs.delete("page");
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
