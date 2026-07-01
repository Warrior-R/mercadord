import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/product-actions";
import { CATEGORIES } from "@/lib/categories";
import { CONDITIONS } from "@/lib/filters";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Publicar producto",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ error?: string }> };

const inputClass =
  "rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light";

export default async function VenderPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">Publicar un producto</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Completa los datos de tu artículo. Se publicará a tu nombre.
      </p>

      {!user && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Necesitas una sesión para publicar.{" "}
          <Link href="/entrar?next=/vender" className="font-semibold underline">
            Inicia sesión
          </Link>{" "}
          y vuelve aquí.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createProduct} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Título *</span>
          <input type="text" name="title" required minLength={3} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Descripción</span>
          <textarea name="description" rows={4} className={inputClass} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Precio (RD$) *</span>
            <input
              type="number"
              name="price"
              required
              min={1}
              step="0.01"
              inputMode="decimal"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Precio anterior (opcional)</span>
            <input
              type="number"
              name="old_price"
              min={0}
              step="0.01"
              inputMode="decimal"
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Categoría *</span>
            <select name="category" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Selecciona…
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Condición *</span>
            <select name="condition" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Selecciona…
              </option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Ubicación</span>
            <input
              type="text"
              name="location"
              placeholder="Provincia o ciudad"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">WhatsApp (opcional)</span>
            <input
              type="tel"
              name="whatsapp"
              inputMode="tel"
              placeholder="809 000 0000"
              className={inputClass}
            />
            <span className="text-xs text-ink-soft">
              Se mostrará un botón para contactarte por WhatsApp.
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">URL de imagen (https)</span>
          <input
            type="url"
            name="image_url"
            placeholder="https://…"
            className={inputClass}
          />
          <span className="text-xs text-ink-soft">
            Por ahora se pega una URL. La subida de imágenes llega pronto.
          </span>
        </label>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
        >
          Publicar producto
        </button>
      </form>
    </div>
  );
}
