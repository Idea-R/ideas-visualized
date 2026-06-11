"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { paletteHue, readPalette, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface GlobeItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  lat: number;
  lon: number;
  index: number;
  total: number;
}

// Generic, brand-agnostic testimonials. Neutral and positive, no portraits.
const QUOTES: { quote: string; author: string; role: string }[] = [
  {
    quote: "Working with this team felt easy from the first call to launch day.",
    author: "Sarah Chen",
    role: "Product Lead",
  },
  {
    quote: "They listened closely and turned a rough brief into something we are proud of.",
    author: "Marcus Rivera",
    role: "Founder",
  },
  {
    quote: "Clear communication and steady progress, with a result that matched the plan.",
    author: "Emily Watson",
    role: "Operations Director",
  },
  {
    quote: "Our site finally reflects who we are, and visitors notice the difference.",
    author: "James Park",
    role: "Marketing Manager",
  },
  {
    quote: "Every detail got real care, and the timeline held without surprises.",
    author: "Lisa Thompson",
    role: "Brand Director",
  },
  {
    quote: "Ideas Realized helped us ship faster than we thought we could.",
    author: "David Kim",
    role: "CTO",
  },
  {
    quote: "The handoff was smooth and the notes made it simple to maintain.",
    author: "Rachel Adams",
    role: "Engineering Lead",
  },
  {
    quote: "They balanced bold design with real usability, and customers stayed longer.",
    author: "Michael Torres",
    role: "Growth Lead",
  },
  {
    quote: "A calm, organized process that respected our budget and our goals.",
    author: "Jennifer Liu",
    role: "Design Lead",
  },
];

// Golden-angle distribution so any 5..9 cards spread evenly over the sphere.
const GOLDEN_ANGLE = 137.50776405003785;

function buildItems(count: number): GlobeItem[] {
  const n = Math.max(1, Math.min(QUOTES.length, count));
  return QUOTES.slice(0, n).map((q, i) => {
    // Keep latitudes away from the poles so cards stay readable.
    const y = n === 1 ? 0 : (1 - (i / (n - 1)) * 2) * 0.82;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = (i * GOLDEN_ANGLE) % 360;
    return { ...q, id: String(i + 1), lat, lon, index: i, total: n };
  });
}

// lat/lon -> 3D point on a sphere, then apply X then Y rotation (degrees).
function latLonToPosition(
  lat: number,
  lon: number,
  radius: number,
  rotX: number,
  rotY: number
) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon + rotY) * Math.PI) / 180;
  const rotXRad = (rotX * Math.PI) / 180;

  const x = radius * Math.cos(latRad) * Math.sin(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.cos(lonRad);

  const y2 = y * Math.cos(rotXRad) - z * Math.sin(rotXRad);
  const z2 = y * Math.sin(rotXRad) + z * Math.cos(rotXRad);

  return { x, y: y2, z: z2 };
}

function worldZ(
  lat: number,
  lon: number,
  rotX: number,
  rotY: number,
  radius: number
) {
  return latLonToPosition(lat, lon, radius, rotX, rotY).z;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface CardProps {
  item: GlobeItem;
  radius: number;
  rotX: MotionValue<number>;
  rotY: MotionValue<number>;
  isActive: boolean;
  accentHue: number;
  mode: ColorMode;
  hue: number;
  hue2: number;
  onClick: () => void;
}

function GlobeCard({
  item,
  radius,
  rotX,
  rotY,
  isActive,
  accentHue,
  mode,
  hue,
  hue2,
  onClick,
}: CardProps) {
  const x = useTransform([rotX, rotY], ([rx, ry]: number[]) =>
    latLonToPosition(item.lat, item.lon, radius, rx, ry).x
  );
  const y = useTransform([rotX, rotY], ([rx, ry]: number[]) =>
    latLonToPosition(item.lat, item.lon, radius, rx, ry).y
  );
  const z = useTransform([rotX, rotY], ([rx, ry]: number[]) =>
    latLonToPosition(item.lat, item.lon, radius, rx, ry).z
  );

  const opacity = useTransform(z, (zVal) => {
    const t = (zVal + radius) / (2 * radius);
    return Math.max(0.12, Math.pow(t, 0.6));
  });
  const scale = useTransform(z, (zVal) => {
    const t = (zVal + radius) / (2 * radius);
    return 0.5 + t * 0.5;
  });
  const zIndex = useTransform(z, (zVal) =>
    Math.round(((zVal + radius) / (2 * radius)) * 99) + 1
  );
  const blur = useTransform(z, (zVal) => {
    if (zVal > -radius * 0.2) return 0;
    return Math.min(6, Math.abs((zVal + radius * 0.2) / 80));
  });
  const filter = useTransform(blur, (b) =>
    isActive ? "blur(0px)" : `blur(${b.toFixed(2)}px)`
  );
  const rotateY = useTransform(rotY, (ry) => -item.lon - ry);
  const rotateX = useTransform(rotX, (rx) => (item.lat + rx) * 0.3);

  // Avatar gradient walks the palette by card index.
  const avatarT = item.total > 1 ? item.index / (item.total - 1) : 0;
  const ah = Math.round(paletteHue(mode, hue, hue2, avatarT));
  const avatarBg = `linear-gradient(135deg, hsl(${ah} 80% 58%), hsl(${
    (ah + 40) % 360
  } 80% 40%))`;

  const accent = `hsl(${accentHue} 90% 62%)`;

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 w-[240px] cursor-pointer select-none rounded-2xl border p-5 backdrop-blur-md"
      style={{
        x,
        y,
        scale,
        opacity,
        zIndex,
        rotateY,
        rotateX,
        filter,
        marginLeft: "-120px",
        marginTop: "-104px",
        transformStyle: "preserve-3d",
        background: isActive
          ? `hsl(${accentHue} 60% 12% / 0.55)`
          : "rgba(12,14,22,0.45)",
        borderColor: isActive ? `${accent}` : "rgba(255,255,255,0.12)",
        boxShadow: isActive
          ? `0 0 50px hsl(${accentHue} 90% 55% / 0.45), inset 0 0 0 1px ${accent}`
          : "0 18px 40px -20px rgba(0,0,0,0.8)",
      }}
      onClick={onClick}
    >
      <div
        aria-hidden
        className="absolute left-3 top-1 select-none font-serif text-5xl leading-none"
        style={{ color: `hsl(${accentHue} 90% 65% / 0.35)` }}
      >
        &ldquo;
      </div>
      <blockquote className="mb-4 pt-4 text-sm leading-relaxed text-white/85">
        {item.quote}
      </blockquote>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-inner"
          style={{ background: avatarBg }}
        >
          {initials(item.author)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">
            {item.author}
          </div>
          <div className="truncate text-xs text-white/55">{item.role}</div>
        </div>
      </div>
    </motion.div>
  );
}

interface ConnectorProps {
  a: GlobeItem;
  b: GlobeItem;
  radius: number;
  rotX: MotionValue<number>;
  rotY: MotionValue<number>;
  color: string;
}

function Connector({ a, b, radius, rotX, rotY, color }: ConnectorProps) {
  const x1 = useTransform([rotX, rotY], ([rx, ry]: number[]) =>
    latLonToPosition(a.lat, a.lon, radius, rx, ry).x
  );
  const y1 = useTransform([rotX, rotY], ([rx, ry]: number[]) =>
    latLonToPosition(a.lat, a.lon, radius, rx, ry).y
  );
  const x2 = useTransform([rotX, rotY], ([rx, ry]: number[]) =>
    latLonToPosition(b.lat, b.lon, radius, rx, ry).x
  );
  const y2 = useTransform([rotX, rotY], ([rx, ry]: number[]) =>
    latLonToPosition(b.lat, b.lon, radius, rx, ry).y
  );
  const opacity = useTransform([rotX, rotY], ([rx, ry]: number[]) => {
    const za = latLonToPosition(a.lat, a.lon, radius, rx, ry).z;
    const zb = latLonToPosition(b.lat, b.lon, radius, rx, ry).z;
    const t = ((za + zb) / 2 + radius) / (2 * radius);
    return Math.max(0.03, t * 0.45);
  });

  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={1}
      style={{ opacity }}
    />
  );
}

export function TestimonialGlobe({ params }: { params: EffectProps }) {
  const count = Math.round(Number(params.cards ?? 7));
  const spinSpeed = Number(params.spinSpeed ?? 12);
  const spinDir = String(params.spinDir ?? "forward");
  const radius = Number(params.radius ?? 300);
  const autoSpin = Boolean(params.autoSpin ?? true);
  const showLinks = Boolean(params.showLinks ?? true);
  const { mode, hue, hue2 } = readPalette(params);

  const items = useMemo(() => buildItems(count), [count]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const rotationX = useMotionValue(15);
  const rotationY = useMotionValue(0);

  // Rotation state lives in refs so param tweaks never snap the globe.
  const rotXRef = useRef(15);
  const rotYRef = useRef(0);
  const velYRef = useRef(0); // momentum, deg/sec
  const pauseUntilRef = useRef(0);
  const draggingRef = useRef(false);
  const clickTween = useRef({ t: Infinity, dur: 0.6, from: 0, to: 0 });

  const stageRef = useRef<HTMLDivElement>(null);

  const accentHue = Math.round(paletteHue(mode, hue, hue2, 0.5));
  const accent = `hsl(${accentHue} 90% 62%)`;

  const handleCardClick = useCallback(
    (index: number) => {
      const it = items[index];
      if (!it) return;
      const current = rotYRef.current;
      const target = -it.lon;
      let delta = ((target - current) % 360 + 360) % 360;
      if (delta > 180) delta -= 360;
      clickTween.current = {
        t: 0,
        dur: 0.6,
        from: current,
        to: current + delta,
      };
      velYRef.current = 0;
      pauseUntilRef.current = performance.now() + 2500;
    },
    [items]
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let dragStartX = 0;
    let dragStartY = 0;
    let startRotX = 0;
    let startRotY = 0;
    let prevX = 0;
    let prevT = 0;
    const sens = 0.4;

    const down = (clientX: number, clientY: number) => {
      draggingRef.current = true;
      dragStartX = clientX;
      dragStartY = clientY;
      startRotX = rotXRef.current;
      startRotY = rotYRef.current;
      prevX = clientX;
      prevT = performance.now();
      velYRef.current = 0;
      clickTween.current.t = Infinity;
      pauseUntilRef.current = performance.now() + 2500;
    };
    const move = (clientX: number, clientY: number) => {
      if (!draggingRef.current) return;
      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;
      rotYRef.current = startRotY + dx * sens;
      rotXRef.current = Math.max(
        -45,
        Math.min(45, startRotX - dy * sens * 0.3)
      );
      const now = performance.now();
      const dt = Math.max(1, now - prevT) / 1000;
      velYRef.current = ((clientX - prevX) * sens) / dt;
      prevX = clientX;
      prevT = now;
    };
    const up = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (reduce) velYRef.current = 0;
      pauseUntilRef.current = performance.now() + 2500;
    };

    const onMouseDown = (e: MouseEvent) => down(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onMouseUp = () => up();
    const onTouchStart = (e: TouchEvent) =>
      down(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) =>
      move(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => up();

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const ct = clickTween.current;
      if (ct.t < ct.dur) {
        // Click-to-front tween (snaps instantly under reduced motion).
        ct.t += reduce ? ct.dur : dt;
        const p = Math.min(1, ct.t / ct.dur);
        const e = 1 - Math.pow(1 - p, 3);
        rotYRef.current = ct.from + (ct.to - ct.from) * e;
      } else if (draggingRef.current) {
        // Position set directly in the move handler.
      } else if (Math.abs(velYRef.current) > 2) {
        // Drag-release momentum with frame-rate-independent friction.
        rotYRef.current += velYRef.current * dt;
        velYRef.current *= Math.pow(0.94, dt * 60);
        if (Math.abs(velYRef.current) <= 2) velYRef.current = 0;
      } else if (
        autoSpin &&
        !reduce &&
        spinSpeed > 0 &&
        now >= pauseUntilRef.current
      ) {
        const dir = spinDir === "reverse" ? -1 : 1;
        rotYRef.current += spinSpeed * dir * dt;
      }

      rotationY.set(rotYRef.current);
      rotationX.set(rotXRef.current);

      let maxZ = -Infinity;
      let closest = 0;
      for (let i = 0; i < items.length; i++) {
        const wz = worldZ(
          items[i].lat,
          items[i].lon,
          rotXRef.current,
          rotYRef.current,
          radius
        );
        if (wz > maxZ) {
          maxZ = wz;
          closest = i;
        }
      }
      if (closest !== activeIndexRef.current) {
        activeIndexRef.current = closest;
        setActiveIndex(closest);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [items, spinSpeed, spinDir, radius, autoSpin, rotationX, rotationY]);

  const safeActive = Math.min(activeIndex, items.length - 1);
  const lineColor = accent;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#05060a] p-6">
      <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">
          Words That Matter
        </span>
      </div>

      <div
        ref={stageRef}
        className="relative flex w-full flex-1 cursor-grab items-center justify-center select-none active:cursor-grabbing"
        style={{ perspective: "1200px" }}
      >
        {/* Glowing nucleus */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        >
          <div
            className="absolute -inset-24 rounded-full blur-3xl animate-pulse"
            style={{ background: `hsl(${accentHue} 90% 55% / 0.12)` }}
          />
          <div
            className="absolute -inset-12 rounded-full blur-2xl"
            style={{ background: `hsl(${accentHue} 90% 55% / 0.22)` }}
          />
          <div
            className="relative h-8 w-8 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accent} 0%, hsl(${accentHue} 90% 55% / 0.5) 50%, transparent 70%)`,
              boxShadow: `0 0 40px hsl(${accentHue} 90% 55% / 0.6), 0 0 80px hsl(${accentHue} 90% 55% / 0.4)`,
            }}
          >
            <div
              className="absolute inset-0 rounded-full border animate-ping"
              style={{ borderColor: `hsl(${accentHue} 90% 60% / 0.5)` }}
            />
          </div>
        </div>

        {/* Connector lines (centered coordinate space, overflow visible). */}
        {showLinks && (
          <svg
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0"
            width={1}
            height={1}
            style={{ overflow: "visible" }}
          >
            {items.flatMap((a, i) => {
              const n = items.length;
              const offsets = n > 3 ? [1, 2] : [1];
              return offsets
                .map((off) => (i + off) % n)
                .filter((j) => j !== i)
                .map((j) => (
                  <Connector
                    key={`${i}-${j}`}
                    a={a}
                    b={items[j]}
                    radius={radius}
                    rotX={rotationX}
                    rotY={rotationY}
                    color={lineColor}
                  />
                ));
            })}
          </svg>
        )}

        {/* Testimonial cards on the sphere */}
        <div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {items.map((item, index) => (
            <GlobeCard
              key={item.id}
              item={item}
              radius={radius}
              rotX={rotationX}
              rotY={rotationY}
              isActive={index === safeActive}
              accentHue={accentHue}
              mode={mode}
              hue={hue}
              hue2={hue2}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </div>
      </div>

      {/* Nav dots. The active card already shows its own author/role, so we
          don't repeat it in an under-globe caption (that duplicate overlapped
          the front card). */}
      <div className="relative z-10 mt-2 flex flex-col items-center gap-3">
        <div className="flex justify-center gap-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show testimonial from ${item.author}`}
              onClick={() => handleCardClick(index)}
              className="h-2 rounded-full transition-all duration-300 hover:scale-125"
              style={{
                width: index === safeActive ? 24 : 8,
                background:
                  index === safeActive ? accent : "rgba(255,255,255,0.25)",
                boxShadow:
                  index === safeActive
                    ? `0 0 10px hsl(${accentHue} 90% 60% / 0.8)`
                    : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
