import Link from "next/link";

/**
 * Estado vacío de la exploración. Si hay filtros activos invita a quitarlos;
 * si el catálogo está realmente vacío, invita a publicar el primer anuncio.
 */
export function BrowseEmptyState({
  basePath,
  hasFilters,
}: {
  basePath: string;
  hasFilters: boolean;
}) {
  if (hasFilters) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-12 text-center">
        <h2 className="text-lg font-bold text-ink">
          No encontramos anuncios con estos filtros
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Prueba a ampliar el precio máximo, cambiar la categoría o quitar la
          condición.
        </p>
        <Link
          href={basePath}
          className="mt-5 inline-block rounded-lg border border-primary px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
        >
          Quitar filtros
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-white p-12 text-center">
      <h2 className="text-lg font-bold text-ink">
        Sé de los primeros en vender en MercadoRD
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        Aún no hay anuncios publicados. Publica el tuyo{" "}
        <strong className="text-ink">gratis</strong> en minutos y llega a
        compradores de las 32 provincias.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/vender"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-dark"
        >
          Publicar anuncio gratis
        </Link>
        <Link
          href="/subastas"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light"
        >
          Ver subastas
        </Link>
      </div>
    </div>
  );
}
