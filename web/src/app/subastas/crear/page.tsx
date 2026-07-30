import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAuction } from "@/lib/auction-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Crear subasta",
  robots: { index: false },
};

const inputClass =
  "rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light";

export default async function CrearSubastaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">Crear una subasta</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Define el precio inicial y la duración. Quien vaya ganando al cerrar el
        reloj se lleva el artículo y te contacta para coordinar.
      </p>

      {!user && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Necesitas una sesión para crear una subasta.{" "}
          <Link
            href="/entrar?next=/subastas/crear"
            className="font-semibold underline"
          >
            Inicia sesión
          </Link>
          .
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createAuction} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Título *</span>
          <input type="text" name="title" required minLength={3} className={inputClass} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Precio inicial (RD$) *</span>
            <input
              type="number"
              name="start_price"
              required
              min={1}
              step="0.01"
              inputMode="decimal"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Cómpralo ya (opcional)</span>
            <input
              type="number"
              name="buy_now_price"
              min={0}
              step="0.01"
              inputMode="decimal"
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Duración (horas) *</span>
            <input
              type="number"
              name="hours"
              required
              min={1}
              max={168}
              defaultValue={24}
              inputMode="numeric"
              className={inputClass}
            />
            <span className="text-xs text-ink-soft">Entre 1 y 168 (7 días).</span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Emoji / ícono</span>
            <input
              type="text"
              name="icon"
              maxLength={4}
              placeholder="📦"
              defaultValue="📦"
              className={inputClass}
            />
          </label>
        </div>

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
          <span className="font-medium text-ink">URL de imagen (https)</span>
          <input
            type="url"
            name="image_url"
            placeholder="https://…"
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
        >
          Publicar subasta
        </button>
      </form>
    </div>
  );
}
