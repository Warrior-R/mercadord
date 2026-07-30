"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { validateProductInput } from "@/lib/product-validation";
import { uploadProductImage } from "@/lib/storage";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=/vender&message=${encodeURIComponent("Inicia sesión para publicar un producto.")}`,
    );
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(formData.get("price"));
  const oldRaw = Number(formData.get("old_price"));
  const old_price = Number.isFinite(oldRaw) && oldRaw > 0 ? oldRaw : null;
  const category = String(formData.get("category") ?? "");
  const condition = String(formData.get("condition") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const urlText = String(formData.get("image_url") ?? "").trim() || null;
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;

  // Un archivo subido tiene prioridad sobre la URL manual; si el bucket no
  // existe (migración f3 sin correr), uploaded es null y se usa la URL.
  const file = formData.get("image_file");
  const uploaded = await uploadProductImage(
    supabase,
    user.id,
    file instanceof File ? file : null,
  );
  if (uploaded.error) {
    redirect(`/vender?error=${encodeURIComponent(uploaded.error)}`);
  }
  const image_url = uploaded.url ?? urlText;

  const errors = validateProductInput({
    title,
    price,
    category,
    condition,
    image_url,
    whatsapp,
  });
  if (errors.length) {
    redirect(`/vender?error=${encodeURIComponent(errors.join(" "))}`);
  }

  const seller_name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Vendedor";

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    title,
    description,
    price,
    old_price,
    category,
    condition,
    location,
    image_url,
    seller_name,
  };
  // Solo se incluye si se llenó, para no fallar antes de la migración F2.
  if (whatsapp) insertData.whatsapp = whatsapp;

  const { data, error } = await supabase
    .from("products")
    .insert(insertData)
    .select("id,title")
    .single();

  if (error || !data) {
    redirect(
      `/vender?error=${encodeURIComponent(error?.message ?? "No se pudo publicar el producto.")}`,
    );
  }

  revalidatePath("/");
  redirect(`/producto/${slugify(data.title)}-${data.id}`);
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/entrar?next=/cuenta`);
  if (!id) redirect(`/cuenta`);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(formData.get("price"));
  const oldRaw = Number(formData.get("old_price"));
  const old_price = Number.isFinite(oldRaw) && oldRaw > 0 ? oldRaw : null;
  const category = String(formData.get("category") ?? "");
  const condition = String(formData.get("condition") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const urlText = String(formData.get("image_url") ?? "").trim() || null;
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;

  const file = formData.get("image_file");
  const uploaded = await uploadProductImage(
    supabase,
    user.id,
    file instanceof File ? file : null,
  );
  if (uploaded.error) {
    redirect(`/producto/${id}/editar?error=${encodeURIComponent(uploaded.error)}`);
  }
  const image_url = uploaded.url ?? urlText;

  const errors = validateProductInput({
    title,
    price,
    category,
    condition,
    image_url,
    whatsapp,
  });
  if (errors.length) {
    redirect(`/producto/${id}/editar?error=${encodeURIComponent(errors.join(" "))}`);
  }

  const patch: Record<string, unknown> = {
    title,
    description,
    price,
    old_price,
    category,
    condition,
    location,
    image_url,
  };
  if (whatsapp) patch.whatsapp = whatsapp;

  // La RLS ("editar propios") garantiza que solo el dueño puede actualizar.
  const { error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/producto/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/cuenta");
  redirect(`/producto/${slugify(title)}-${id}`);
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/entrar?next=/cuenta`);
  if (!id) redirect(`/cuenta`);

  // RLS ("eliminar propios") limita el borrado al dueño.
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) redirect(`/cuenta?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/cuenta");
  redirect(`/cuenta?m=deleted`);
}
