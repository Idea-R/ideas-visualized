"use client";

import { useEffect, useRef } from "react";

/**
 * How the harness clears the canvas each frame.
 * - "full": clearRect every frame — crisp, zero ghosting (DEFAULT).
 * - { fade, color?, resetEvery? }: legacy overdraw motion-blur. Asymptotes due
 *   to 8-bit rounding, so `resetEvery` does a periodic true clear (the built-in
 *   "overlay reset"). Prefer explicit history trails over this.
 *
 * See docs/research/reactive-effects-best-practices.md §1.
 */
export type ClearMode =
  | "full"
  | { fade: number; color?: string; resetEvery?: number };

type SetupResult = {
  /** Called every frame. dt is seconds since last frame. */
  draw: (ctx: CanvasRenderingContext2D, dt: number, t: number) => void;
  /** Canvas clear policy. Defaults to "full" (crisp, no burn-in). */
  clearMode?: ClearMode;
  /** Optional pointer handler in CSS pixels relative to canvas. */
  onPointer?: (
    x: number,
    y: number,
    type: "move" | "down" | "up" | "leave"
  ) => void;
  /** Optional cleanup. */
  cleanup?: () => void;
};

type SetupFn = (
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number }
) => SetupResult;

const DEFAULT_BG = "#05060a";

/**
 * Reusable Canvas 2D harness: handles DPR scaling, resize, rAF loop, the clear
 * policy (crisp by default), pointer events, visibility + off-screen pause, and
 * reduced-motion. `setup` re-runs whenever any value in `deps` changes.
 */
export function useCanvas2D(setup: SetupFn, deps: unknown[]) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let result: SetupResult | null = null;
    let frame = 0;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      result = setup(ctx, { width, height });
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = toLocal(e);
      result?.onPointer?.(x, y, "move");
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = toLocal(e);
      result?.onPointer?.(x, y, "down");
    };
    const onUp = (e: PointerEvent) => {
      const { x, y } = toLocal(e);
      result?.onPointer?.(x, y, "up");
    };
    const onLeave = () => result?.onPointer?.(-9999, -9999, "leave");
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    const applyClear = (mode: ClearMode) => {
      if (mode === "full") {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      const { fade, color = DEFAULT_BG, resetEvery } = mode;
      if (resetEvery && frame % resetEvery === 0) {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = withAlpha(color, fade);
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = prev;
    };

    let raf = 0;
    let last = performance.now();
    let visible = document.visibilityState === "visible";
    let onScreen = true;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible && onScreen && result) {
        applyClear(result.clearMode ?? "full");
        result.draw(ctx, dt, now / 1000);
        frame++;
      }
      if (reduceMotion) return; // render a single calm frame only
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Pause when scrolled off-screen (a gallery of live canvases is heavy).
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        last = performance.now();
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      result?.cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}

/** Apply an alpha to a #rrggbb color, returning an rgba() string. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return `rgba(5, 6, 10, ${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
