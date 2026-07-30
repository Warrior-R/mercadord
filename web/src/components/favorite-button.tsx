import { toggleFavorite } from "@/lib/favorite-actions";

/**
 * Botón de favorito (corazón). Es un <form> nativo con Server Action, así que
 * NO puede vivir dentro del <Link> de la tarjeta: se superpone en un contenedor
 * relativo. `variant="overlay"` para tarjetas, `"inline"` para la vista detalle.
 */
export function FavoriteButton({
  productId,
  backTo,
  favorited,
  variant = "overlay",
}: {
  productId: string;
  backTo: string;
  favorited: boolean;
  variant?: "overlay" | "inline";
}) {
  const label = favorited ? "Quitar de favoritos" : "Guardar en favoritos";

  if (variant === "inline") {
    return (
      <form action={toggleFavorite} className="mt-3">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="back_to" value={backTo} />
        <input type="hidden" name="is_fav" value={favorited ? "1" : "0"} />
        <button
          type="submit"
          aria-pressed={favorited}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          <span aria-hidden>{favorited ? "♥" : "♡"}</span> {label}
        </button>
      </form>
    );
  }

  return (
    <form
      action={toggleFavorite}
      className="absolute right-2 top-2 z-10"
    >
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="back_to" value={backTo} />
      <input type="hidden" name="is_fav" value={favorited ? "1" : "0"} />
      <button
        type="submit"
        aria-label={label}
        aria-pressed={favorited}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow transition hover:scale-110"
      >
        <span aria-hidden className={favorited ? "text-accent" : "text-ink-soft"}>
          {favorited ? "♥" : "♡"}
        </span>
      </button>
    </form>
  );
}
