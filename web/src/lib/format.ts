/** Genera un slug URL-safe a partir de un texto (sin acentos, min, con guiones). */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "producto"
  );
}

const UUID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Extrae el UUID del final de un slug tipo "titulo-del-producto-<uuid>". */
export function idFromSlug(slug: string): string | null {
  const match = slug.match(UUID_RE);
  return match ? match[1] : null;
}

/** URL canónica de un producto: /producto/<slug-titulo>-<uuid>. */
export function productHref(product: { id: string; title: string }): string {
  return `/producto/${slugify(product.title)}-${product.id}`;
}

const money = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});

/** Formatea un precio en pesos dominicanos (RD$). */
export function formatPrice(value: number): string {
  return money.format(value);
}
