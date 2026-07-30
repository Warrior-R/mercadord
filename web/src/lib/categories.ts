/**
 * Categorías del marketplace.
 * `key` = valor guardado en products.category (heredado del sitio actual).
 * `slug` = segmento limpio de URL para SEO.
 */
export type Category = {
  key: string;
  slug: string;
  name: string;
  icon: string;
};

export const CATEGORIES: Category[] = [
  { key: "electronics", slug: "electronica", name: "Electrónica", icon: "📱" },
  { key: "vehicles", slug: "vehiculos", name: "Vehículos", icon: "🚗" },
  { key: "fashion", slug: "moda", name: "Moda", icon: "👗" },
  { key: "home2", slug: "hogar", name: "Hogar", icon: "🏠" },
  { key: "sports", slug: "deportes", name: "Deportes", icon: "⚽" },
  { key: "services", slug: "servicios", name: "Servicios", icon: "🔧" },
  { key: "agro", slug: "agropecuario", name: "Agropecuario", icon: "🌿" },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryByKey(key: string | null | undefined): Category | undefined {
  if (!key) return undefined;
  return CATEGORIES.find((c) => c.key === key);
}
