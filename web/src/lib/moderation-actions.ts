"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["pendiente", "revisando", "resuelto", "descartado"];

/** Cambia el estado de un reporte. La RLS exige que el usuario sea admin. */
export async function setReportStatus(formData: FormData) {
  const id = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !VALID_STATUSES.includes(status)) {
    redirect("/admin/reportes?m=invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/admin/reportes");

  const patch: Record<string, unknown> = { status };
  if (status === "resuelto" || status === "descartado") {
    patch.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase.from("reports").update(patch).eq("id", id);
  if (error) redirect("/admin/reportes?m=error");

  revalidatePath("/admin/reportes");
  redirect("/admin/reportes?m=ok");
}

/** Retira un producto reportado (solo admin, vía RLS de products/borrado admin). */
export async function removeReportedProduct(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) redirect("/admin/reportes?m=invalid");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/admin/reportes");

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) redirect("/admin/reportes?m=error");

  revalidatePath("/admin/reportes");
  redirect("/admin/reportes?m=removed");
}
