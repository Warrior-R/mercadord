import { createClient } from "@/lib/supabase/server";

export type Message = {
  id: string;
  product_id: string | null;
  product_title: string | null;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string;
};

const COLUMNS =
  "id,product_id,product_title,sender_id,recipient_id,body,read,created_at";

/** Todos mis mensajes (enviados y recibidos). RLS los acota a los míos. */
export async function listMyMessages(): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}
