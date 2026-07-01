import { ProductGridSkeleton } from "@/components/product-grid-skeleton";

/** Carga percibida de la búsqueda (esta ruta no usa notFound, es seguro). */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-5 h-11 animate-pulse rounded-md bg-tile" />
      <div className="mb-4 h-5 w-40 animate-pulse rounded bg-tile" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
