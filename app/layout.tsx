import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SupportDev } from "@/components/SupportDev";
import { SupportTrigger } from "@/components/SupportTrigger";

const REPO_URL = "https://github.com/Idea-R/ideas-visualized";

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

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
            <div className="flex items-center gap-4 text-sm text-muted sm:gap-5">
              <Link href="/gallery" className="hover:text-fg">
                Gallery
              </Link>
              <Link href="/game-assets" className="hidden hover:text-fg sm:inline">
                Game Assets
              </Link>
              <Link href="/experiences" className="hidden hover:text-fg md:inline">
                Experiences
              </Link>
              <Link href="/research" className="hidden hover:text-fg md:inline">
                Research
              </Link>
              <span className="hidden h-4 w-px bg-white/10 sm:inline-block" />
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Star on GitHub"
                className="inline-flex items-center gap-1.5 text-muted transition hover:text-fg"
              >
                <GitHubIcon className="h-4 w-4" />
                <span aria-hidden className="text-amber-300">
                  ★
                </span>
              </a>
              <SupportTrigger compact />
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
