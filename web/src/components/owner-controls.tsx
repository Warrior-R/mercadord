import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteProduct } from "@/lib/product-actions";
import type { Product } from "@/lib/types";

/** Editar / eliminar: visible solo para el dueño del anuncio. */
export async function OwnerControls({
  product,
  slug,
}: {
  product: Product;
  slug: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== product.user_id) return null;

  return (
    <section
      aria-label="Gestionar anuncio"
      className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-tile p-3"
    >
      <span className="text-xs font-medium text-ink-soft">Tu anuncio:</span>
      <Link
        href={`/producto/${slug}/editar`}
        className="rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
      >
        Editar
      </Link>
      <form action={deleteProduct}>
        <input type="hidden" name="id" value={product.id} />
        <button
          type="submit"
          className="rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white"
        >
          Eliminar
        </button>
      </form>
    </section>
  );
}
