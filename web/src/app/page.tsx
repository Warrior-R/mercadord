import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getStatus() {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    if (error) return { ok: false, detail: error.message };
    return { ok: true, count: count ?? 0 };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "error desconocido",
    };
  }
}

export default async function Home() {
  const status = await getStatus();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          MarketplaceDR · Fase 1
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Migración a Next.js
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Scaffold Next.js 16 + TypeScript + Tailwind v4, conectado al backend
          Supabase existente vía SSR. El catálogo con rutas reales llega a
          continuación.
        </p>
      </div>

      <div
        className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
        data-testid="supabase-status"
      >
        <h2 className="text-sm font-semibold text-neutral-500">
          Estado de conexión (SSR → Supabase)
        </h2>
        {status.ok ? (
          <p className="mt-1 text-lg">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-green-500 align-middle" />
            Conectado · <strong>{status.count}</strong> productos en la base de
            datos
          </p>
        ) : (
          <p className="mt-1 text-lg">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-500 align-middle" />
            Sin lectura de <code>products</code>:{" "}
            <span className="text-neutral-500">{status.detail}</span>
          </p>
        )}
      </div>
    </main>
  );
}
