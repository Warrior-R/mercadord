import { listActiveBanners } from "@/lib/banners";

/** Franja de banners de patrocinadores (slot 'top'). Nada si no hay activos. */
export async function BannerStrip({
  slot = "top",
}: {
  slot?: "top" | "footer";
}) {
  const banners = await listActiveBanners(slot);
  if (banners.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-3" aria-label="Publicidad">
      {banners.map((b) => (
        <a
          key={b.id}
          href={b.link_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block overflow-hidden rounded-xl border border-line"
        >
          {/* Banners externos de anunciantes: <img> simple (sin optimizar). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.image_url}
            alt={b.title ?? "Publicidad"}
            className="h-24 w-full object-cover sm:h-32"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
