import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductById } from "@/lib/products";
import { updateProduct } from "@/lib/product-actions";
import { idFromSlug } from "@/lib/format";
import { ProductForm } from "@/components/product-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Editar anuncio",
  robots: { index: false },
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditarProductoPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const id = idFromSlug(slug);
  const product = id ? await getProductById(id) : null;
  if (!product) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?next=/producto/${slug}/editar`);
  }
  // Solo el dueño puede editar (además de la RLS, cortamos aquí por UX).
  if (product.user_id !== user.id) {
    redirect(`/producto/${slug}`);
  }

  // WhatsApp se lee aparte por resiliencia pre-migración.
  let whatsapp: string | null = null;
  try {
    const { data } = await supabase
      .from("products")
      .select("whatsapp")
      .eq("id", product.id)
      .maybeSingle();
    whatsapp = (data?.whatsapp as string | null | undefined) ?? null;
  } catch {
    whatsapp = null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">Editar anuncio</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Actualiza los datos de tu producto.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <ProductForm
        action={updateProduct}
        product={product}
        defaultWhatsapp={whatsapp}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
