/** Esqueleto de una rejilla de productos (estado de carga percibido). */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-[10px] border border-line bg-card"
        >
          <div className="aspect-square animate-pulse bg-tile" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded bg-tile" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-tile" />
            <div className="mt-1 h-4 w-1/2 animate-pulse rounded bg-tile" />
          </div>
        </li>
      ))}
    </ul>
  );
}
