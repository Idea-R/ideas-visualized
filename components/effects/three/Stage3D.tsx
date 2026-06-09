"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

/**
 * Shared scaffold for true-WebGL (React Three Fiber) effects.
 *
 * - Defers the <Canvas> to the client (avoids SSR/hydration churn).
 * - Pauses the render loop while off-screen via IntersectionObserver, matching
 *   the Canvas-2D effects' battery-friendly behaviour.
 * - Fills its parent (the EffectDetail stage is `h-full w-full`).
 * - Adds scroll-to-zoom + drag-to-orbit camera control by default, so every
 *   3D effect can be explored in depth. Effects that need raw pointer input
 *   (e.g. click-and-hold) can opt out with `orbit={false}`.
 *
 * Pointer is available to scenes through R3F's built-in `state.pointer`
 * (normalized -1..1), so individual effects don't need custom listeners.
 */
export function Stage3D({
  children,
  camera = { position: [0, 0, 6], fov: 50 },
  background = "#05060a",
  dprMax = 2,
  className,
  orbit = true,
  zoom = true,
  autoRotate = false,
  minDistance = 1.5,
  maxDistance = 60,
  hint = true,
  bloom = true,
  bloomIntensity = 0.9,
  bloomThreshold = 0.2,
}: {
  children: ReactNode;
  camera?: { position?: [number, number, number]; fov?: number };
  background?: string;
  dprMax?: number;
  className?: string;
  /** Allow drag-to-orbit / scroll-to-zoom. Disable for click-driven effects. */
  orbit?: boolean;
  /** Allow scroll/pinch zoom (independent of rotate). */
  zoom?: boolean;
  autoRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  /** Show the "scroll to zoom · drag to orbit" hint chip. */
  hint?: boolean;
  /** Add a bloom/glow postprocessing pass. */
  bloom?: boolean;
  bloomIntensity?: number;
  /** Luminance above which pixels start to bloom (0..1). */
  bloomThreshold?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const controlsOn = orbit || zoom;

  return (
    <div
      ref={wrapRef}
      className={className ?? "relative h-full w-full"}
      style={{ background }}
    >
      {mounted && (
        <Canvas
          dpr={[1, dprMax]}
          frameloop={visible ? "always" : "never"}
          camera={{
            position: camera.position ?? [0, 0, 6],
            fov: camera.fov ?? 50,
          }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.setClearColor(new THREE.Color(background), 1);
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
          {controlsOn && (
            <OrbitControls
              makeDefault
              enablePan={false}
              enableRotate={orbit}
              enableZoom={zoom}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.6}
              zoomSpeed={0.9}
              autoRotate={autoRotate}
              autoRotateSpeed={0.6}
              minDistance={minDistance}
              maxDistance={maxDistance}
            />
          )}
          {bloom && (
            <EffectComposer>
              <Bloom
                intensity={bloomIntensity}
                luminanceThreshold={bloomThreshold}
                luminanceSmoothing={0.3}
                mipmapBlur
              />
            </EffectComposer>
          )}
        </Canvas>
      )}
      {controlsOn && hint && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white/55 backdrop-blur">
          {orbit ? "scroll to zoom · drag to orbit" : "scroll to zoom"}
        </div>
      )}
    </div>
  );
}

/** Parse an `hsl(...)`/hex string into a THREE.Color (palette helper output). */
export function toColor(css: string): THREE.Color {
  return new THREE.Color().setStyle(css);
}
