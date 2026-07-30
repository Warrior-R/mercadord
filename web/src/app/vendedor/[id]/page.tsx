import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listProductsByUser } from "@/lib/products";
import { listMyFavoriteIds } from "@/lib/favorites";
import {
  getSellerReputation,
  listSellerReviews,
} from "@/lib/reviews";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span aria-label={`${value} de 5 estrellas`} className="text-accent2">
      {"★★★★★".slice(0, full)}
      <span className="text-line">{"★★★★★".slice(full)}</span>
    </span>
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Vendedor no encontrado" };
  const products = await listProductsByUser(id);
  const name = products[0]?.seller_name ?? "Vendedor";
  return {
    title: `${name} · Vendedor`,
    description: `Anuncios y reputación de ${name} en MercadoRD.`,
    robots: { index: false, follow: true },
  };
}

export default async function VendedorPage({ params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [products, reputation, reviews, favoriteIds] = await Promise.all([
    listProductsByUser(id),
    getSellerReputation(id),
    listSellerReviews(id),
    listMyFavoriteIds(),
  ]);

  const name = products[0]?.seller_name ?? "Vendedor";

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-5">
      <header className="rounded-xl border border-line bg-tile p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white"
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-bold text-ink">{name}</h1>
              <p className="text-sm text-ink-soft">
                {products.length} anuncio{products.length === 1 ? "" : "s"} activo
                {products.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {reputation && reputation.review_count > 0 ? (
            <span className="flex items-center gap-1.5 text-sm text-ink-soft">
              <Stars value={reputation.avg_rating} />
              <strong className="text-ink">
                {reputation.avg_rating.toFixed(1)}
              </strong>
              <span>({reputation.review_count})</span>
            </span>
          ) : (
            <span className="text-sm text-ink-soft">Sin reseñas todavía</span>
          )}
        </div>
      </header>

      {reviews.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-ink">Reseñas</h2>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-line bg-white p-3"
              >
                <Stars value={r.rating} />
                {r.comment && (
                  <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-ink">Anuncios de {name}</h2>
        {products.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Este vendedor no tiene anuncios activos.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  favorited={favoriteIds.has(p.id)}
                  backTo={`/vendedor/${id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
