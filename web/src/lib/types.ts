/** Fila de public.products (ver supabase/setup.sql). */
export type Product = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  category: string | null;
  condition: string | null;
  location: string | null;
  image_url: string | null;
  whatsapp: string | null;
  seller_name: string | null;
  rating: number | null;
  reviews: number | null;
  created_at: string | null;
};
