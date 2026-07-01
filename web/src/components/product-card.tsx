import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatPrice, productHref } from "@/lib/format";
import { categoryByKey } from "@/lib/categories";
import { FavoriteButton } from "@/components/favorite-button";

export function ProductCard({
  product,
  featured = false,
  favorited,
  backTo = "/",
}: {
  product: Product;
  featured?: boolean;
  /** Si se pasa (true/false) se muestra el corazón; si es undefined, no se muestra. */
  favorited?: boolean;
  backTo?: string;
}) {
  const cat = categoryByKey(product.category);
  const discount =
    product.old_price && product.old_price > product.price
      ? Math.round((1 - product.price / product.old_price) * 100)
      : null;

  return (
    <div className="relative">
      {favorited !== undefined && (
        <FavoriteButton
          productId={product.id}
          backTo={backTo}
          favorited={favorited}
        />
      )}
      <Link
        href={productHref(product)}
        className="group flex flex-col overflow-hidden rounded-[10px] border border-line bg-card transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,48,135,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
      >
      <div className="relative flex aspect-square items-center justify-center bg-tile">
        {featured && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-accent2 px-2 py-0.5 text-[10px] font-bold text-ink shadow">
            ⭐ Destacado
          </span>
        )}
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="text-5xl">{cat?.icon ?? "📦"}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
          {product.title}
        </h3>
        {product.seller_name && (
          <p className="mt-1 truncate text-[11px] text-ink-soft">
            {product.seller_name}
          </p>
        )}
        <div className="mt-auto flex items-baseline gap-1.5 pt-2">
          <span className="text-lg font-bold text-accent">
            {formatPrice(product.price)}
          </span>
          {discount !== null && (
            <span className="text-[11px] font-semibold text-brand-green">
              -{discount}%
            </span>
          )}
        </div>
        {product.location && (
          <p className="mt-1 text-[11px] text-ink-soft">📍 {product.location}</p>
        )}
      </div>
      </Link>
    </div>
  );
}
