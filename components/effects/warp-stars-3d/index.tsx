"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

const FAR = 60; // depth of the star volume (stars spawn this far ahead)
const SPREAD = 22; // half-width of the field across X/Y
const BASE_FOV = 70;
const WARP_FOV = 88;

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const count = Math.min(6000, Math.max(1, Math.round(Number(params.count ?? 2500))));
  const cruise = Number(params.cruise ?? 1);
  const warpBoost = Number(params.warpBoost ?? 3);
  const streak = Number(params.streak ?? 0.5);

  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const linesRef = useRef<THREE.LineSegments>(null);
  const warpRef = useRef(0); // eased 0..1 hyperdrive level
  const targetRef = useRef(0); // 1 while pointer held, else 0

  // Pointer-down hyperdrive: listen on the canvas DOM element so click-and-hold
  // ramps the warp target, releasing eases it back to cruise.
  useEffect(() => {
    const el = gl.domElement;
    const down = () => {
      targetRef.current = 1;
    };
    const up = () => {
      targetRef.current = 0;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  // Per-star simulation state + geometry buffers (2 vertices per star).
  const sim = useMemo(() => {
    const positions = new Float32Array(count * 2 * 3);
    const colors = new Float32Array(count * 2 * 3);
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const z = new Float32Array(count);
    const vel = new Float32Array(count); // per-star velocity factor

    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      x[i] = (Math.random() * 2 - 1) * SPREAD;
      y[i] = (Math.random() * 2 - 1) * SPREAD;
      z[i] = -Math.random() * FAR; // negative Z = ahead of camera (looking down -Z)
      vel[i] = 0.6 + Math.random() * 0.8;

      const t = count > 1 ? i / count : 0;
      c.copy(toColor(paletteColor(mode, hue, hue2, t)));
      const o = i * 2 * 3;
      // head
      colors[o] = c.r;
      colors[o + 1] = c.g;
      colors[o + 2] = c.b;
      // tail
      colors[o + 3] = c.r;
      colors[o + 4] = c.g;
      colors[o + 5] = c.b;
    }
    return { positions, colors, x, y, z, vel };
  }, [count, mode, hue, hue2]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(sim.positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(sim.colors, 3));
    return g;
  }, [sim]);

  // Dispose GPU geometry when it is replaced (count/palette change) or unmount.
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const lines = linesRef.current;
    if (!lines) return;

    // Ease the warp level toward its target (snappier ramp up, gentle release).
    const target = targetRef.current;
    const ease = target > warpRef.current ? 3.5 : 2.2;
    warpRef.current += (target - warpRef.current) * Math.min(1, dt * ease);
    const warp = warpRef.current;

    // Speed blends from cruise up to cruise * warpBoost at full hold.
    const speed = cruise * (1 + warp * (warpBoost - 1)) * 14;
    // Streak length grows with both base streak and current warp.
    const streakBase = 0.25 + streak * 3.5;
    const streakLen = streakBase * (0.4 + warp * 4.5);

    // Widen FOV under warp for a "punch" feel.
    const cam = camera as THREE.PerspectiveCamera;
    const wantFov = BASE_FOV + (WARP_FOV - BASE_FOV) * warp;
    if (Math.abs(cam.fov - wantFov) > 0.01) {
      cam.fov = wantFov;
      cam.updateProjectionMatrix();
    }

    // Subtle pointer steering for parallax (flight direction sway).
    const steerX = state.pointer.x * 4;
    const steerY = state.pointer.y * 4;

    const pos = sim.positions;
    const { x, y, z, vel } = sim;

    for (let i = 0; i < count; i++) {
      // Advance toward the camera (z increases toward 0 from negative).
      z[i] += speed * vel[i] * dt;

      // Respawn behind the field once the star passes the camera.
      if (z[i] > 1) {
        x[i] = (Math.random() * 2 - 1) * SPREAD;
        y[i] = (Math.random() * 2 - 1) * SPREAD;
        z[i] = -FAR;
        vel[i] = 0.6 + Math.random() * 0.8;
      }

      // Parallax: nearer stars sway more with the pointer.
      const depth = 1 - Math.min(1, -z[i] / FAR); // ~1 near camera, ~0 far
      const hx = x[i] + steerX * depth;
      const hy = y[i] + steerY * depth;

      // Tail trails behind the head along travel (-Z) by the streak length.
      const tail = streakLen * vel[i];
      const o = i * 2 * 3;
      // head
      pos[o] = hx;
      pos[o + 1] = hy;
      pos[o + 2] = z[i];
      // tail
      pos[o + 3] = hx;
      pos[o + 4] = hy;
      pos[o + 5] = z[i] - tail;
    }

    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

export function WarpStars3D({ params }: { params: EffectProps }) {
  return (
    <Stage3D camera={{ position: [0, 0, 0], fov: BASE_FOV }} orbit={false} zoom={false} pan={false}>
      <Scene params={params} />
    </Stage3D>
  );
}
