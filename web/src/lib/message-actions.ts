"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const backTo = slug ? `/producto/${slug}` : "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=${encodeURIComponent(backTo)}&message=${encodeURIComponent("Inicia sesión para contactar al vendedor.")}`,
    );
  }

  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 1) redirect(`${backTo}?msg=empty`);

  // El destinatario (vendedor) se resuelve en el servidor, no se confía en el cliente.
  const { data: prod } = await supabase
    .from("products")
    .select("user_id,title")
    .eq("id", productId)
    .maybeSingle();

  if (!prod?.user_id) redirect(`${backTo}?msg=error`);
  if (prod.user_id === user.id) redirect(`${backTo}?msg=self`);

  const { error } = await supabase.from("messages").insert({
    product_id: productId,
    product_title: prod.title,
    sender_id: user.id,
    recipient_id: prod.user_id,
    body: body.slice(0, 2000),
  });

  if (error) redirect(`${backTo}?msg=error`);

  revalidatePath("/mensajes");
  redirect(`${backTo}?msg=sent`);
}
