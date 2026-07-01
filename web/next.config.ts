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
    ],
  },
};

export default nextConfig;
