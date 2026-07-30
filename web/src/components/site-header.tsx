import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { HeaderTopBar } from "@/components/header-top-bar";

/** Cabecera estilo eBay: barra superior (eyebrow) + fila principal blanca con logo y buscador. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <HeaderTopBar />

      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:gap-6 sm:px-5">
        <Link
          href="/"
          className="shrink-0 text-2xl font-extrabold tracking-tight text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Mercado<span className="text-accent2">RD</span>
        </Link>

        <div className="min-w-0 flex-1">
          <SearchBar showCategory />
        </div>

        {/* Acceso a cuenta compacto en móvil (en escritorio está en la barra superior). */}
        <Link
          href="/cuenta"
          aria-label="Mi cuenta"
          className="shrink-0 text-2xl text-ink-soft transition hover:text-primary md:hidden"
        >
          👤
        </Link>
      </div>
    </header>
  );
}
