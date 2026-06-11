"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { readPalette } from "@/lib/effects/color";
import { Stage3D } from "../three/Stage3D";

const COLOR_MODE_INDEX: Record<string, number> = {
  single: 0,
  dual: 1,
  rainbow: 2,
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Simplex noise (Ashima/McEwan) ported from the VisualDomainTesting FlowField,
// driving a domain-warped fbm that reads as flowing color bands.
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uScale;
  uniform float uContrast;
  uniform float uSwirl;
  uniform float uHue;
  uniform float uHue2;
  uniform float uColorMode;
  uniform vec2 uPointer;
  uniform float uAspect;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h));
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * snoise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  // Shortest-path hue blend on the 360 wheel, mirroring lib/effects/color.ts.
  float lerpHue(float a, float b, float t) {
    float d = mod(mod(b - a, 360.0) + 540.0, 360.0) - 180.0;
    return mod(a + d * t + 360.0, 360.0);
  }

  // Resolve a palette hue (degrees) for factor t under the active color mode.
  float paletteHue(float t) {
    if (uColorMode > 1.5) return mod(t * 360.0, 360.0);
    if (uColorMode > 0.5) return lerpHue(uHue, uHue2, clamp(t, 0.0, 1.0));
    return mod(uHue, 360.0);
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uAspect;
    p += uPointer * 0.25;

    float t = uTime;
    vec2 fp = p * uScale;

    // Iterated domain warping: swirl pushes the field through itself.
    vec2 q = vec2(fbm(fp + vec2(0.0, 0.0) + t * 0.10),
                  fbm(fp + vec2(5.2, 1.3) + t * 0.12));
    vec2 r = vec2(fbm(fp + uSwirl * q + vec2(1.7, 9.2) + t * 0.15),
                  fbm(fp + uSwirl * q + vec2(8.3, 2.8) + t * 0.126));
    float f = fbm(fp + uSwirl * r + t * 0.10);

    float v = f * 0.5 + 0.5;
    float flow = clamp(v + length(r) * 0.18, 0.0, 1.0);

    // Banding: sine of the field gives the flowing ribbon contour.
    float band = 0.5 + 0.5 * sin((flow * 6.2831 * uContrast) + t * 0.4);
    band = pow(band, mix(1.0, 2.4, clamp(uContrast - 1.0, 0.0, 1.0)));

    float hue = paletteHue(flow);
    vec3 col = hsl2rgb(hue / 360.0, 1.0, 0.62);

    // Darken troughs, lift crests so the bands read with depth.
    col *= 0.25 + 0.95 * band;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function FlowPlane({ params }: { params: EffectProps }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { mode, hue, hue2 } = readPalette(params);

  const speed = Math.max(0, Number(params.speed ?? 1));
  const scale = Math.max(0.2, Number(params.scale ?? 2.5));
  const contrast = Math.max(0.2, Number(params.contrast ?? 1));
  const swirl = Math.max(0, Number(params.swirl ?? 1.2));

  const elapsed = useRef(0);
  const pointer = useRef(new THREE.Vector2(0, 0));

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: scale },
        uContrast: { value: contrast },
        uSwirl: { value: swirl },
        uHue: { value: hue },
        uHue2: { value: hue2 },
        uColorMode: { value: COLOR_MODE_INDEX[mode] ?? 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uAspect: { value: 1 },
      },
    });
    mat.toneMapped = false;
    return mat;
    // Recreated only when the shader source changes; live params are pushed
    // into uniforms each frame below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt * speed;

    const u = material.uniforms;
    u.uTime.value = elapsed.current;
    u.uScale.value = scale;
    u.uContrast.value = contrast;
    u.uSwirl.value = swirl;
    u.uHue.value = hue;
    u.uHue2.value = hue2;
    u.uColorMode.value = COLOR_MODE_INDEX[mode] ?? 0;

    // Ease the pointer so its warp glides instead of snapping.
    pointer.current.x += (state.pointer.x - pointer.current.x) * Math.min(1, dt * 4);
    pointer.current.y += (state.pointer.y - pointer.current.y) * Math.min(1, dt * 4);
    (u.uPointer.value as THREE.Vector2).copy(pointer.current);

    u.uAspect.value = state.size.width / Math.max(1, state.size.height);

    // Keep the plane filling the camera frustum at z = 0 across resizes.
    const mesh = meshRef.current;
    if (mesh) {
      mesh.scale.set(state.viewport.width * 1.02, state.viewport.height * 1.02, 1);
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

export function FlowField({ params }: { params: EffectProps }) {
  return (
    <Stage3D
      camera={{ position: [0, 0, 6], fov: 50 }}
      orbit={false}
      zoom={false}
      pan={false}
      bloom
      bloomIntensity={0.45}
      bloomThreshold={0.55}
    >
      <FlowPlane params={params} />
    </Stage3D>
  );
}
