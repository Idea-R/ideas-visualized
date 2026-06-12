"use client";

function CoffeeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M17 9h2.2a2.3 2.3 0 0 1 0 4.6H17" />
      <path d="M7 2.5c-.5.7-.5 1.3 0 2M11 2.5c-.5.7-.5 1.3 0 2" />
    </svg>
  );
}

export function SupportTrigger({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <button
        onClick={() => window.dispatchEvent(new Event("open-support"))}
        aria-label="Support the dev"
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-400/90 px-2.5 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-300"
      >
        <CoffeeIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Support</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-support"))}
      className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-300"
    >
      <CoffeeIcon className="h-4 w-4" />
      Support the dev
    </button>
  );
}
