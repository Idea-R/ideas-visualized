"use client";

import { useEffect, useState } from "react";

const BMC_URL = "https://buymeacoffee.com/shanevz";
const VENMO_URL = "https://venmo.com/Xentrilo";
const PAYPAL_URL = "https://paypal.me/Xentrilo";
const EMAIL = "shane@ideas-realized.com";

function CoffeeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M17 9h2.2a2.3 2.3 0 0 1 0 4.6H17" />
      <path d="M7 2.5c-.5.7-.5 1.3 0 2M11 2.5c-.5.7-.5 1.3 0 2" />
    </svg>
  );
}

function VenmoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M19.5 2.25C20.41 3.78 21 5.31 21 7.06C21 13.34 12.88 21.75 10.5 21.75H2.25L4.5 2.25H10.5C12.38 2.25 13.69 3.22 14.25 4.5C14.56 4.12 15 3.75 15.5 3.44C16.59 2.72 17.91 2.25 19.5 2.25Z" />
    </svg>
  );
}

function PayPalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.878.878 0 0 1 .866-.7h6.563c2.934 0 4.939 1.67 4.68 4.605-.356 4.032-2.937 5.925-6.373 5.925H8.516a.69.69 0 0 0-.68.58l-.76 5.207z" />
      <path d="M19.033 7.027c-.43 4.878-3.186 7.473-8.014 7.473h-1.29a.682.682 0 0 0-.673.58l-.84 5.78a.534.534 0 0 0 .527.62h3.7a.77.77 0 0 0 .76-.64l.032-.166.6-4.118.04-.214a.77.77 0 0 1 .76-.64h.48c3.09 0 5.51-1.328 6.214-5.165.295-1.605.142-2.943-.638-3.886a3.226 3.226 0 0 0-.927-.724z" />
    </svg>
  );
}

function MailIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function SupportDev() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("open-support", openHandler);
    return () => window.removeEventListener("open-support", openHandler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Support and feedback"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="panel relative w-full max-w-sm overflow-hidden"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-60"
              style={{
                background:
                  "radial-gradient(60% 80% at 50% 100%, rgba(124,92,255,0.35), transparent 70%)",
              }}
            />
            <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <span className="text-accent-2" aria-hidden>
                  ♥
                </span>
                Support &amp; feedback
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted transition hover:bg-white/10 hover:text-fg"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="relative flex flex-col items-center gap-2 px-5 pt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/support-shane.png"
                alt="Shane and Bigs"
                className="h-40 w-40 rounded-xl border border-white/10 object-cover shadow-lg"
              />
              <p className="text-center text-xs italic text-muted">
                &ldquo;Keep learning, keep building.&rdquo;
                <span className="mt-1 block not-italic font-medium text-fg/80">
                  Shane, MadXent
                </span>
              </p>
            </div>

            <div className="relative space-y-4 p-5 pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CoffeeIcon className="h-4 w-4 text-amber-400" />
                  Buy me a coffee
                </div>
                <p className="text-xs text-muted">
                  If these effects helped or gave you ideas, a coffee keeps the
                  builds coming.
                </p>
                <a
                  href={BMC_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
                >
                  <CoffeeIcon className="h-4 w-4" />
                  Buy me a coffee
                </a>
                <div className="flex gap-2">
                  <a
                    href={VENMO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#008CFF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0070CC]"
                  >
                    <VenmoIcon className="h-3.5 w-3.5" />
                    Venmo
                  </a>
                  <a
                    href={PAYPAL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#003087] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#002060]"
                  >
                    <PayPalIcon className="h-3.5 w-3.5" />
                    PayPal
                  </a>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="text-sm font-medium">Feedback &amp; bug reports</div>
                <a
                  href={`mailto:${EMAIL}?subject=Ideas Visualized feedback`}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs text-fg transition hover:border-accent/60 hover:text-accent"
                >
                  <MailIcon className="h-3.5 w-3.5" />
                  {EMAIL}
                </a>
              </div>

              <p className="pt-1 text-center text-xs text-muted">
                Thanks for exploring Ideas Visualized.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
