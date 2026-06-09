"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

const SIZE = 12;

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const segments = Math.max(40, Math.min(150, Math.round(Number(params.segments ?? 110))));
  const amplitude = Number(params.amplitude ?? 1);
  const frequency = Number(params.frequency ?? 1);
  const speed = Number(params.speed ?? 1);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef<THREE.Mesh>(null);

  // Smoothed pointer-driven ripple center (in the plane's local XY space).
  const ripple = useRef({ x: 0, y: 0 });

  // Precompute geometry + base grid keyed on segments. PlaneGeometry is built
  // in XY; we displace Z (the height before the flat rotation) per frame.
  const { geometry, baseXY, colorAttr } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, segments, segments);
    const pos = geo.attributes.position;
    const xy = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      xy[i * 2] = pos.getX(i);
      xy[i * 2 + 1] = pos.getY(i);
    }
    const colors = new Float32Array(pos.count * 3);
    const ca = new THREE.BufferAttribute(colors, 3);
    geo.setAttribute("color", ca);
    return { geometry: geo, baseXY: xy, colorAttr: ca };
  }, [segments]);

  // Palette gradient swatches (low → high) precomputed and sampled per frame.
  const grad = useMemo(() => {
    const stops = 24;
    const arr: THREE.Color[] = [];
    for (let i = 0; i < stops; i++) {
      arr.push(toColor(paletteColor(mode, hue, hue2, i / (stops - 1))));
    }
    return arr;
  }, [mode, hue, hue2]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime * speed;

    // Ease the ripple center toward the pointer (mapped into plane space).
    const px = state.pointer.x;
    const py = state.pointer.y;
    ripple.current.x += (px * (SIZE * 0.5) - ripple.current.x) * 0.06;
    ripple.current.y += (-py * (SIZE * 0.5) - ripple.current.y) * 0.06;

    const g = groupRef.current;
    if (g) {
      // Autonomous drift; the camera is steered by OrbitControls (scroll/drag).
      // The cursor still sculpts the surface ripple below.
      g.rotation.y += dt * 0.12 * speed;
    }

    const pos = geometry.attributes.position;
    const stops = grad.length;
    const ampReach = Math.max(0.0001, amplitude);
    for (let i = 0; i < pos.count; i++) {
      const x = baseXY[i * 2];
      const y = baseXY[i * 2 + 1];

      // Layered sine/cos waves for the rolling terrain.
      let h =
        Math.sin(x * frequency * 0.6 + t) +
        Math.cos(y * frequency * 0.6 + t * 0.9) +
        0.5 * Math.sin((x + y) * frequency * 0.4 + t * 1.3);

      // Pointer-driven gaussian bump that bulges the surface upward.
      const dx = x - ripple.current.x;
      const dy = y - ripple.current.y;
      const d2 = dx * dx + dy * dy;
      h += 2.2 * Math.exp(-d2 / 6);

      const z = h * amplitude;
      pos.setZ(i, z);

      // Color by normalized height. Wave range ≈ ±2.5 plus bump.
      const f = Math.max(0, Math.min(1, (z / (ampReach * 5)) + 0.5));
      const c = grad[Math.min(stops - 1, Math.max(0, Math.round(f * (stops - 1))))];
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group ref={groupRef} rotation={[0.05, 0, 0]}>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 8, 6]} intensity={60} color={grad[grad.length - 1]} />

      {/* Faint filled surface underneath the wireframe. */}
      <mesh ref={fillRef} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing wireframe terrain. */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          wireframe
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function WaveGrid3D({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 5, 9], fov: 55 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
