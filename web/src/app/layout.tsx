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
        <SiteHeader />
        <CategoryBar />
        <div className="flex-1 pb-16 md:pb-0">{children}</div>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
