import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

/** Mosaico de accesos a categorías (portada). Da estructura aunque no haya datos. */
export function CategoryTiles() {
  return (
    <section aria-label="Explorar por categoría" className="mb-8">
      <h2 className="mb-4 text-base font-bold text-ink">Explora por categoría</h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <li>
          <Link
            href="/subastas"
            className="flex flex-col items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-4 text-center transition hover:-translate-y-0.5 hover:border-accent hover:shadow"
          >
            <span aria-hidden className="text-3xl">
              🔨
            </span>
            <span className="text-xs font-semibold text-accent">Subastas</span>
          </Link>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/categoria/${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow"
            >
              <span aria-hidden className="text-3xl">
                {c.icon}
              </span>
              <span className="text-xs font-medium text-ink">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
