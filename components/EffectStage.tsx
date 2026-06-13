"use client";

import { useMemo } from "react";
import { getMeta } from "@/lib/effects/meta";
import { defaultParams } from "@/lib/effects/types";
import { getEffectComponent } from "@/components/effects/registry";

/**
 * Lightweight live preview of an effect using its default params.
 *
 * When `active` is false (the default for gallery cards is to start inactive),
 * we render a cheap themed placeholder instead of mounting the live effect.
 * This keeps the gallery grid from spinning up dozens of rAF loops and WebGL
 * contexts at once. The live effect only mounts on hover/focus.
 *
 * `active` defaults to true so existing always-on usages (hero background,
 * detail page) keep animating with no changes.
 */
export function EffectStage({
  slug,
  className = "",
  active = true,
}: {
  slug: string;
  className?: string;
  active?: boolean;
}) {
  const meta = getMeta(slug);
  const Comp = getEffectComponent(slug);
  const params = useMemo(() => (meta ? defaultParams(meta) : {}), [meta]);

  const placeholderBg = useMemo(() => {
    const p = params as Record<string, unknown>;
    const hue = typeof p.hue === "number" ? p.hue : 220;
    const hue2 = typeof p.hue2 === "number" ? p.hue2 : (hue + 40) % 360;
    return (
      `radial-gradient(120% 110% at 28% 18%, hsl(${hue} 72% 24% / 0.55), transparent 60%),` +
      `radial-gradient(120% 120% at 82% 92%, hsl(${hue2} 70% 22% / 0.5), transparent 58%),` +
      `linear-gradient(180deg, #0b0e16, #05060a)`
    );
  }, [params]);

  if (!Comp || !meta) return null;

  return (
    <div className={className}>
      <div className="relative h-full w-full overflow-hidden bg-bg">
        {active ? (
          <Comp params={params} />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: placeholderBg }}
            aria-hidden
          >
            {/* Poster still of the effect; gradient above shows through if it 404s. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/posters/${slug}.png`}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-fg/90 backdrop-blur-sm transition group-hover:scale-110 group-hover:border-accent/60 group-hover:text-accent">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="absolute bottom-2 right-2 text-[10px] uppercase tracking-widest text-white/60">
              Hover to play
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
