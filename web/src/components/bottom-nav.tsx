"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/vender", label: "Vender" },
  { href: "/mensajes", label: "Mensajes" },
  { href: "/cuenta", label: "Cuenta" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white md:hidden"
    >
      {ITEMS.map((it) => {
        const active =
          it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex flex-1 items-center justify-center py-3 text-xs font-semibold transition focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary " +
              (active ? "text-primary" : "text-ink-soft")
            }
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
