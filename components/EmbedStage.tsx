"use client";

import { useEffect, useMemo } from "react";
import { getMeta } from "@/lib/effects/meta";
import { defaultParams } from "@/lib/effects/types";
import { getEffectComponent } from "@/components/effects/registry";

/**
 * Full-bleed render of a single effect used only for generating poster stills.
 * A fixed overlay covers the site chrome so a headless screenshot captures just
 * the effect.
 *
 * When the URL has `?drive=1`, we feed the canvas a scripted pointer sequence
 * (sweeping moves plus a few press/hold/release beats) so click-, charge-, and
 * burst-driven effects show real content in their poster instead of an empty
 * dark frame.
 */
export function EmbedStage({ slug }: { slug: string }) {
  // Headless Chrome reports `prefers-reduced-motion: reduce` by default, which
  // makes the canvas harness render a single frame and stop. For capture we
  // force "no-preference" so time-based effects actually animate. Patched in
  // render (before child effects run) and only on this capture-only route.
  if (typeof window !== "undefined") {
    const w = window as typeof window & { __embedMM?: boolean };
    if (!w.__embedMM) {
      const orig = window.matchMedia.bind(window);
      window.matchMedia = ((q: string) => {
        if (q.includes("prefers-reduced-motion")) {
          return {
            matches: false,
            media: q,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
          } as unknown as MediaQueryList;
        }
        return orig(q);
      }) as typeof window.matchMedia;
      w.__embedMM = true;
    }
  }

  const meta = getMeta(slug);
  const Comp = getEffectComponent(slug);
  const params = useMemo(() => (meta ? defaultParams(meta) : {}), [meta]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("drive")) return;

    let raf = 0;
    const timers: number[] = [];
    let pointerId = 1;

    const fire = (type: string, fx: number, fy: number) => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const clientX = r.left + r.width * fx;
      const clientY = r.top + r.height * fy;
      canvas.dispatchEvent(
        new PointerEvent(type, {
          clientX,
          clientY,
          bubbles: true,
          pointerId: pointerId,
          pointerType: "mouse",
        })
      );
    };

    // Continuous sweeping move so pointer-reactive effects stay alive.
    const start = performance.now();
    const sweep = () => {
      const t = (performance.now() - start) / 1000;
      const fx = 0.5 + 0.32 * Math.sin(t * 1.7);
      const fy = 0.5 + 0.26 * Math.cos(t * 1.3);
      fire("pointermove", fx, fy);
      raf = requestAnimationFrame(sweep);
    };
    raf = requestAnimationFrame(sweep);

    // Press / hold / release beats at varied spots (covers click bursts and
    // charge-and-release effects). The last press is left held for the capture.
    const beats: Array<[number, string, number, number]> = [
      [250, "pointerdown", 0.5, 0.5],
      [1100, "pointerup", 0.5, 0.5],
      [1500, "pointerdown", 0.38, 0.42],
      [2400, "pointerup", 0.38, 0.42],
      [2800, "pointerdown", 0.62, 0.55],
      [4200, "pointerdown", 0.5, 0.48],
    ];
    for (const [ms, type, fx, fy] of beats) {
      timers.push(window.setTimeout(() => fire(type, fx, fy), ms));
    }

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => clearTimeout(id));
    };
  }, [slug]);

  if (!Comp || !meta) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05060a]">
      <Comp params={params} />
    </div>
  );
}
