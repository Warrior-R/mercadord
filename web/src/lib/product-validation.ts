import { CATEGORIES } from "@/lib/categories";
import { CONDITIONS } from "@/lib/filters";

/** Valida la entrada del formulario de publicación. Puro → testeable. */
export function validateProductInput(input: {
  title: string;
  price: number;
  category: string;
  condition: string;
  image_url: string | null;
}): string[] {
  const errors: string[] = [];
  if (input.title.trim().length < 3) errors.push("El título es muy corto.");
  if (!Number.isFinite(input.price) || input.price <= 0)
    errors.push("El precio debe ser mayor que 0.");
  if (!CATEGORIES.some((c) => c.key === input.category))
    errors.push("Selecciona una categoría válida.");
  if (!CONDITIONS.some((c) => c.value === input.condition))
    errors.push("Selecciona una condición válida.");
  if (input.image_url && !/^https:\/\//i.test(input.image_url))
    errors.push("La imagen debe ser una URL https.");
  return errors;
}
