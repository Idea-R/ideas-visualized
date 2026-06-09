"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Icosahedron, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const count = Math.round(Number(params.count ?? 9));
  const speed = Number(params.speed ?? 1);
  const distort = Number(params.distort ?? 0.4);

  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const coreColor = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0.5)), [mode, hue, hue2]);
  const lightA = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0)), [mode, hue, hue2]);
  const lightB = useMemo(() => toColor(paletteColor(mode, hue, hue2, 1)), [mode, hue, hue2]);

  const shards = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const t = count > 1 ? i / count : 0;
      const angle = t * Math.PI * 2;
      const radius = 2.4 + (i % 3) * 0.35;
      const tilt = (i % 5) * 0.4;
      return {
        angle,
        radius,
        tilt,
        scale: 0.18 + (i % 4) * 0.06,
        color: toColor(paletteColor(mode, hue, hue2, t)),
        spin: 0.5 + (i % 3) * 0.4,
      };
    });
  }, [count, mode, hue, hue2]);

  const shardRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = groupRef.current;
    if (g) {
      // Autonomous spin; the camera is steered by OrbitControls (scroll/drag).
      g.rotation.y += dt * 0.3 * speed;
    }
    if (coreRef.current) {
      coreRef.current.rotation.x += dt * 0.4 * speed;
      coreRef.current.rotation.z += dt * 0.2 * speed;
    }
    const time = state.clock.elapsedTime;
    shards.forEach((s, i) => {
      const m = shardRefs.current[i];
      if (!m) return;
      const a = s.angle + time * 0.3 * speed;
      m.position.set(
        Math.cos(a) * s.radius,
        Math.sin(a * 0.7 + s.tilt) * 0.8,
        Math.sin(a) * s.radius
      );
      m.rotation.x += dt * s.spin;
      m.rotation.y += dt * s.spin * 0.7;
    });
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 5, 5]} intensity={120} color={lightA} />
      <pointLight position={[-5, -3, -4]} intensity={90} color={lightB} />

      <Icosahedron ref={coreRef} args={[1.3, 4]}>
        <MeshDistortMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={0.45}
          roughness={0.15}
          metalness={0.6}
          distort={distort}
          speed={1.6 * speed}
        />
      </Icosahedron>

      {shards.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            shardRefs.current[i] = el;
          }}
          scale={s.scale}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={s.color}
            emissive={s.color}
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

export function CrystalCore({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 0, 7], fov: 50 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
