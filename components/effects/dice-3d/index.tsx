"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

type DiceType = "d6" | "d8" | "d20";

const BASE_R = 0.9;

/** Build the polyhedron geometry for a dice type, sized to a common radius. */
function buildGeometry(type: DiceType): THREE.BufferGeometry {
  switch (type) {
    case "d6":
      return new THREE.BoxGeometry(BASE_R * 1.35, BASE_R * 1.35, BASE_R * 1.35);
    case "d8":
      return new THREE.OctahedronGeometry(BASE_R);
    case "d20":
      return new THREE.IcosahedronGeometry(BASE_R);
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

/** Kinematic per-die tumble state (no physics). */
interface Die {
  axis: THREE.Vector3; // fixed tumble axis (off-cardinal => reads as a tumble)
  rate: number; // base angular speed (rad/s)
  boost: number; // decaying reroll impulse multiplier
  rest: THREE.Quaternion; // resting orientation to settle into after a reroll
  settle: number; // 0 = free tumble, ramps to 1 to lock onto `rest`
  rerolling: boolean;
}

function makeDie(): Die {
  return {
    axis: new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize(),
    rate: 0.4 + Math.random() * 0.7,
    boost: 0,
    rest: new THREE.Quaternion(),
    settle: 0,
    rerolling: false,
  };
}

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const diceType = String(params.diceType ?? "d20") as DiceType;
  const count = Math.min(6, Math.max(1, Math.round(Number(params.count ?? 3))));
  const spinSpeed = Number(params.spinSpeed ?? 1);
  const spinDir = String(params.spinDir ?? "forward") === "reverse" ? -1 : 1;
  const metalness = Number(params.metalness ?? 0.6);

  const gl = useThree((s) => s.gl);

  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  const geometry = useMemo(() => buildGeometry(diceType), [diceType]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry]);

  // Release GPU buffers when geometry is swapped (dice type change) or unmount.
  useEffect(() => {
    return () => {
      geometry.dispose();
      edges.dispose();
    };
  }, [geometry, edges]);

  // Per-die simulation state, rebuilt when the number of dice changes.
  const dice = useMemo(
    () => Array.from({ length: count }, () => makeDie()),
    [count]
  );

  // Ring layout keeps every die in frame as the count grows.
  const layout = useMemo(() => {
    const radius = count === 1 ? 0 : 1.05 + count * 0.3;
    const scale = count <= 2 ? 1 : count <= 4 ? 0.82 : 0.66;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      return {
        position: [Math.cos(a) * radius, Math.sin(a) * radius, 0] as [
          number,
          number,
          number
        ],
        scale,
      };
    });
  }, [count]);

  const bodyColors = useMemo(
    () =>
      dice.map((_, i) =>
        toColor(paletteColor(mode, hue, hue2, count > 1 ? i / count : 0.35, 70, 58))
      ),
    [dice, mode, hue, hue2, count]
  );
  const edgeColors = useMemo(
    () =>
      dice.map((_, i) =>
        toColor(paletteColor(mode, hue, hue2, count > 1 ? i / count : 0.35, 100, 70))
      ),
    [dice, mode, hue, hue2, count]
  );
  const lightA = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0)), [mode, hue, hue2]);
  const lightB = useMemo(() => toColor(paletteColor(mode, hue, hue2, 1)), [mode, hue, hue2]);

  // Click anywhere on the canvas to reroll: each die gets a fast spin impulse
  // and a fresh random resting orientation to settle into.
  useEffect(() => {
    const el = gl.domElement;
    const reroll = () => {
      const e = new THREE.Euler();
      for (const d of dice) {
        d.boost = 5 + Math.random() * 5;
        d.settle = 0;
        d.rerolling = true;
        e.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );
        d.rest.setFromEuler(e);
      }
    };
    el.addEventListener("click", reroll);
    return () => el.removeEventListener("click", reroll);
  }, [gl, dice]);

  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    dice.forEach((d, i) => {
      const g = groupRefs.current[i];
      if (!g) return;

      // Decay the reroll impulse, and grow the settle pull while rerolling.
      d.boost = Math.max(0, d.boost - d.boost * dt * 2.2);
      if (d.rerolling) d.settle = Math.min(1, d.settle + dt * 0.7);

      // Free tumble fades out as the die settles; the impulse spins it fast.
      const free = d.rerolling ? Math.max(0, 1 - d.settle) : 1;
      const ang = d.rate * spinSpeed * spinDir * (1 + d.boost) * dt * free;
      tmpQuat.setFromAxisAngle(d.axis, ang);
      g.quaternion.multiply(tmpQuat);

      if (d.rerolling) {
        g.quaternion.slerp(d.rest, Math.min(1, d.settle * dt * 5));
        if (d.settle >= 1 && d.boost < 0.01) {
          d.rerolling = false;
          d.settle = 0;
        }
      }

      const m = matRefs.current[i];
      if (m) m.emissiveIntensity = 0.3 + Math.sin(t * 1.6 + i) * 0.12;
    });
  });

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 6]} intensity={120} color={lightA} />
      <pointLight position={[-5, -3, -4]} intensity={85} color={lightB} />
      <directionalLight position={[0, 4, 4]} intensity={0.6} />

      {layout.map((l, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          position={l.position}
          scale={l.scale}
        >
          <mesh geometry={geometry}>
            <meshStandardMaterial
              ref={(el) => {
                matRefs.current[i] = el;
              }}
              color={bodyColors[i]}
              emissive={bodyColors[i]}
              emissiveIntensity={0.3}
              metalness={metalness}
              roughness={0.22}
            />
          </mesh>
          <lineSegments geometry={edges}>
            <lineBasicMaterial color={edgeColors[i]} transparent opacity={0.55} />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}

export function Dice3D({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 0, 7.5], fov: 50 }} bloomIntensity={0.8}>
      <Scene params={params} />
    </Stage3D>
  );
}
