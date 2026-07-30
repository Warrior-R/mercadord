import type { NextConfig } from "next";

// Cabeceras de seguridad (trasladadas del vercel.json del sitio estático y
// adaptadas a la app Next: connect-src incluye el WebSocket de Supabase
// Realtime que usan las subastas en vivo).
// En desarrollo, el HMR de Next usa eval y un WebSocket a localhost → se relaja
// solo en dev; en producción la CSP queda estricta.
const isDev = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  // Next inyecta scripts de arranque/hidratación inline → requiere 'unsafe-inline'.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Vendedores pegan URLs de imagen de cualquier host https (como el sitio actual).
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // REST + Realtime (wss) de Supabase (+ WebSocket de HMR en dev).
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Permite popups (login con Google) manteniendo el aislamiento de origen.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      // Imágenes almacenadas en Supabase Storage del proyecto.
      {
        protocol: "https",
        hostname: "flsixfuzvbapwnfepmwr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Placeholders usados por el seed de desarrollo.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Imágenes de producto pegadas por vendedores (cualquier host https,
      // como el img-src https: del sitio actual). TODO: subir a Storage.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
