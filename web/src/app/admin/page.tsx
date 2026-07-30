import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/moderation";
import { getAdminStats } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Panel admin",
  robots: { index: false, follow: false },
};

export default async function AdminHome() {
  if (!(await isAdmin())) {
    redirect("/entrar?next=/admin");
  }

  const stats = await getAdminStats();

  const cards = [
    { label: "Productos", value: stats.products, href: "/buscar" },
    {
      label: "Reportes pendientes",
      value: stats.reportsPending,
      href: "/admin/reportes",
      highlight: stats.reportsPending > 0,
    },
    { label: "Destacados", value: stats.featured, href: "/" },
    { label: "Banners", value: stats.banners, href: "/admin/banners" },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">Panel de administración</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Resumen y accesos rápidos de moderación y monetización.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow ${
              c.highlight
                ? "border-accent bg-accent/5"
                : "border-line bg-white"
            }`}
          >
            <p className="text-2xl font-bold text-ink">{c.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{c.label}</p>
          </Link>
        ))}
      </div>

      <nav className="mt-8 flex flex-col gap-2" aria-label="Secciones admin">
        <Link
          href="/admin/reportes"
          className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
        >
          Moderación de reportes
        </Link>
        <Link
          href="/admin/banners"
          className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
        >
          Banners de publicidad
        </Link>
      </nav>
    </div>
  );
}
