"use client";

import { useEffect, useRef } from "react";
import { paletteHue, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const TITLE = "IDEAS\nVISUALIZED";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@$/\\<>*+=";

type ClickMode =
  | "none"
  | "distort"
  | "bounce"
  | "recede"
  | "shuffle"
  | "shift"
  | "flip";

const CLICK_DURATION: Record<ClickMode, number> = {
  none: 0,
  distort: 0.5,
  bounce: 0.55,
  recede: 0.45,
  shuffle: 0.7,
  shift: 0.5,
  flip: 0.9,
};

export function TiltCard({ params }: { params: EffectProps }) {
  const maxTilt = Number(params.maxTilt);
  const glare = Number(params.glare);
  const hue = Number(params.hue);
  const colorMode = String(params.colorMode ?? "single") as ColorMode;
  const hue2 = Number(params.hue2 ?? hue);
  const depth = String(params.depth); // "raised" | "sunken" | "flat"
  const click = String(params.click) as ClickMode;

  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const sinkRef = useRef<HTMLDivElement>(null);

  // Persisted across effect re-runs so param tweaks don't snap the card.
  const target = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, active: 0 });
  const cur = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, active: 0 });
  // Active click animation: t counts up to dur, dir is the shove direction.
  const clickAnim = useRef({ t: Infinity, dur: 0, dirX: 0, dirY: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    const glareEl = glareRef.current;
    const content = contentRef.current;
    const title = titleRef.current;
    const halo = haloRef.current;
    const sink = sinkRef.current;
    if (!wrap || !card || !content) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Depth profile. Raised floats above the surface (real positive-Z pop +
    // parallax). Sunken must stay in FRONT of the opaque surface (negative Z
    // would be occluded by it), so the "divot" is sold purely with a deboss
    // shadow + dimming — which is also physically right: an engraving sits on
    // the surface and doesn't parallax independently.
    const baseZ = depth === "raised" ? 90 : depth === "sunken" ? 1 : 18;
    const embossShadow =
      depth === "sunken"
        ? "0 1px 0 rgba(255,255,255,0.28), 0 -3px 8px rgba(0,0,0,0.7), 0 -1px 1px rgba(0,0,0,0.6)"
        : depth === "raised"
        ? "0 -1px 0 rgba(255,255,255,0.55), 0 10px 22px rgba(0,0,0,0.6)"
        : "0 2px 10px rgba(0,0,0,0.45)";
    const contentBrightness = depth === "sunken" ? 0.7 : 1;

    if (title) title.textContent = TITLE;
    if (sink) sink.style.opacity = depth === "sunken" ? "1" : "0";

    // Accent hue for the RGB-split distort shadow. Dual splits toward hue2,
    // Rainbow toward a 120° offset, Single keeps the complementary hue.
    const accentHue =
      colorMode === "dual"
        ? hue2
        : colorMode === "rainbow"
        ? (hue + 120) % 360
        : (hue + 180) % 360;

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      target.current.ry = (px - 0.5) * maxTilt * 2;
      target.current.rx = -(py - 0.5) * maxTilt * 2;
      target.current.gx = px * 100;
      target.current.gy = py * 100;
      target.current.active = 1;
    };
    const onLeave = () => {
      target.current.rx = 0;
      target.current.ry = 0;
      target.current.gx = 50;
      target.current.gy = 50;
      target.current.active = 0;
    };
    const onDown = (e: PointerEvent) => {
      if (click === "none") return;
      const r = card.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      const len = Math.hypot(dx, dy) || 1;
      clickAnim.current = {
        t: 0,
        dur: CLICK_DURATION[click] || 0.5,
        dirX: dx / len,
        dirY: dy / len,
      };
    };

    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("pointerdown", onDown);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeInOut = (p: number) =>
      p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

    let raf = 0;
    let last = performance.now();
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const t = reduce ? 1 : 0.12;
      const c = cur.current;
      const g = target.current;
      c.rx = lerp(c.rx, g.rx, t);
      c.ry = lerp(c.ry, g.ry, t);
      c.gx = lerp(c.gx, g.gx, t);
      c.gy = lerp(c.gy, g.gy, t);
      c.active = lerp(c.active, g.active, t);

      // --- Resolve the active click animation -----------------------------
      const ca = clickAnim.current;
      let p = 0;
      let mode: ClickMode = "none";
      if (ca.t < ca.dur) {
        p = ca.t / ca.dur; // 0..1
        mode = click;
        ca.t += reduce ? ca.dur : dt; // reduced motion: resolve instantly
      }
      const pulse = Math.sin(Math.min(1, p) * Math.PI); // 0 -> 1 -> 0

      let shiftX = 0;
      let shiftY = 0;
      let extraScale = 1;
      let flipDeg = 0;
      let contentScale = 1;
      let skew = 0;
      let contentBlur = 0;

      if (mode === "bounce") extraScale = 1 + 0.12 * pulse;
      // "recede" presses the content in via scale (a negative Z would be
      // occluded by the opaque surface), reading as a push-in.
      else if (mode === "recede") contentScale = 1 - 0.22 * pulse;
      else if (mode === "shift") {
        shiftX = ca.dirX * 26 * pulse;
        shiftY = ca.dirY * 26 * pulse;
      } else if (mode === "flip") flipDeg = 360 * easeInOut(Math.min(1, p));
      else if (mode === "distort") {
        skew = Math.sin(p * Math.PI * 5) * 9 * (1 - p);
        contentBlur = pulse * 2.2;
      } else if (mode === "shuffle" && title) {
        const reveal = Math.floor(p * TITLE.length);
        let out = "";
        for (let i = 0; i < TITLE.length; i++) {
          const ch = TITLE[i];
          if (ch === "\n" || ch === " ") out += ch;
          else if (i < reveal) out += ch;
          else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        title.textContent = out;
      }
      // Restore canonical text once a shuffle completes.
      if (title && click === "shuffle" && ca.t >= ca.dur && p === 0) {
        if (title.textContent !== TITLE) title.textContent = TITLE;
      }

      // --- Card transform --------------------------------------------------
      card.style.transform =
        `translate3d(${shiftX}px, ${shiftY}px, 0) ` +
        `rotateX(${c.rx}deg) rotateY(${c.ry + flipDeg}deg) ` +
        `scale(${extraScale})`;

      // --- Content (depth via real 3D + click distortion) ------------------
      // translateZ alone yields correct parallax through the parent's rotation.
      content.style.transform = `translateZ(${baseZ}px) scale(${contentScale}) skewX(${skew}deg)`;
      content.style.filter =
        (contentBlur ? `blur(${contentBlur.toFixed(2)}px) ` : "") +
        `brightness(${contentBrightness})`;
      if (title) {
        title.style.textShadow =
          mode === "distort" && pulse > 0.05
            ? `${2 + skew}px 0 hsl(${accentHue} 95% 60%), ${
                -2 - skew
              }px 0 hsl(${hue} 95% 60%), ${embossShadow}`
            : embossShadow;
      }

      if (glareEl) {
        glareEl.style.background = `radial-gradient(circle at ${c.gx}% ${c.gy}%, rgba(255,255,255,${
          0.55 * glare
        }) 0%, rgba(255,255,255,${0.12 * glare}) 18%, rgba(255,255,255,0) 55%)`;
        glareEl.style.opacity = String(c.active);
      }

      if (halo) {
        halo.style.opacity = String(0.4 + c.active * 0.45 + pulse * 0.3);
        halo.style.transform = `translate(${c.ry * 0.4}px, ${-c.rx * 0.4}px)`;
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("pointerdown", onDown);
    };
  }, [maxTilt, glare, hue, hue2, colorMode, depth, click]);

  // Gradient stops. Single keeps the original warm sweep (hue, +60, +300).
  // Dual blends hue→hue2 (midpoint + hue2 end stop). Rainbow sweeps +120/+240.
  const h2 =
    colorMode === "dual"
      ? paletteHue("dual", hue, hue2, 0.5)
      : colorMode === "rainbow"
      ? (hue + 120) % 360
      : (hue + 60) % 360;
  const h3 =
    colorMode === "dual"
      ? hue2
      : colorMode === "rainbow"
      ? (hue + 240) % 360
      : (hue + 300) % 360;
  const c1 = `hsl(${hue} 90% 60%)`;
  const c2 = `hsl(${h2} 90% 55%)`;
  const c3 = `hsl(${h3} 90% 55%)`;

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#05060a] p-8">
      <div
        ref={wrapRef}
        className="relative cursor-pointer select-none"
        style={{ perspective: "1000px" }}
      >
        <div
          ref={haloRef}
          aria-hidden
          className="pointer-events-none absolute -inset-8 rounded-[2.5rem] blur-3xl"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${c1}, transparent 70%)`,
          }}
        />
        <div
          ref={cardRef}
          className="relative h-72 w-56 will-change-transform sm:h-80 sm:w-64"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Clipped visual surface. Kept separate from the 3D text layer so its
              `overflow:hidden` doesn't flatten the card's preserve-3d context. */}
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-3xl border border-white/15 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]"
            style={{
              background: `linear-gradient(135deg, ${c1}, ${c2} 45%, ${c3})`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.20), rgba(255,255,255,0) 42%, rgba(0,0,0,0.28))",
              }}
            />
            {/* Inner shadow that sells the "divot" when content is sunken. */}
            <div
              ref={sinkRef}
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity"
              style={{
                boxShadow:
                  "inset 0 14px 26px rgba(0,0,0,0.55), inset 0 -8px 18px rgba(0,0,0,0.35)",
              }}
            />
            <div
              ref={glareRef}
              className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay"
            />
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
          </div>
          {/* Unclipped 3D text layer — translateZ now pops out / sinks in for real. */}
          <div
            ref={contentRef}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center will-change-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/70">
              Showcase
            </span>
            <span
              ref={titleRef}
              className="text-2xl font-extrabold leading-tight text-white sm:text-3xl"
              style={{ whiteSpace: "pre-line" }}
            >
              {TITLE}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
