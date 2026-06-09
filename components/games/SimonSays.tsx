"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Simon Says, a glowing-dot memory game in the visual style of the
 * "Absorption Cursor" effect (radial-gradient glow, expanding pulse rings,
 * gently bobbing dots). Pure Canvas 2D + React, no dependencies, no audio.
 */

type Phase = "idle" | "watch" | "repeat" | "over";

const TAU = Math.PI * 2;

// Watch-phase timing (ms) per speed setting: [flash-on, gap-between].
const SPEED: Record<string, { on: number; gap: number }> = {
  chill: { on: 520, gap: 260 },
  normal: { on: 400, gap: 180 },
  fast: { on: 250, gap: 110 },
};

const FLASH_DECAY = 0.5; // seconds for a flash to fade out

// Absorption-cursor tuning (mirrors components/effects/absorption-cursor).
const CURSOR_HUE = 265; // base hue (app accent ≈ purple)
const CAPTURE_MULT = 4.5; // capture radius = baseDotR * this
const SELECT_AT = 0.8; // absorb level that locks in a selection
const RELEASE_PROX = 0.2; // cursor must drop below this proximity to re-arm

interface Dot {
  hue: number;
  bob: number; // phase offset for idle drift
  flash: number; // 0..1 brightness boost (decays each frame)
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number; // 1 -> 0
  hue: number;
}

interface Pos {
  x: number;
  y: number;
  r: number; // base dot radius
}

export function SimonSays() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ----- React UI state (drives controls + modal) -----
  const [dotCount, setDotCount] = useState(6);
  const [speed, setSpeed] = useState<keyof typeof SPEED>("normal");
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [fallbackFs, setFallbackFs] = useState(false);
  const [isFs, setIsFs] = useState(false);

  // ----- refs the engine reads (kept in sync with UI state) -----
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Engine API exposed to React buttons (set inside the canvas effect).
  const apiRef = useRef<{ start: () => void } | null>(null);

  const startGame = useCallback(() => apiRef.current?.start(), []);

  // ---------------------------------------------------------------
  // Canvas engine: rebuilds whenever the dot count changes.
  // ---------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = rootRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let W = 0;
    let H = 0;

    const dots: Dot[] = Array.from({ length: dotCount }, (_, i) => ({
      hue: Math.round((i / dotCount) * 360),
      bob: (i / dotCount) * TAU + i * 1.7,
      flash: 0,
    }));

    const rings: Ring[] = [];
    // Latest on-screen positions (updated each frame) for hit testing.
    let positions: Pos[] = [];

    // Mutable game state (logic reads/writes refs, not React state).
    const g = {
      phase: "idle" as Phase,
      sequence: [] as number[],
      inputIndex: 0,
      score: 0,
    };

    const timers: number[] = [];
    const clearTimers = () => {
      timers.forEach((id) => clearTimeout(id));
      timers.length = 0;
    };
    const after = (ms: number, fn: () => void) => {
      const id = window.setTimeout(fn, ms);
      timers.push(id);
    };

    const randDot = () => Math.floor(Math.random() * dots.length);

    const layout = (t: number): Pos[] => {
      const cx = W / 2;
      const cy = H / 2;
      const ringR = Math.min(W, H) * 0.34;
      const baseR = Math.max(14, Math.min(W, H) * 0.072);
      const drift = reduceMotion ? 0 : baseR * 0.16;
      return dots.map((d, i) => {
        const a = (i / dots.length) * TAU - Math.PI / 2;
        const x =
          cx + Math.cos(a) * ringR + (drift ? Math.sin(t * 0.8 + d.bob) * drift : 0);
        const y =
          cy + Math.sin(a) * ringR + (drift ? Math.cos(t * 0.7 + d.bob) * drift : 0);
        return { x, y, r: baseR };
      });
    };

    const spawnRing = (idx: number) => {
      const p = positions[idx];
      if (!p) return;
      rings.push({ x: p.x, y: p.y, r: p.r, life: 1, hue: dots[idx].hue });
    };

    const flashDot = (idx: number) => {
      const d = dots[idx];
      if (!d) return;
      d.flash = 1;
      spawnRing(idx);
    };

    const setPhaseBoth = (p: Phase) => {
      g.phase = p;
      setPhase(p);
    };

    const playWatch = () => {
      g.inputIndex = 0;
      setPhaseBoth("watch");
      const { on, gap } = SPEED[speedRef.current];
      let i = 0;
      const step = () => {
        if (i >= g.sequence.length) {
          setPhaseBoth("repeat");
          return;
        }
        flashDot(g.sequence[i]);
        i++;
        after(on + gap, step);
      };
      after(600, step);
    };

    const start = () => {
      clearTimers();
      for (const d of dots) d.flash = 0;
      rings.length = 0;
      absorb = 0;
      canSelect = true;
      lockedDot = -1;
      g.sequence = [randDot()];
      g.inputIndex = 0;
      g.score = 0;
      setScore(0);
      setRound(1);
      playWatch();
    };

    apiRef.current = { start };

    const hitTest = (x: number, y: number): number => {
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < p.r * 1.5 && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    // ----- absorption cursor state -----
    const cursor = { x: W / 2, y: H / 2 };
    const target = { x: W / 2, y: H / 2 };
    let active = false; // pointer present over the play area
    let presence = 0; // smoothed 0..1 cursor visibility
    let absorb = 0; // smoothed 0..1 absorption of the nearest dot
    let nearest = -1; // index of the dot the cursor is closest to
    let proximity = 0; // 0..1 closeness to the nearest dot
    let canSelect = true; // debounce: false until cursor leaves locked dot
    let lockedDot = -1; // the dot just selected (must be left to re-arm)
    let ringTimer = 0; // throttle for absorption pulse rings

    // Register a player selection (used by both absorption and click fallback).
    const registerSelection = (idx: number) => {
      flashDot(idx);
      absorb = 0; // cursor re-emerges
      canSelect = false; // debounce until the dot is left
      lockedDot = idx;
      if (g.phase !== "repeat") return;

      if (idx === g.sequence[g.inputIndex]) {
        g.inputIndex++;
        if (g.inputIndex >= g.sequence.length) {
          // Round complete: score = length reproduced.
          g.score = g.sequence.length;
          setScore(g.score);
          setPhaseBoth("watch"); // lock input during the pause
          after(750, () => {
            g.sequence.push(randDot());
            setRound(g.sequence.length);
            playWatch();
          });
        }
      } else {
        // Wrong dot: game over (brief beat so the flash is visible).
        g.phase = "over";
        after(450, () => setPhaseBoth("over"));
      }
    };

    const localPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = localPoint(e);
      target.x = p.x;
      target.y = p.y;
      active = true;
    };
    const onPointerLeave = () => {
      active = false;
    };
    // Click stays as an optional fallback selection mechanic.
    const onPointerDown = (e: PointerEvent) => {
      const p = localPoint(e);
      target.x = p.x;
      target.y = p.y;
      active = true;
      if (g.phase !== "repeat") return;
      const idx = hitTest(p.x, p.y);
      if (idx >= 0) registerSelection(idx);
    };
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointercancel", onPointerLeave);

    // ----- sizing (DPR-aware, capped at 2) -----
    const resize = () => {
      const rect = container.getBoundingClientRect();
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ----- render loop -----
    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      positions = layout(t);

      // ----- absorption cursor update -----
      // Smoothly chase the pointer (snappier under reduced motion).
      const k = reduceMotion ? 1 : 1 - Math.pow(0.0008, dt);
      cursor.x += (target.x - cursor.x) * k;
      cursor.y += (target.y - cursor.y) * k;
      presence += ((active ? 1 : 0) - presence) * (1 - Math.pow(0.02, dt));

      const baseR = positions.length ? positions[0].r : 16;
      const captureR = baseR * CAPTURE_MULT;

      // Find the nearest dot and proximity (0..1) to the cursor.
      nearest = -1;
      proximity = 0;
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const prox = Math.max(0, 1 - Math.hypot(cursor.x - p.x, cursor.y - p.y) / captureR);
        if (prox > proximity) {
          proximity = prox;
          nearest = i;
        }
      }

      // Smooth absorption toward the nearest dot's proximity.
      const absorbTarget = active ? proximity : 0;
      absorb += (absorbTarget - absorb) * (1 - Math.pow(0.004, dt));

      // Re-arm once the cursor has left the just-selected dot.
      if (!canSelect) {
        const lp = lockedDot >= 0 ? positions[lockedDot] : null;
        const lprox = lp
          ? Math.max(0, 1 - Math.hypot(cursor.x - lp.x, cursor.y - lp.y) / captureR)
          : 0;
        if (!lp || lprox < RELEASE_PROX) {
          canSelect = true;
          lockedDot = -1;
        }
      }

      // Emit tightening absorption pulse rings while being absorbed.
      if (nearest >= 0 && absorb > 0.35) {
        ringTimer -= dt;
        if (ringTimer <= 0) {
          ringTimer = 0.16;
          const src = positions[nearest];
          rings.push({ x: src.x, y: src.y, r: src.r, life: 1, hue: dots[nearest].hue });
        }
      }

      // Lock in a selection when absorption completes (Repeat phase only).
      if (g.phase === "repeat" && canSelect && nearest >= 0 && absorb >= SELECT_AT) {
        registerSelection(nearest);
      }

      ctx.clearRect(0, 0, W, H);

      // Subtle radial backdrop for depth (crisp, fully repainted).
      const bg = ctx.createRadialGradient(
        W / 2,
        H / 2,
        0,
        W / 2,
        H / 2,
        Math.max(W, H) * 0.7
      );
      bg.addColorStop(0, "rgba(124, 92, 255, 0.05)");
      bg.addColorStop(1, "rgba(5, 6, 10, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Glows + cores in additive mode.
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.flash = Math.max(0, d.flash - dt / FLASH_DECAY);
        const p = positions[i];

        // Effective brightness: the lingering flash, plus a proximity glow,
        // plus a strong absorb-driven boost on the dot being selected. This
        // telegraphs the pending selection so the lock-in is never a surprise.
        const prox = Math.max(0, 1 - Math.hypot(cursor.x - p.x, cursor.y - p.y) / captureR);
        let f = d.flash;
        if (active && presence > 0.01) {
          f = Math.max(f, prox * 0.4 * presence);
          if (i === nearest) f = Math.max(f, absorb);
        }

        const idle = reduceMotion ? 0 : Math.sin(t * 2 + d.bob) * 0.05;
        const r = p.r * (1 + idle + f * 0.32);

        const haloR = r * (2.3 + f * 1.7);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
        const a = 0.16 + f * 0.6;
        grad.addColorStop(0, `hsla(${d.hue}, 90%, 65%, ${Math.min(1, a)})`);
        grad.addColorStop(0.5, `hsla(${d.hue}, 90%, 60%, ${Math.min(1, a * 0.4)})`);
        grad.addColorStop(1, `hsla(${d.hue}, 90%, 60%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, haloR, 0, TAU);
        ctx.fill();

        ctx.fillStyle = `hsla(${d.hue}, ${72 + f * 25}%, ${52 + f * 30}%, ${0.55 + f * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();

        if (f > 0.02) {
          ctx.fillStyle = `hsla(${d.hue}, 100%, 92%, ${f * 0.9})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.42, 0, TAU);
          ctx.fill();
        }
      }

      // Expanding pulse rings (explicit radius/alpha, no trail overdraw).
      ctx.lineWidth = 2;
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += dt * 220;
        ring.life -= dt * 1.5;
        if (ring.life <= 0) {
          rings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `hsla(${ring.hue}, 90%, 70%, ${ring.life * 0.55})`;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, TAU);
        ctx.stroke();
      }

      // ----- absorption cursor (glowing orb that chases the pointer) -----
      if (presence > 0.003) {
        // Breathes while free; shrinks toward the dot as it is absorbed.
        const breathe = reduceMotion ? 1 : 1 + Math.sin(t * 2.4) * 0.12;
        const headBase = Math.max(5, Math.min(W, H) * 0.022);
        const head = headBase * breathe * (1 - absorb * 0.72);

        // Soft radial-gradient halo (additive).
        const haloR = head * (3 + absorb * 2);
        const halo = ctx.createRadialGradient(
          cursor.x,
          cursor.y,
          0,
          cursor.x,
          cursor.y,
          haloR
        );
        const ha = (0.45 + absorb * 0.3) * presence;
        halo.addColorStop(0, `hsla(${CURSOR_HUE}, 95%, 72%, ${Math.min(1, ha)})`);
        halo.addColorStop(0.4, `hsla(${CURSOR_HUE}, 95%, 64%, ${Math.min(1, ha * 0.35)})`);
        halo.addColorStop(1, `hsla(${CURSOR_HUE}, 95%, 64%, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, haloR, 0, TAU);
        ctx.fill();

        // Tightening ring as the cursor is captured.
        if (absorb > 0.25) {
          ctx.lineWidth = 1.5;
          const r1 = head + 8 + Math.sin(t * 6) * 3;
          ctx.strokeStyle = `hsla(${CURSOR_HUE}, 95%, 74%, ${absorb * 0.6 * presence})`;
          ctx.beginPath();
          ctx.arc(cursor.x, cursor.y, r1, 0, TAU);
          ctx.stroke();
        }

        // Bright solid core + hot center (drawn opaque).
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `hsla(${CURSOR_HUE}, 90%, 68%, ${presence})`;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, head, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `hsla(${CURSOR_HUE}, 100%, 95%, ${0.85 * presence})`;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, head * 0.4, 0, TAU);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      clearTimers();
      ro.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointercancel", onPointerLeave);
      apiRef.current = null;
    };
  }, [dotCount]);

  // ---------------------------------------------------------------
  // Fullscreen handling (native API + fixed-overlay fallback).
  // ---------------------------------------------------------------
  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!fallbackFs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFallbackFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fallbackFs]);

  const expanded = isFs || fallbackFs;

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (fallbackFs) {
      setFallbackFs(false);
      return;
    }
    if (typeof el.requestFullscreen === "function") {
      el.requestFullscreen().catch(() => setFallbackFs(true));
    } else {
      setFallbackFs(true);
    }
  }, [fallbackFs]);

  const playing = phase === "watch" || phase === "repeat";
  const statusLabel =
    phase === "watch"
      ? "Watch…"
      : phase === "repeat"
        ? "Your turn"
        : phase === "over"
          ? "Game over"
          : "Ready";

  const pillBtn =
    "rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-fg transition hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:text-fg";

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden bg-bg ${
        expanded ? "fixed inset-0 z-50" : "h-full w-full"
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 cursor-none" />

      {/* Controls bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="panel pointer-events-auto flex items-center gap-3 px-4 py-2">
          <span className="text-xs text-muted">Round</span>
          <span className="text-sm font-semibold text-fg">{round}</span>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <span className="text-xs text-muted">Score</span>
          <span className="text-sm font-semibold text-accent-2">{score}</span>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <span className="text-xs text-muted">{statusLabel}</span>
        </div>

        <div className="panel pointer-events-auto flex flex-wrap items-center gap-2 px-3 py-2">
          <button onClick={startGame} className={pillBtn}>
            {phase === "idle" ? "Start" : "Restart"}
          </button>

          <div className="flex items-center gap-1">
            {[4, 6, 9].map((n) => (
              <button
                key={n}
                onClick={() => setDotCount(n)}
                disabled={playing}
                title={`${n} dots`}
                className={`rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-40 ${
                  dotCount === n
                    ? "border-accent text-accent"
                    : "border-white/15 text-muted hover:text-fg"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <select
            value={speed}
            onChange={(e) => setSpeed(e.target.value as keyof typeof SPEED)}
            className="rounded-full border border-white/15 bg-bg-soft px-2.5 py-1 text-xs text-fg outline-none transition hover:border-accent"
            title="Playback speed"
          >
            <option value="chill">Chill</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>

          <button onClick={toggleFullscreen} className={pillBtn}>
            {expanded ? "Exit" : "Expand"}
          </button>
        </div>
      </div>

      {/* Idle hint */}
      {phase === "idle" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="panel pointer-events-auto max-w-xs px-6 py-5 text-center">
            <h2 className="text-lg font-semibold text-fg">Simon Says</h2>
            <p className="mt-2 text-sm text-muted">
              Watch the glowing dots flash, then repeat the sequence from memory.
              Hover your absorption cursor over a dot until it pulls in to
              select it, no clicking needed. The sequence grows each round.
            </p>
            <button
              onClick={startGame}
              className="mt-4 rounded-full border border-accent px-5 py-2 text-sm font-semibold text-accent transition hover:bg-accent hover:text-bg"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Game-over modal */}
      {phase === "over" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/60 backdrop-blur-sm">
          <div className="panel w-[min(90vw,380px)] px-7 py-8 text-center">
            <div className="text-xs font-medium uppercase tracking-widest text-muted">
              Game over
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg">
              You remembered{" "}
              <span className="glow-text">{score}</span>!
            </h2>
            <p className="mt-3 text-sm text-muted">
              {score === 0
                ? "Everyone misfires on the first one. Try again."
                : score < 5
                  ? "A solid start. Your memory is warming up."
                  : score < 9
                    ? "Sharp recall. The sequence never stood a chance."
                    : "Elite memory. Are you even human?"}
            </p>
            <button
              onClick={startGame}
              className="mt-6 rounded-full border border-accent px-6 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-bg"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
