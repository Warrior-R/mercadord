import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProductsByUser } from "@/lib/products";
import { signOut } from "@/lib/auth-actions";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default async function CuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=/cuenta&message=${encodeURIComponent("Inicia sesión para ver tu cuenta.")}`,
    );
  }

  const name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    "Sin nombre";
  const myProducts = await listProductsByUser(user.id);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Mi cuenta</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {name} · {user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vender"
            className="rounded-lg bg-accent2 px-4 py-2 text-sm font-bold text-ink transition hover:brightness-105"
          >
            + Vender
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-tile"
            >
              Salir
            </button>
          </form>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-ink">
          Mis publicaciones ({myProducts.length})
        </h2>
        {myProducts.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line bg-card p-10 text-center">
            <p className="font-medium text-ink">Aún no has publicado nada</p>
            <p className="mt-1 text-sm text-ink-soft">
              Publica tu primer producto y aparecerá aquí.
            </p>
            <Link
              href="/vender"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
            >
              Publicar producto
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {myProducts.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
