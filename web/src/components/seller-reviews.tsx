import { createClient } from "@/lib/supabase/server";
import { submitReview } from "@/lib/review-actions";
import {
  getSellerReputation,
  listSellerReviews,
  getMyReviewForSeller,
} from "@/lib/reviews";
import type { Product } from "@/lib/types";

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span aria-label={`${value} de 5 estrellas`} className="text-accent2">
      {"★★★★★".slice(0, full)}
      <span className="text-line">{"★★★★★".slice(full)}</span>
    </span>
  );
}

export async function SellerReviews({
  product,
  slug,
  status,
}: {
  product: Product;
  slug: string;
  status?: string;
}) {
  const sellerId = product.user_id;
  if (!sellerId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user && user.id === sellerId;

  const [reputation, reviews, myReview] = await Promise.all([
    getSellerReputation(sellerId),
    listSellerReviews(sellerId),
    user && !isOwner ? getMyReviewForSeller(sellerId, user.id) : Promise.resolve(null),
  ]);

  return (
    <section
      aria-label="Reseñas del vendedor"
      className="mt-6 rounded-xl border border-line bg-tile p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Reputación del vendedor</h2>
        {reputation && reputation.review_count > 0 ? (
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Stars value={reputation.avg_rating} />
            <strong className="text-ink">{reputation.avg_rating.toFixed(1)}</strong>
            <span>({reputation.review_count})</span>
          </span>
        ) : (
          <span className="text-sm text-ink-soft">Sin reseñas todavía</span>
        )}
      </div>

      {status === "ok" && (
        <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          ¡Gracias! Tu reseña fue publicada.
        </p>
      )}
      {status === "self" && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          No puedes reseñar tus propios anuncios.
        </p>
      )}
      {status === "invalid" && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Elige una calificación de 1 a 5 estrellas.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          No se pudo guardar la reseña. Inténtalo de nuevo.
        </p>
      )}

      {reviews.length > 0 && (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-line bg-white p-3">
              <Stars value={r.rating} />
              {r.comment && (
                <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isOwner && (
        <form action={submitReview} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="slug" value={slug} />
          <label className="text-xs font-medium text-ink-soft" htmlFor="rev-rating">
            {myReview ? "Editar tu reseña" : "Deja una reseña"}
          </label>
          <select
            id="rev-rating"
            name="rating"
            required
            defaultValue={myReview?.rating ?? ""}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
          >
            <option value="" disabled>
              Calificación…
            </option>
            <option value="5">★★★★★ Excelente</option>
            <option value="4">★★★★ Bueno</option>
            <option value="3">★★★ Regular</option>
            <option value="2">★★ Malo</option>
            <option value="1">★ Pésimo</option>
          </select>
          <textarea
            name="comment"
            rows={2}
            maxLength={1000}
            defaultValue={myReview?.comment ?? ""}
            placeholder="¿Cómo fue tu trato con este vendedor? (opcional)"
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
          >
            {user
              ? myReview
                ? "Actualizar reseña"
                : "Publicar reseña"
              : "Inicia sesión para reseñar"}
          </button>
        </form>
      )}
    </section>
  );
}
