import Link from "next/link";
import { pageHref } from "@/lib/pagination";

/**
 * Controles de paginación (Anterior / página X de N / Siguiente).
 * `params` son los query params a preservar (sin `page`). No se renderiza si
 * solo hay una página.
 */
export function Pagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: Record<string, string | number | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const linkClass =
    "rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-primary hover:text-primary";
  const disabledClass =
    "rounded-lg border border-line bg-tile px-4 py-2 text-sm font-medium text-ink-soft/50 cursor-not-allowed";

  return (
    <nav
      aria-label="Paginación"
      className="mt-8 flex items-center justify-center gap-3"
    >
      {hasPrev ? (
        <Link
          href={pageHref(basePath, params, page - 1)}
          rel="prev"
          className={linkClass}
        >
          ← Anterior
        </Link>
      ) : (
        <span aria-disabled className={disabledClass}>
          ← Anterior
        </span>
      )}

      <span className="text-sm text-ink-soft">
        Página <strong className="text-ink">{page}</strong> de {totalPages}
      </span>

      {hasNext ? (
        <Link
          href={pageHref(basePath, params, page + 1)}
          rel="next"
          className={linkClass}
        >
          Siguiente →
        </Link>
      ) : (
        <span aria-disabled className={disabledClass}>
          Siguiente →
        </span>
      )}
    </nav>
  );
}
