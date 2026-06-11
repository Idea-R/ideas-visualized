import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SupportDev } from "@/components/SupportDev";

export const metadata: Metadata = {
  title: "Ideas Visualized",
  description:
    "A gallery of hand-rolled, music-synced visual effects built from scratch with Canvas 2D, Web Audio, and WebGL.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/70 backdrop-blur-md">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Ideas <span className="glow-text">Visualized</span>
            </Link>
            <div className="flex items-center gap-5 text-sm text-muted">
              <Link href="/gallery" className="hover:text-fg">
                Gallery
              </Link>
              <Link href="/experiences" className="hover:text-fg">
                Experiences
              </Link>
              <Link href="/research" className="hover:text-fg">
                Research
              </Link>
            </div>
          </nav>
        </header>
        {children}
        <SiteFooter />
        <SupportDev />
      </body>
    </html>
  );
}
