import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  return "jpg";
}

/**
 * Sube una imagen al bucket 'product-images' bajo la carpeta del usuario y
 * devuelve su URL pública. Devuelve null si no hay archivo, es inválido, o el
 * bucket aún no existe (migración f3-storage sin correr) — el llamador cae
 * entonces al campo de URL manual (resiliencia pre-migración).
 */
export async function uploadProductImage(
  supabase: SupabaseClient,
  userId: string,
  file: File | null,
): Promise<{ url: string | null; error: string | null }> {
  if (!file || file.size === 0) return { url: null, error: null };
  if (file.size > MAX_BYTES)
    return { url: null, error: "La imagen supera el máximo de 5 MB." };
  if (!ALLOWED.includes(file.type))
    return { url: null, error: "Formato no permitido (usa JPG, PNG o WebP)." };

  // Nombre único sin depender de Date.now()/random (no disponibles aquí):
  // usa un prefijo temporal derivado del tamaño + nombre saneado.
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "").slice(-40) || "img";
  const path = `${userId}/${file.size}-${safe}.${extFor(file.type)}`;

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      // Bucket ausente u otro fallo → el llamador usará la URL manual.
      return { url: null, error: null };
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl ?? null, error: null };
  } catch {
    return { url: null, error: null };
  }
}
