import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
