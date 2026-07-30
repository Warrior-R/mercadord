/** Pestañas de exploración de la portada. */
export const BROWSE_TABS = [
  { key: "destacados", label: "Destacados" },
  { key: "nuevos", label: "Más nuevos" },
  { key: "ofertas", label: "Ofertas del día" },
  { key: "cerca", label: "Cerca de mí" },
] as const;

export type BrowseTabKey = (typeof BROWSE_TABS)[number]["key"];

/** Normaliza el parámetro `tab` de la URL. Por defecto: destacados. */
export function parseTab(value: string | string[] | undefined): BrowseTabKey {
  const raw = Array.isArray(value) ? value[0] : value;
  return BROWSE_TABS.some((t) => t.key === raw)
    ? (raw as BrowseTabKey)
    : "destacados";
}

/** ¿La pestaña filtra solo anuncios con descuento? */
export function tabWantsDeals(tab: BrowseTabKey): boolean {
  return tab === "ofertas";
}

/** ¿La pestaña requiere que el usuario elija una provincia? */
export function tabWantsLocation(tab: BrowseTabKey): boolean {
  return tab === "cerca";
}
