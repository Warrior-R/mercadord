/** Parámetros de exploración que viajan en la URL de la portada. */
export type BrowseParams = Record<string, string | undefined>;

/**
 * Construye una URL de exploración fusionando los parámetros actuales con los
 * cambios pedidos. Un cambio con valor `undefined` ELIMINA ese parámetro
 * (p. ej. "Todas las categorías" quita `cat`). Al cambiar de filtro se vuelve
 * siempre a la página 1.
 */
export function browseHref(
  basePath: string,
  current: BrowseParams,
  changes: BrowseParams = {},
): string {
  const merged: BrowseParams = { ...current, ...changes, page: undefined };
  const qs = new URLSearchParams();
  for (const key of Object.keys(merged).sort()) {
    const v = merged[key];
    if (v !== undefined && v !== null && v !== "") qs.set(key, String(v));
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
