import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { CategoryBar } from "@/components/category-bar";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MercadoRD — Compra y vende en República Dominicana",
    template: "%s · MercadoRD",
  },
  description:
    "MercadoRD, el marketplace nacional de República Dominicana: compra, vende y subasta de forma segura.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <CategoryBar />
        <main id="contenido" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
