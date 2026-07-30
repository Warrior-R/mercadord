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

/** URL canónica de una subasta: /subasta/<slug-titulo>-<uuid>. */
export function auctionHref(auction: { id: string; title: string }): string {
  return `/subasta/${slugify(auction.title)}-${auction.id}`;
}

/** Deja solo dígitos de un teléfono. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D+/g, "");
}

/**
 * Construye el enlace de WhatsApp (wa.me) desde un teléfono dominicano.
 * Añade el código de país 1 si el número tiene 10 dígitos (809/829/849…).
 */
export function whatsappLink(phone: string, text?: string): string | null {
  let digits = phoneDigits(phone);
  if (digits.length === 10) digits = "1" + digits;
  if (digits.length < 11) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
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
