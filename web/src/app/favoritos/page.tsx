import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyFavorites } from "@/lib/favorites";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mis favoritos",
  robots: { index: false },
};

export default async function FavoritosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=/favoritos&message=${encodeURIComponent("Inicia sesión para ver tus favoritos.")}`,
    );
  }

  const products = await listMyFavorites();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-5">
      <h1 className="text-2xl font-bold text-ink">Mis favoritos</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {products.length} anuncio{products.length === 1 ? "" : "s"} guardado
        {products.length === 1 ? "" : "s"}.
      </p>

      {products.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-dashed border-line bg-card p-10 text-center">
          <p className="text-4xl">🤍</p>
          <p className="mt-3 font-semibold text-ink">
            Todavía no has guardado nada
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Toca el corazón en cualquier anuncio para guardarlo aquí.
          </p>
          <Link
            href="/buscar"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
          >
            Explorar productos
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} favorited backTo="/favoritos" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
