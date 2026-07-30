import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/product-actions";
import { ProductForm } from "@/components/product-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Publicar producto",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ error?: string }> };

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

      <ProductForm action={createProduct} submitLabel="Publicar producto" />
    </div>
  );
}
