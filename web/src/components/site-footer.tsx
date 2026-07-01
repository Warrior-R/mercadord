import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { LEGAL_DOCS } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-line bg-white">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-5 py-10 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-lg font-extrabold text-primary">
            Mercado<span className="text-accent2">RD</span>
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            El marketplace nacional de República Dominicana. Compra, vende y
            subasta de forma segura.
          </p>
        </div>

        <nav aria-label="Categorías (footer)">
          <h2 className="text-sm font-semibold text-ink">Categorías</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.slug}>
                <Link href={`/categoria/${c.slug}`} className="hover:text-primary">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="MercadoRD">
          <h2 className="text-sm font-semibold text-ink">MercadoRD</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
            <li>
              <Link href="/vender" className="hover:text-primary">
                Vender
              </Link>
            </li>
            <li>
              <Link href="/subastas" className="hover:text-primary">
                Subastas
              </Link>
            </li>
            {LEGAL_DOCS.map((d) => (
              <li key={d.slug}>
                <Link href={`/legal/${d.slug}`} className="hover:text-primary">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Cuenta">
          <h2 className="text-sm font-semibold text-ink">Cuenta</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
            <li>
              <Link href="/entrar" className="hover:text-primary">
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/registro" className="hover:text-primary">
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link href="/cuenta" className="hover:text-primary">
                Mi cuenta
              </Link>
            </li>
            <li>
              <Link href="/favoritos" className="hover:text-primary">
                Favoritos
              </Link>
            </li>
            <li>
              <Link href="/notificaciones" className="hover:text-primary">
                Notificaciones
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-[1280px] px-5 py-4 text-center text-xs text-ink-soft">
          © 2026 MercadoRD · República Dominicana
        </p>
      </div>
    </footer>
  );
}
