"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

const MAX_STARS = 20000;
// Wireframe shapes are far heavier than point sprites (real geometry per star),
// so cap the instance count to keep the orbit smooth even with bloom.
const MAX_SHAPES = 6000;

type StarData = {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
};

function buildStars(
  count: number,
  arms: number,
  spin: number,
  spread: number,
  mode: ReturnType<typeof readPalette>["mode"],
  hue: number,
  hue2: number
): StarData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const radiusMax = 5;
  const branchStep = (Math.PI * 2) / arms;
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 1.5);
    const radius = t * radiusMax;
    const branchAngle = (i % arms) * branchStep;
    const spinAngle = radius * spin * 0.9;
    const scatter = spread * radius * 0.6;
    const randX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * scatter;
    const randY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * scatter * 0.5;
    const randZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * scatter;

    const angle = branchAngle + spinAngle;
    positions[i3] = Math.cos(angle) * radius + randX;
    positions[i3 + 1] = randY;
    positions[i3 + 2] = Math.sin(angle) * radius + randZ;

    color.set(toColor(paletteColor(mode, hue, hue2, t)));
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }
  return { positions, colors, count };
}

/** A point-sprite galaxy (the classic, lightest look). */
function PointsGalaxy({ data }: { data: StarData }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    return geo;
  }, [data]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.045}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** A galaxy whose stars are little 3D wireframe shapes (instanced). */
function ShapeGalaxy({
  data,
  geometry,
  size,
}: {
  data: StarData;
  geometry: THREE.BufferGeometry;
  size: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3;
      dummy.position.set(
        data.positions[i3],
        data.positions[i3 + 1],
        data.positions[i3 + 2]
      );
      // Per-shape random orientation + slight size variance for a lively swarm.
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      const s = size * (0.6 + Math.random() * 0.8);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      c.setRGB(data.colors[i3], data.colors[i3 + 1], data.colors[i3 + 2]);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, geometry, size]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, data.count]}
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

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const shape = String(params.shape ?? "points");
  const isPoints = shape === "points";

  const requested = Math.max(100, Math.round(Number(params.count ?? 12000)));
  const count = Math.min(isPoints ? MAX_STARS : MAX_SHAPES, requested);
  const arms = Math.max(2, Math.round(Number(params.arms ?? 4)));
  const spin = Number(params.spin ?? 1);
  const spread = Math.max(0, Number(params.spread ?? 0.4));
  const size = Number(params.shapeSize ?? 1) * 0.09;

  const groupRef = useRef<THREE.Group>(null);

  const data = useMemo(
    () => buildStars(count, arms, spin, spread, mode, hue, hue2),
    [count, arms, spin, spread, mode, hue, hue2]
  );

  // The geometry for non-point shapes. Keyed on shape so switching rebuilds it.
  const shapeGeometry = useMemo(() => {
    switch (shape) {
      case "cube":
        return new THREE.BoxGeometry(1, 1, 1);
      case "octahedron":
        return new THREE.OctahedronGeometry(0.8, 0);
      case "tetrahedron":
        return new THREE.TetrahedronGeometry(0.9, 0);
      case "icosahedron":
        return new THREE.IcosahedronGeometry(0.8, 0);
      default:
        return null;
    }
  }, [shape]);

  const coreColor = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0)), [mode, hue, hue2]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y += dt * 0.15 * spin;
  });

  return (
    <group ref={groupRef} rotation={[0.35, 0, 0]}>
      {isPoints || !shapeGeometry ? (
        <PointsGalaxy data={data} />
      ) : (
        <ShapeGalaxy data={data} geometry={shapeGeometry} size={size} />
      )}

      {/* A faint bright core sells the galactic bulge. */}
      <points>
        <sphereGeometry args={[0.25, 24, 24]} />
        <pointsMaterial
          size={0.06}
          sizeAttenuation
          color={coreColor}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export function GalaxySpiral({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 4, 8], fov: 55 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
