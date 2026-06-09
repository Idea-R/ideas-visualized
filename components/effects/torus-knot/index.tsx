"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const knotP = Math.round(Number(params.knotP ?? 2));
  const knotQ = Math.round(Number(params.knotQ ?? 3));
  const thickness = Number(params.thickness ?? 0.25);
  const speed = Number(params.speed ?? 1);

  const groupRef = useRef<THREE.Group>(null);
  const knotRef = useRef<THREE.Mesh>(null);
  const ghostRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightARef = useRef<THREE.PointLight>(null);

  // Rebuild geometry only when the winding/tube params change.
  const geometry = useMemo(
    () => new THREE.TorusKnotGeometry(1, thickness, 220, 32, knotP, knotQ),
    [knotP, knotQ, thickness]
  );
  const ghostGeometry = useMemo(
    () => new THREE.TorusKnotGeometry(1.7, Math.max(0.02, thickness * 0.4), 180, 20, knotP, knotQ),
    [knotP, knotQ, thickness]
  );

  const knotColor = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0.35)), [mode, hue, hue2]);
  const lightA = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0)), [mode, hue, hue2]);
  const lightB = useMemo(() => toColor(paletteColor(mode, hue, hue2, 1)), [mode, hue, hue2]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    const g = groupRef.current;
    if (g) {
      g.rotation.y += dt * 0.35 * speed;
      g.rotation.x += dt * 0.12 * speed;
    }
    if (knotRef.current) {
      knotRef.current.rotation.z += dt * 0.5 * speed;
      // Gentle scale breathing.
      const s = 1 + Math.sin(t * 0.8 * speed) * 0.04;
      knotRef.current.scale.setScalar(s);
    }
    if (ghostRef.current) {
      ghostRef.current.rotation.z -= dt * 0.18 * speed;
      ghostRef.current.rotation.y += dt * 0.05 * speed;
    }
    if (matRef.current) {
      // Pulse the glow so it breathes under the bloom pass.
      matRef.current.emissiveIntensity = 0.7 + Math.sin(t * 1.4 * speed) * 0.35;
      if (mode === "rainbow") {
        matRef.current.emissive.set(toColor(paletteColor(mode, hue, hue2, (t * 0.08) % 1)));
        matRef.current.color.set(matRef.current.emissive);
      }
    }
    if (lightARef.current && mode === "rainbow") {
      lightARef.current.color.set(toColor(paletteColor(mode, hue, hue2, (t * 0.08 + 0.5) % 1)));
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.3} />
      <pointLight ref={lightARef} position={[5, 4, 5]} intensity={120} color={lightA} />
      <pointLight position={[-5, -3, -4]} intensity={95} color={lightB} />

      <mesh ref={ghostRef} geometry={ghostGeometry}>
        <meshStandardMaterial
          color={lightB}
          emissive={lightB}
          emissiveIntensity={0.25}
          roughness={0.4}
          metalness={0.2}
          wireframe
          transparent
          opacity={0.18}
        />
      </mesh>

      <mesh ref={knotRef} geometry={geometry}>
        <meshStandardMaterial
          ref={matRef}
          color={knotColor}
          emissive={knotColor}
          emissiveIntensity={0.8}
          roughness={0.15}
          metalness={0.65}
        />
      </mesh>
    </group>
  );
}

export function TorusKnot({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 0, 6], fov: 55 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
