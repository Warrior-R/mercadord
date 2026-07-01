import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatPrice, productHref } from "@/lib/format";
import { categoryByKey } from "@/lib/categories";

export function ProductCard({ product }: { product: Product }) {
  const cat = categoryByKey(product.category);

  return (
    <Link
      href={productHref(product)}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">
            {cat?.icon ?? "📦"}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {product.title}
        </h3>
        <p className="mt-auto text-lg font-bold text-neutral-900 dark:text-neutral-50">
          {formatPrice(product.price)}
        </p>
        {product.location && (
          <p className="text-xs text-neutral-500">{product.location}</p>
        )}
      </div>
    </Link>
  );
}
