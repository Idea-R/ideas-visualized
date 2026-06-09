"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { effectsMeta } from "@/lib/effects/meta";
import { encodeParams, randomParams } from "@/lib/effects/params";

/**
 * Jumps to a random effect with randomized parameters. The randomized params
 * are encoded into the URL so the resulting look is shareable.
 */
export function SurpriseButton() {
  const router = useRouter();

  const surprise = useCallback(() => {
    if (effectsMeta.length === 0) return;
    const meta = effectsMeta[Math.floor(Math.random() * effectsMeta.length)];
    const encoded = encodeParams(meta, randomParams(meta));
    const query = encoded ? `?p=${encoded}` : "";
    router.push(`/gallery/${meta.slug}${query}`);
  }, [router]);

  return (
    <button
      onClick={surprise}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-bg-soft px-4 py-2 text-sm font-medium text-fg transition hover:border-accent hover:text-accent"
    >
      <span aria-hidden className="text-base leading-none">🎲</span>
      Surprise me
    </button>
  );
}
