/** Validación pura de reseñas (separada de la Server Action, que solo exporta async). */
export function validateReviewInput(input: {
  rating: number;
  comment?: string | null;
}): string[] {
  const errors: string[] = [];
  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    errors.push("La calificación debe ser de 1 a 5 estrellas.");
  }
  if (input.comment && input.comment.length > 1000) {
    errors.push("El comentario no puede superar 1000 caracteres.");
  }
  return errors;
}
