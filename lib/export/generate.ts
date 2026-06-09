import type { EffectMeta, EffectProps } from "@/lib/effects/types";

function paramLine(meta: EffectMeta, params: EffectProps): string {
  return meta.controls
    .map((c) => {
      const v = params[c.key];
      const label = c.label.toLowerCase();
      if (c.type === "select") {
        const opt = c.options?.find((o) => o.value === v);
        return `${label} = ${opt?.label ?? v}`;
      }
      if (c.type === "toggle") return `${label} ${v ? "on" : "off"}`;
      if (c.type === "text") return `${label} = "${v}"`;
      return `${label} = ${v}`;
    })
    .join(", ");
}

/**
 * A natural-language spec a user can paste into any AI tool to recreate/remix
 * the effect at its current settings. Bakes in the crisp-clear guidance so the
 * ghosting bug never propagates.
 */
export function toPrompt(meta: EffectMeta, params: EffectProps): string {
  return [
    `Build a self-contained, performant Canvas 2D visual effect in a single React + TypeScript component.`,
    ``,
    `Effect: "${meta.title}".`,
    `Description: ${meta.blurb}`,
    `Current settings: ${paramLine(meta, params)}.`,
    `Tags: ${meta.tags.join(", ")}.`,
    ``,
    `Requirements:`,
    `- Use requestAnimationFrame with a delta-time (dt) step, clamped to avoid jumps on tab switches.`,
    `- Render crisply: fully clear the canvas every frame (clearRect). Do NOT fake motion blur by painting a translucent background each frame — that causes permanent 8-bit "ghost" burn-in. If trails are wanted, store each particle's recent positions and draw them as an explicit fading tail.`,
    `- If many short-lived particles are spawned, use an object pool (pre-allocate, reuse, swap-remove on death) to avoid GC pauses.`,
    `- Scale the backing store by devicePixelRatio (cap ~2) and handle resize.`,
    `- Pause when the tab is hidden or the canvas is off-screen; respect prefers-reduced-motion.`,
    `- Expose the listed settings as adjustable props/controls.`,
  ].join("\n");
}

/** A copy-pasteable React + TypeScript component, preset to current values. */
export function toComponentSource(meta: EffectMeta, params: EffectProps): string {
  const compName = meta.title.replace(/[^a-zA-Z0-9]/g, "") || "Effect";
  const defaults = JSON.stringify(params, null, 2)
    .split("\n")
    .map((l, i) => (i === 0 ? l : "  " + l))
    .join("\n");

  return `"use client";

// "${meta.title}" — exported from Ideas Visualized.
// Source effect: ${meta.source.project} (${meta.source.path})
//
// Crisp by default: this harness fully clears each frame (no ghosting/burn-in).
// See: explicit history trails + delta-time stepping.

import { useEffect, useRef } from "react";

const DEFAULTS = ${defaults};

export function ${compName}(props: Partial<typeof DEFAULTS> = {}) {
  const params = { ...DEFAULTS, ...props };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    let w = 0, h = 0, raf = 0, last = performance.now();
    let running = true;

    const resize = () => {
      const r = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Crisp full clear — no burn-in.
      ctx.clearRect(0, 0, w, h);

      // TODO: port the draw loop for "${meta.title}" here, using \`params\`,
      // \`dt\`, \`w\`, \`h\`. Keep trails explicit (store recent positions) and
      // pool particles if you spawn many. See the AI prompt export for a full
      // spec, or the original source listed above.

      if (running) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVis = () => { running = document.visibilityState === "visible"; last = performance.now(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
`;
}
