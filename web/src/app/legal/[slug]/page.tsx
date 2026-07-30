import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, legalBySlug } from "@/lib/legal";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const doc = legalBySlug(slug);
  if (!doc) return { title: "Página no encontrada" };
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `/legal/${doc.slug}` },
  };
}

export default async function LegalPage({ params }: Params) {
  const { slug } = await params;
  const doc = legalBySlug(slug);
  if (!doc) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <article>
        <h1 className="text-2xl font-bold text-ink">{doc.title}</h1>
        <div className="mt-4 flex flex-col gap-4 text-[15px] leading-relaxed text-ink-soft">
          {doc.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
