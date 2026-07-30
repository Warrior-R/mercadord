import type { Metadata } from "next";
import Link from "next/link";
import { listActiveAuctions } from "@/lib/auctions";
import { AuctionCard } from "@/components/auction-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Subastas en vivo",
  description:
    "Subastas en tiempo real en MercadoRD: puja por autos, tecnología y más en República Dominicana.",
  alternates: { canonical: "/subastas" },
};

export default async function SubastasPage() {
  const auctions = await listActiveAuctions();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Subastas en vivo
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Puja en tiempo real. El que va ganando cuando el reloj llega a cero
            se lleva el artículo.
          </p>
        </div>
        <Link
          href="/subastas/crear"
          className="rounded-lg bg-accent2 px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-105"
        >
          + Crear subasta
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-semibold text-ink">
            No hay subastas activas ahora mismo
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Ejecuta <code>supabase/auctions.sql</code> para poblar subastas de
            demostración, o crea la tuya.
          </p>
          <Link
            href="/subastas/crear"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
          >
            Crear una subasta
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {auctions.map((a) => (
            <li key={a.id}>
              <AuctionCard auction={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
