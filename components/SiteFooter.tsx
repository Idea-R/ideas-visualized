import Link from "next/link";

const SITE_URL = "https://ideas-realized.com";
const REPO_URL = "https://github.com/Idea-R/ideas-visualized";
const LINKEDIN_URL = "https://www.linkedin.com/in/ideasrealized";
const X_URL = "https://x.com/xentrilo";
const BMC_URL = "https://buymeacoffee.com/shanevz";

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.97 6.817H1.674l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  );
}

function CoffeeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M17 9h2.2a2.3 2.3 0 0 1 0 4.6H17" />
      <path d="M7 2.5c-.5.7-.5 1.3 0 2M11 2.5c-.5.7-.5 1.3 0 2" />
    </svg>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-white/10 bg-bg/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Ideas <span className="glow-text">Visualized</span>
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Hand-rolled visual effects, built from scratch with Canvas 2D, Web
            Audio, and WebGL. A project by{" "}
            <a
              href={SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-fg/80 underline-offset-2 hover:text-accent hover:underline"
            >
              Ideas Realized
            </a>
            .
          </p>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-xs text-muted transition hover:text-accent"
          >
            <GlobeIcon className="h-4 w-4" />
            ideas-realized.com
          </a>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-fg transition hover:border-accent/60 hover:bg-accent/10"
            >
              <GitHubIcon className="h-4 w-4" />
              Star on GitHub
              <span aria-hidden className="text-amber-300">
                ★
              </span>
            </a>
            {BMC_URL ? (
              <a
                href={BMC_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-300"
              >
                <CoffeeIcon className="h-4 w-4" />
                Buy me a coffee
              </a>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-accent/50 hover:text-accent"
            >
              <LinkedInIcon className="h-4 w-4" />
            </a>
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-accent/50 hover:text-accent"
            >
              <XIcon className="h-4 w-4" />
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-accent/50 hover:text-accent"
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-10 text-[11px] text-muted">
        Built from scratch. Canvas 2D, Web Audio, and WebGL, with no off-the-shelf
        engine. {String.fromCharCode(169)} {year} Ideas Realized.
      </div>
    </footer>
  );
}
