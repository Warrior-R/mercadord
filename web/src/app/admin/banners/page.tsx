import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/moderation";
import { listAllBanners } from "@/lib/banners";
import {
  createBanner,
  toggleBanner,
  deleteBanner,
} from "@/lib/banner-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Banners",
  robots: { index: false, follow: false },
};

const inputClass =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light";

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  if (!(await isAdmin())) {
    redirect("/entrar?next=/admin/banners");
  }

  const banners = await listAllBanners();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Banners de publicidad</h1>
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← Panel
        </Link>
      </div>

      {m === "ok" && (
        <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Guardado.
        </p>
      )}
      {m === "deleted" && (
        <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Banner eliminado.
        </p>
      )}
      {m === "invalid" && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Revisa las URLs (deben empezar por http/https).
        </p>
      )}
      {m === "error" && (
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Ocurrió un error.
        </p>
      )}

      <section className="mt-6 rounded-xl border border-line bg-tile p-4">
        <h2 className="text-sm font-semibold text-ink">Nuevo banner</h2>
        <form action={createBanner} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">Slot</span>
            <select name="slot" defaultValue="top" className={inputClass}>
              <option value="top">Arriba (top)</option>
              <option value="footer">Pie (footer)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">Orden</span>
            <input type="number" name="sort" defaultValue={0} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-soft">Título (opcional)</span>
            <input type="text" name="title" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-soft">URL de imagen (https)</span>
            <input type="url" name="image_url" required placeholder="https://…" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-soft">URL de destino (https)</span>
            <input type="url" name="link_url" required placeholder="https://…" className={inputClass} />
          </label>
          <button
            type="submit"
            className="justify-self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light sm:col-span-2"
          >
            Crear banner
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-ink">
          Banners ({banners.length})
        </h2>
        {banners.length === 0 ? (
          <p className="text-sm text-ink-soft">Todavía no hay banners.</p>
        ) : (
          <ul className="space-y-3">
            {banners.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image_url}
                  alt={b.title ?? "Banner"}
                  className="h-12 w-24 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {b.title ?? "(sin título)"}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {b.slot} · orden {b.sort} ·{" "}
                    {b.active ? "activo" : "inactivo"}
                  </p>
                </div>
                <form action={toggleBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="active" value={b.active ? "0" : "1"} />
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-primary hover:text-primary"
                  >
                    {b.active ? "Desactivar" : "Activar"}
                  </button>
                </form>
                <form action={deleteBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-accent px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
                  >
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
