import { isAdmin } from "@/lib/moderation";
import { isProductFeatured } from "@/lib/featured";
import { toggleFeatured } from "@/lib/featured-actions";
import type { Product } from "@/lib/types";

/** Control solo-admin para destacar/retirar un anuncio. Invisible para el resto. */
export async function AdminFeaturedToggle({
  product,
  slug,
  status,
}: {
  product: Product;
  slug: string;
  status?: string;
}) {
  if (!(await isAdmin())) return null;

  const featured = await isProductFeatured(product.id);

  return (
    <section
      aria-label="Herramientas de administración"
      className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Admin
      </p>
      {status === "ok" && (
        <p className="mt-2 text-sm text-green-700">Destacado actualizado.</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-red-700">No se pudo actualizar.</p>
      )}
      <form action={toggleFeatured} className="mt-2">
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="featured" value={featured ? "0" : "1"} />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-light"
        >
          {featured ? "★ Quitar de destacados" : "☆ Destacar este anuncio"}
        </button>
      </form>
    </section>
  );
}
