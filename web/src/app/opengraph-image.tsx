import { ImageResponse } from "next/og";

export const alt = "MercadoRD — Compra y vende en República Dominicana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen OG por defecto del sitio (marca MercadoRD). */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #003087 0%, #0a4ab8 60%, #1565c0 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
          Mercado<span style={{ color: "#f5a623" }}>RD</span>
        </div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 12, opacity: 0.9 }}>
          Compra y vende en República Dominicana
        </div>
      </div>
    ),
    { ...size },
  );
}
