"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

// Wireframe shapes carry real geometry per instance, so keep the funnel capped
// to stay smooth with orbit + bloom. The control maxes at 600 anyway.
const MAX_SHAPES = 600;

// Mixed mode cycles these three geometries across the funnel.
const KINDS = ["icosahedron", "octahedron", "tetrahedron"] as const;
type Kind = (typeof KINDS)[number];

type ShapeItem = {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  phase: number;
  baseScale: number;
  color: THREE.Color;
};

function makeGeometry(kind: string): THREE.BufferGeometry {
  switch (kind) {
    case "octahedron":
      return new THREE.OctahedronGeometry(0.55, 0);
    case "tetrahedron":
      return new THREE.TetrahedronGeometry(0.6, 0);
    case "icosahedron":
    default:
      return new THREE.IcosahedronGeometry(0.5, 0);
  }
}

/**
 * Lay shapes out on a downward funnel/tree silhouette: wide at the bottom,
 * pinched at the top, spiralling around Y by `twist`.
 */
function buildFunnel(
  count: number,
  shape: string,
  twist: number,
  taper: number,
  spreadWidth: number,
  contract: number,
  mode: ReturnType<typeof readPalette>["mode"],
  hue: number,
  hue2: number
): Record<string, ShapeItem[]> {
  const mixed = shape === "mixed";
  const buckets: Record<string, ShapeItem[]> = {};

  for (let i = 0; i < count; i++) {
    const t = count > 0 ? (i % count) / count : 0; // 0 at top → 1 at bottom
    const rand = Math.random();

    // taper maps to a sensible height (a few units): with default 14 the tree
    // descends from y≈7 to y≈0.
    const y = 7 - t * taper * 0.5;
    const baseRadius = 0.3 + t * spreadWidth + rand * 0.6;
    const radius = baseRadius * (1 - contract * 0.5);
    const baseAngle = t * Math.PI * twist + rand * Math.PI * 0.8;

    const item: ShapeItem = {
      x: Math.cos(baseAngle) * radius,
      y,
      z: Math.sin(baseAngle) * radius,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      spinX: (Math.random() - 0.5) * 0.8,
      spinY: (Math.random() - 0.5) * 0.8,
      spinZ: (Math.random() - 0.5) * 0.8,
      phase: Math.random() * Math.PI * 2,
      baseScale: 0.2 + rand * 0.2,
      color: toColor(paletteColor(mode, hue, hue2, t)),
    };

    const kind: string = mixed ? KINDS[i % 3] : shape;
    (buckets[kind] ??= []).push(item);
  }

  return buckets;
}

/** One instanced wireframe geometry's worth of funnel shapes. */
function FunnelMesh({
  items,
  geometry,
}: {
  items: ShapeItem[];
  geometry: THREE.BufferGeometry;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
      dummy.scale.setScalar(it.baseScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, it.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, dummy]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    const time = timeRef.current;
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(
        it.rotX + it.spinX * time,
        it.rotY + it.spinY * time,
        it.rotZ + it.spinZ * time
      );
      const s = it.baseScale * (1 + 0.15 * Math.sin(time * 1.5 + it.phase));
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, items.length]}
      frustumCulled={false}
    >
      <meshBasicMaterial
        wireframe
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/** A glowing star/dodecahedron crown for the top of the tree. */
function StarTopper({ color }: { color: THREE.Color }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (ref.current) ref.current.rotation.y += dt * 0.6;
  });

  return (
    <group position={[0, 7.5, 0]}>
      <mesh ref={ref}>
        <dodecahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial
          wireframe
          color={color}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* Soft additive halo so bloom blooms a bright topper. */}
      <points>
        <sphereGeometry args={[0.32, 16, 16]} />
        <pointsMaterial
          size={0.12}
          sizeAttenuation
          color={color}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const shape = String(params.shape ?? "mixed");

  const requested = Math.max(20, Math.round(Number(params.count ?? 360)));
  const count = Math.min(MAX_SHAPES, requested);
  const spin = Number(params.spin ?? 0.5);
  const twist = Number(params.twist ?? 10);
  const taper = Number(params.taper ?? 14);
  const spreadWidth = Number(params.spreadWidth ?? 6);
  const contract = Math.max(0, Math.min(1, Number(params.contract ?? 0)));
  const starTopper = params.starTopper !== false;

  const groupRef = useRef<THREE.Group>(null);

  const buckets = useMemo(
    () =>
      buildFunnel(
        count,
        shape,
        twist,
        taper,
        spreadWidth,
        contract,
        mode,
        hue,
        hue2
      ),
    [count, shape, twist, taper, spreadWidth, contract, mode, hue, hue2]
  );

  const meshes = useMemo(
    () =>
      Object.entries(buckets).map(([kind, items]) => ({
        key: kind,
        items,
        geometry: makeGeometry(kind),
      })),
    [buckets]
  );

  const topColor = useMemo(
    () => toColor(paletteColor(mode, hue, hue2, 0)),
    [mode, hue, hue2]
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y += dt * spin;
  });

  return (
    <group ref={groupRef}>
      {meshes.map((m) => (
        <FunnelMesh key={m.key} items={m.items} geometry={m.geometry} />
      ))}
      {starTopper && <StarTopper color={topColor} />}
    </group>
  );
}

export function VortexTree({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 2, 18], fov: 55 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
