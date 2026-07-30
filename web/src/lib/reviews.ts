import { createClient } from "@/lib/supabase/server";

export type SellerReview = {
  id: string;
  seller_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};

export type SellerReputation = {
  avg_rating: number;
  review_count: number;
};

/**
 * Reputación agregada de un vendedor. Tolera que la vista/tabla aún no exista
 * (migración F2 reseñas sin correr): devuelve null y la UI no muestra nada.
 */
export async function getSellerReputation(
  sellerId: string,
): Promise<SellerReputation | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("seller_reputation")
      .select("avg_rating,review_count")
      .eq("seller_id", sellerId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      avg_rating: Number(data.avg_rating) || 0,
      review_count: Number(data.review_count) || 0,
    };
  } catch {
    return null;
  }
}

/** Reseñas de un vendedor, más recientes primero. Tolerante a tabla ausente. */
export async function listSellerReviews(
  sellerId: string,
  limit = 20,
): Promise<SellerReview[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("seller_reviews")
      .select("id,seller_id,reviewer_id,rating,comment,created_at")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as SellerReview[];
  } catch {
    return [];
  }
}

/** Reseña que el usuario actual ya dejó a un vendedor (para editar en vez de duplicar). */
export async function getMyReviewForSeller(
  sellerId: string,
  reviewerId: string,
): Promise<SellerReview | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("seller_reviews")
      .select("id,seller_id,reviewer_id,rating,comment,created_at")
      .eq("seller_id", sellerId)
      .eq("reviewer_id", reviewerId)
      .maybeSingle();
    if (error || !data) return null;
    return data as SellerReview;
  } catch {
    return null;
  }
}
