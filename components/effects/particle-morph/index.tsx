"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

const MAX_COUNT = 12000;
const MIN_COUNT = 1000;
const SHAPE_COUNT = 4; // sphere, cube, torus, cone

/** All target shapes share a scale so morphs read as a single object reforming. */
const SHAPE_RADIUS = 2.6;

type Targets = {
  /** SHAPE_COUNT Float32Arrays, each length count*3. */
  shapes: Float32Array[];
  /** Per-particle palette colors, length count*3. */
  colors: Float32Array;
  /** Per-particle swirl phase, length count. */
  phase: Float32Array;
  count: number;
};

function buildTargets(
  count: number,
  mode: ReturnType<typeof readPalette>["mode"],
  hue: number,
  hue2: number
): Targets {
  const sphere = new Float32Array(count * 3);
  const cube = new Float32Array(count * 3);
  const torus = new Float32Array(count * 3);
  const cone = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phase = new Float32Array(count);

  const color = new THREE.Color();
  const golden = Math.PI * (3 - Math.sqrt(5));

  // Torus params.
  const R = SHAPE_RADIUS * 0.72; // ring radius
  const r = SHAPE_RADIUS * 0.3; // tube radius
  // Cone params.
  const coneH = SHAPE_RADIUS * 1.9;
  const coneR = SHAPE_RADIUS * 0.95;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = i / Math.max(1, count - 1);

    // --- SPHERE (fibonacci sphere) ---
    const y = 1 - (i / Math.max(1, count - 1)) * 2; // 1..-1
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    sphere[i3] = Math.cos(theta) * radius * SHAPE_RADIUS;
    sphere[i3 + 1] = y * SHAPE_RADIUS;
    sphere[i3 + 2] = Math.sin(theta) * radius * SHAPE_RADIUS;

    // --- CUBE (random point on the surface of a cube) ---
    const half = SHAPE_RADIUS;
    const u = Math.random() * 2 - 1;
    const v = Math.random() * 2 - 1;
    const face = Math.floor(Math.random() * 6);
    let cx = 0;
    let cy = 0;
    let cz = 0;
    switch (face) {
      case 0: cx = half; cy = u * half; cz = v * half; break;
      case 1: cx = -half; cy = u * half; cz = v * half; break;
      case 2: cy = half; cx = u * half; cz = v * half; break;
      case 3: cy = -half; cx = u * half; cz = v * half; break;
      case 4: cz = half; cx = u * half; cy = v * half; break;
      default: cz = -half; cx = u * half; cy = v * half; break;
    }
    cube[i3] = cx;
    cube[i3 + 1] = cy;
    cube[i3 + 2] = cz;

    // --- TORUS (parametric) ---
    const a = golden * i; // around the ring
    const b = golden * i * 2.0; // around the tube
    torus[i3] = (R + r * Math.cos(b)) * Math.cos(a);
    torus[i3 + 1] = r * Math.sin(b);
    torus[i3 + 2] = (R + r * Math.cos(b)) * Math.sin(a);

    // --- CONE / PYRAMID ---
    // h in [0,1] from apex(top) to base(bottom); radius grows toward base.
    const h = Math.random();
    const ringR = coneR * h;
    const ang = Math.random() * Math.PI * 2;
    cone[i3] = Math.cos(ang) * ringR;
    cone[i3 + 1] = coneH * (0.5 - h); // apex up, base down
    cone[i3 + 2] = Math.sin(ang) * ringR;

    // --- Color (by index factor) ---
    color.set(toColor(paletteColor(mode, hue, hue2, t)));
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    phase[i] = Math.random() * Math.PI * 2;
  }

  return { shapes: [sphere, cube, torus, cone], colors, phase, count };
}

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);

  const requested = Math.round(Number(params.count ?? 6000));
  const count = Math.min(
    MAX_COUNT,
    Math.max(MIN_COUNT, Number.isFinite(requested) ? requested : 6000)
  );
  const morphSpeed = Math.max(0.05, Number(params.morphSpeed ?? 1));
  const autoMorph = params.autoMorph !== false;
  const pointSize = Math.max(0.005, Number(params.pointSize ?? 0.06));

  const targets = useMemo(
    () => buildTargets(count, mode, hue, hue2),
    [count, mode, hue, hue2]
  );

  // Live position buffer (starts on the sphere).
  const live = useMemo(() => Float32Array.from(targets.shapes[0]), [targets]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(live, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(targets.colors, 3));
    return geo;
  }, [live, targets]);

  const groupRef = useRef<THREE.Group>(null);

  // Morph state lives in a ref so it survives re-renders without re-triggering.
  const morph = useRef({
    from: 0,
    to: 1,
    progress: 0, // 0..1 between from->to
    hold: 0, // seconds remaining in the settle hold
    settled: false,
    pending: false, // a click requested an immediate advance
  });

  const advance = () => {
    const m = morph.current;
    // Snap current interpolation to the destination, then queue the next shape.
    m.from = m.to;
    m.to = (m.to + 1) % SHAPE_COUNT;
    m.progress = 0;
    m.hold = 0;
    m.settled = false;
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const m = morph.current;
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const fromArr = targets.shapes[m.from];
    const toArr = targets.shapes[m.to];

    if (!m.settled) {
      m.progress = Math.min(1, m.progress + dt * morphSpeed * 0.6);
      // Smoothstep easing for a soft arrival.
      const p = m.progress;
      const ease = p * p * (3 - 2 * p);

      const time = performance.now() * 0.001;
      for (let i = 0; i < targets.count; i++) {
        const i3 = i * 3;
        const ph = targets.phase[i];
        // Subtle per-particle noise that fades as we settle.
        const wobble = (1 - ease) * 0.18;
        const nx = Math.sin(time * 1.7 + ph) * wobble;
        const ny = Math.cos(time * 1.5 + ph * 1.3) * wobble;
        const nz = Math.sin(time * 1.9 + ph * 0.7) * wobble;
        arr[i3] = fromArr[i3] + (toArr[i3] - fromArr[i3]) * ease + nx;
        arr[i3 + 1] =
          fromArr[i3 + 1] + (toArr[i3 + 1] - fromArr[i3 + 1]) * ease + ny;
        arr[i3 + 2] =
          fromArr[i3 + 2] + (toArr[i3 + 2] - fromArr[i3 + 2]) * ease + nz;
      }
      posAttr.needsUpdate = true;

      if (m.progress >= 1) {
        m.settled = true;
        m.hold = 0.8; // brief hold once a shape is fully formed
      }
    } else {
      // Settled: gentle idle wobble around the target so it stays alive.
      const time = performance.now() * 0.001;
      for (let i = 0; i < targets.count; i++) {
        const i3 = i * 3;
        const ph = targets.phase[i];
        const w = 0.025;
        arr[i3] = toArr[i3] + Math.sin(time * 1.2 + ph) * w;
        arr[i3 + 1] = toArr[i3 + 1] + Math.cos(time * 1.1 + ph * 1.3) * w;
        arr[i3 + 2] = toArr[i3 + 2] + Math.sin(time * 1.3 + ph * 0.7) * w;
      }
      posAttr.needsUpdate = true;

      if (m.pending) {
        m.pending = false;
        advance();
      } else if (autoMorph) {
        m.hold -= dt;
        if (m.hold <= 0) advance();
      }
    }

    // Idle swirl: slow Y rotation of the whole cloud.
    const g = groupRef.current;
    if (g) g.rotation.y += dt * 0.12;
  });

  const handleClick = () => {
    const m = morph.current;
    if (m.settled) advance();
    else m.pending = true; // advance as soon as the current morph finishes
  };

  return (
    <group ref={groupRef}>
      <points geometry={geometry} onPointerDown={handleClick}>
        <pointsMaterial
          size={pointSize}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* Invisible catcher so clicks anywhere in the scene advance the morph. */}
      <mesh onPointerDown={handleClick}>
        <sphereGeometry args={[40, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function ParticleMorph({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 0, 7], fov: 50 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
