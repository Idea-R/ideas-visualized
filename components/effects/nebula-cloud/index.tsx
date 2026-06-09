"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

const MAX_POINTS = 20000;
// Number of soft "clumps" the volume is built from — a few blobs read as a
// billowing nebula rather than a uniform box.
const BLOBS = 5;

type NebulaData = {
  positions: Float32Array;
  colors: Float32Array;
  // Per-point base radius from origin (used for the radius-based swirl).
  radii: Float32Array;
  count: number;
};

/** Sum of N uniform randoms → gaussian-ish value centered on 0, range ~[-1,1]. */
function gaussish(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function buildNebula(
  count: number,
  spread: number,
  density: number,
  mode: ReturnType<typeof readPalette>["mode"],
  hue: number,
  hue2: number
): NebulaData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const radii = new Float32Array(count);
  const color = new THREE.Color();

  // Scatter a few blob centers inside the overall volume.
  const centers: [number, number, number][] = [];
  for (let b = 0; b < BLOBS; b++) {
    centers.push([
      gaussish() * spread * 0.55,
      gaussish() * spread * 0.4,
      gaussish() * spread * 0.55,
    ]);
  }

  // Higher density → tighter clumps (points hug their blob center).
  const clump = THREE.MathUtils.lerp(0.55, 0.16, Math.max(0, Math.min(1, density)));

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const b = i % BLOBS;
    const c = centers[b];
    const r = spread * clump;

    const x = c[0] + gaussish() * r;
    const y = c[1] + gaussish() * r * 0.8;
    const z = c[2] + gaussish() * r;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const dist = Math.sqrt(x * x + y * y + z * z);
    radii[i] = dist;

    // Gradient by normalized distance-from-center, nudged by which blob it is.
    const t = Math.min(1, dist / (spread * 1.2)) * 0.7 + (b / BLOBS) * 0.3;
    color.set(toColor(paletteColor(mode, hue, hue2, t)));

    // Per-point brightness jitter for twinkly depth.
    const bright = 0.35 + Math.random() * 0.65;
    colors[i3] = color.r * bright;
    colors[i3 + 1] = color.g * bright;
    colors[i3 + 2] = color.b * bright;
  }

  return { positions, colors, radii, count };
}

function NebulaPoints({
  data,
  pointSize,
  swirl,
}: {
  data: NebulaData;
  pointSize: number;
  swirl: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    return geo;
  }, [data]);

  // Working copies for the per-frame radius-based swirl so the original
  // distribution is never lost to accumulating drift.
  const base = useMemo(() => data.positions.slice(), [data]);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;

    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const radii = data.radii;
    const time = elapsed.current;

    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3;
      const x0 = base[i3];
      const z0 = base[i3 + 2];
      // Inner points swirl faster than outer ones (differential rotation).
      const r = radii[i] + 0.0001;
      const a = (swirl * 0.25 * time) / (0.6 + r * 0.25);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      arr[i3] = x0 * cos - z0 * sin;
      arr[i3 + 2] = x0 * sin + z0 * cos;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={pointSize}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);

  const requested = Math.max(500, Math.round(Number(params.count ?? 9000)));
  const count = Math.min(MAX_POINTS, requested);
  const spread = Math.max(1, Number(params.spread ?? 8));
  const density = Math.max(0, Math.min(1, Number(params.density ?? 0.6)));
  const swirl = Math.max(0, Number(params.swirl ?? 0.6));
  const pointSize = Math.max(0.01, Number(params.pointSize ?? 0.09));

  const groupRef = useRef<THREE.Group>(null);

  const data = useMemo(
    () => buildNebula(count, spread, density, mode, hue, hue2),
    [count, spread, density, mode, hue, hue2]
  );

  const coreColor = useMemo(
    () => toColor(paletteColor(mode, hue, hue2, 0)),
    [mode, hue, hue2]
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = groupRef.current;
    if (!g) return;
    // Slow Y rotation + a gentle breathing scale (sine).
    g.rotation.y += dt * 0.06;
    const t = performance.now() * 0.0004;
    const breathe = 1 + Math.sin(t) * 0.04;
    g.scale.setScalar(breathe);
  });

  return (
    <group ref={groupRef}>
      <NebulaPoints data={data} pointSize={pointSize} swirl={swirl} />

      {/* A few brighter core points near the heart of the nebula. */}
      <points>
        <sphereGeometry args={[spread * 0.12, 12, 12]} />
        <pointsMaterial
          size={pointSize * 2.2}
          sizeAttenuation
          color={coreColor}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

export function NebulaCloud({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 0, 9], fov: 60 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
