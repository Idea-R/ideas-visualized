"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

const HELIX_HEIGHT = 6;
const SPHERE_RADIUS = 0.12;
const RUNG_THICKNESS = 0.028;

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);

  const pairs = Math.max(2, Math.round(Number(params.pairs ?? 36)));
  const radius = Math.max(0.1, Number(params.radius ?? 1.4));
  const turns = Math.max(0.5, Number(params.turns ?? 4));
  const speed = Number(params.speed ?? 1);

  const groupRef = useRef<THREE.Group>(null);
  const strandARef = useRef<THREE.InstancedMesh>(null);
  const strandBRef = useRef<THREE.InstancedMesh>(null);
  const rungRef = useRef<THREE.InstancedMesh>(null);

  const lightColor = useMemo(
    () => toColor(paletteColor(mode, hue, hue2, 0.5)),
    [mode, hue, hue2]
  );

  useLayoutEffect(() => {
    const strandA = strandARef.current;
    const strandB = strandBRef.current;
    const rungs = rungRef.current;
    if (!strandA || !strandB || !rungs) return;

    const dummy = new THREE.Object3D();
    const colorA = new THREE.Color();
    const colorB = new THREE.Color();
    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion();

    for (let i = 0; i < pairs; i++) {
      const t = pairs > 1 ? i / (pairs - 1) : 0;
      const y = (t - 0.5) * HELIX_HEIGHT;
      const angle = t * turns * Math.PI * 2;

      posA.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      posB.set(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);

      // Strand A sphere.
      dummy.position.copy(posA);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      strandA.setMatrixAt(i, dummy.matrix);
      colorA.set(toColor(paletteColor(mode, hue, hue2, t)));
      strandA.setColorAt(i, colorA);

      // Strand B sphere (offset along length for a richer gradient).
      dummy.position.copy(posB);
      dummy.updateMatrix();
      strandB.setMatrixAt(i, dummy.matrix);
      const tB = (t + 0.5) % 1;
      colorB.set(toColor(paletteColor(mode, hue, hue2, tB)));
      strandB.setColorAt(i, colorB);

      // Rung connecting the two strands (base pair).
      dir.subVectors(posB, posA);
      const length = dir.length();
      dir.normalize();
      quat.setFromUnitVectors(up, dir);
      dummy.position.set(0, y, 0);
      dummy.quaternion.copy(quat);
      dummy.scale.set(1, length, 1);
      dummy.updateMatrix();
      rungs.setMatrixAt(i, dummy.matrix);
      colorA.lerpColors(
        toColor(paletteColor(mode, hue, hue2, t)),
        toColor(paletteColor(mode, hue, hue2, tB)),
        0.5
      );
      rungs.setColorAt(i, colorA);
    }

    // Reset the rotation/scale used by spheres above.
    dummy.quaternion.identity();
    dummy.scale.setScalar(1);

    strandA.instanceMatrix.needsUpdate = true;
    strandB.instanceMatrix.needsUpdate = true;
    rungs.instanceMatrix.needsUpdate = true;
    if (strandA.instanceColor) strandA.instanceColor.needsUpdate = true;
    if (strandB.instanceColor) strandB.instanceColor.needsUpdate = true;
    if (rungs.instanceColor) rungs.instanceColor.needsUpdate = true;
  }, [pairs, radius, turns, mode, hue, hue2]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = groupRef.current;
    if (!g) return;
    // Cheap whole-group rotation + gentle vertical drift; matrices stay static.
    g.rotation.y += dt * 0.5 * speed;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.4 * speed) * 0.25;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 6]} intensity={80} color={lightColor} />

      <instancedMesh
        ref={strandARef}
        args={[undefined, undefined, pairs]}
        frustumCulled={false}
      >
        <sphereGeometry args={[SPHERE_RADIUS, 16, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={strandBRef}
        args={[undefined, undefined, pairs]}
        frustumCulled={false}
      >
        <sphereGeometry args={[SPHERE_RADIUS, 16, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={rungRef}
        args={[undefined, undefined, pairs]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[RUNG_THICKNESS, RUNG_THICKNESS, 1, 8]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.85} />
      </instancedMesh>
    </group>
  );
}

export function DnaHelix({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 0, 9], fov: 55 }}>
      <Scene params={params} />
    </Stage3D>
  );
}
