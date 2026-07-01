import { ImageResponse } from "next/og";
import { getProductById } from "@/lib/products";
import { idFromSlug, formatPrice } from "@/lib/format";

export const alt = "Anuncio en MercadoRD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen OG dinámica por producto (título + precio) para compartir en redes. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  let title = "Anuncio en MercadoRD";
  let price: string | null = null;
  let location: string | null = null;

  if (id) {
    try {
      const product = await getProductById(id);
      if (product) {
        title = product.title;
        price = formatPrice(product.price);
        location = product.location ?? null;
      }
    } catch {
      // Sin datos → cae a la marca genérica.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#003087" }}>
          Mercado<span style={{ color: "#f5a623" }}>RD</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#1a1a2e",
              lineHeight: 1.1,
              maxWidth: 1000,
            }}
          >
            {title.length > 90 ? title.slice(0, 87) + "…" : title}
          </div>
          {price && (
            <div style={{ fontSize: 56, fontWeight: 800, color: "#e43e2b" }}>
              {price}
            </div>
          )}
          {location && (
            <div style={{ fontSize: 32, color: "#555555" }}>📍 {location}</div>
          )}
        </div>

        <div style={{ fontSize: 28, color: "#555555" }}>
          Contacta al vendedor en MercadoRD
        </div>
      </div>
    ),
    { ...size },
  );
}
