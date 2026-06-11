"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EffectProps } from "@/lib/effects/types";
import { paletteColor, readPalette } from "@/lib/effects/color";
import { Stage3D, toColor } from "../three/Stage3D";

// Fullscreen clip-space triangle/quad: ignore the camera entirely and place the
// plane straight in NDC so the fragment shader always fills the viewport.
const vertexShader = /* glsl */ `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Ported from CosmicVoice's ElectricShader: turbulent fbm lightning branches,
// vertical bolts and a liquid energy field. The mic/state inputs are replaced
// by time + pointer reactivity (u_mouse) and a click surge (u_surge).
const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform float u_time;
  uniform vec2 u_mouse;       // pointer in uv space (0..1)
  uniform vec2 u_resolution;
  uniform float u_intensity;
  uniform float u_speed;
  uniform float u_turbulence;
  uniform float u_glow;
  uniform float u_reactivity; // how strongly the pointer bends the field
  uniform float u_surge;      // 0..1 click burst, decays each frame
  uniform vec3 u_color1;      // deep field tone
  uniform vec3 u_color2;      // brighter field tone
  uniform vec3 u_bolt;        // lightning highlight

  varying vec2 v_uv;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i.x + i.y * 57.0);
    float b = hash(i.x + 1.0 + i.y * 57.0);
    float c = hash(i.x + i.y * 57.0 + 1.0);
    float d = hash(i.x + 1.0 + i.y * 57.0 + 1.0);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  float lightning(
    vec2 uv, float time, float seed, float amplitude,
    float mouseInfluence, vec2 mousePos, float turbulence, float glow
  ) {
    vec2 p = uv * 2.0 - 1.0;
    float basePulse = sin(time * 0.4 + seed) * 0.05;
    float wiggles = basePulse + fbm(vec2(uv.x * 10.0 + time * 0.5, seed * 100.0)) * amplitude;

    // Pointer pulls the bolt toward the cursor height.
    float mouseAttraction = mouseInfluence * ((mousePos.y * 2.0 - 1.0) - p.y) * 0.14;
    float path = abs(p.y - wiggles - mouseAttraction);

    for (int i = 0; i < 5; i++) {
      float fi = float(i) / 5.0;
      float branchSeed = hash(seed + fi * 10.0);
      float branchX = -0.8 + branchSeed * 1.6;
      if (abs(p.x - branchX) < 0.3) {
        float branchWiggles = fbm(vec2(uv.y * 8.0 + time * 0.3, (seed + fi) * 100.0)) * amplitude * 0.5 * turbulence;
        float branchPath = abs(p.x - branchX - branchWiggles * 0.3);
        path = min(path, branchPath);
      }
    }

    return (0.02 * glow) / (path + 0.01);
  }

  float verticalBolt(
    vec2 uv, float xPosition, float time, float seed,
    float intensity, float turbulence, float heightScale, float glow
  ) {
    vec2 p = uv * 2.0 - 1.0;
    float wiggles = fbm(vec2(seed * 100.0, uv.y * 15.0 + time * 0.3)) * 0.2 * turbulence;
    float drag = sin(time * 3.0 + seed) * 0.05;

    float yDist = abs(p.y);
    if (yDist > heightScale) return 0.0;

    float path = abs(p.x - xPosition - wiggles - drag);
    float flash = sin(time * 5.0 + seed) * 0.5 + 0.5;
    flash = pow(flash, 2.0);

    float g = (0.005 * glow) / (path + 0.002);
    return g * flash * intensity;
  }

  float liquid(vec2 uv, float time, float speed, float expandCollapse) {
    vec2 distortedUV = uv;
    float scale = 1.0 + sin(time * 0.3) * expandCollapse * 0.3;
    distortedUV = (distortedUV - 0.5) * scale + 0.5;
    float distortionAmount = 0.05 + sin(time * 0.5) * expandCollapse * 0.03;
    distortedUV.x += sin(uv.y * 10.0 + time) * distortionAmount;
    distortedUV.y += cos(uv.x * 8.0 + time * 0.7) * distortionAmount;
    float pattern = fbm(distortedUV * 4.0 + time * speed);
    pattern += fbm(distortedUV * 8.0 - time * speed * 1.5) * 0.5;
    return pattern;
  }

  void main() {
    vec2 uv = v_uv;
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    uv = uv * aspect - (aspect - 1.0) * 0.5;

    float mouseDistance = distance(u_mouse, v_uv);
    float mouseInfluence = (1.0 - smoothstep(0.0, 0.5, mouseDistance)) * u_reactivity;
    float surge = clamp(u_surge, 0.0, 1.0);

    float time = u_time * 0.5 * u_speed;
    float slowTime = u_time * 0.1 * u_speed;

    // Pointer proximity and the click surge both feed the energy budget.
    float drive = u_intensity + mouseInfluence * 0.6 + surge * 0.8;
    float amp = 0.3 + drive * 0.9;
    float heightScale = clamp(0.55 + drive * 0.5, 0.1, 1.6);

    // HORIZONTAL LIGHTNING
    float horizontalLightning = 0.0;
    for (int i = 0; i < 3; i++) {
      float seed = float(i) * 10.0;
      horizontalLightning += lightning(
        uv, time + seed * 0.3, seed, amp,
        mouseInfluence + surge, u_mouse, u_turbulence, u_glow
      );
    }

    // VERTICAL BOLTS
    float verticalLightning = 0.0;
    float boltPositions[4];
    boltPositions[0] = -0.6;
    boltPositions[1] = -0.2;
    boltPositions[2] = 0.2;
    boltPositions[3] = 0.6;

    float boltProbability = 0.1 + u_intensity * 0.4 + surge * 0.6;
    float boltIntensity = 0.4 + u_intensity * 0.6 + surge * 0.8;

    for (int i = 0; i < 4; i++) {
      float seed = float(i) * 10.0;
      float randomTiming = sin(time * 3.0 + seed * 2.0);
      if (randomTiming > (1.0 - boltProbability)) {
        verticalLightning += verticalBolt(
          uv, boltPositions[i], time, seed,
          boltIntensity, u_turbulence, heightScale, u_glow
        );
      }
    }

    float totalLightning = horizontalLightning + verticalLightning;

    // LIQUID ENERGY FIELD
    float liquidEffect = liquid(uv, slowTime, 0.1 + u_speed * 0.1, 0.5);
    liquidEffect += sin(slowTime * 0.5) * 0.1;
    vec2 mouseUV = uv - u_mouse * aspect;
    float mouseLiquid = fbm(mouseUV * 8.0 + slowTime * 0.2);
    liquidEffect = mix(liquidEffect, mouseLiquid, mouseInfluence * 0.18);

    vec3 color = u_color1 * 0.25;
    color = mix(color, mix(u_color1, u_color2, liquidEffect), liquidEffect * 0.6);
    color += totalLightning * u_bolt;
    color = mix(color, u_bolt, clamp(totalLightning * 0.5, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;

function Scene({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const surgeRef = useRef(0);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  // Stable uniform object: colours and scalars are pushed each frame so slider
  // changes apply live without rebuilding the ShaderMaterial.
  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_intensity: { value: 1 },
      u_speed: { value: 1 },
      u_turbulence: { value: 1 },
      u_glow: { value: 1 },
      u_reactivity: { value: 1 },
      u_surge: { value: 0 },
      u_color1: { value: new THREE.Color() },
      u_color2: { value: new THREE.Color() },
      u_bolt: { value: new THREE.Color() },
    }),
    []
  );

  const color1 = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0.12, 90, 26)), [mode, hue, hue2]);
  const color2 = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0.6, 95, 46)), [mode, hue, hue2]);
  const bolt = useMemo(() => toColor(paletteColor(mode, hue, hue2, 0.9, 92, 80)), [mode, hue, hue2]);

  // Click anywhere on the canvas to trigger an electric surge.
  useEffect(() => {
    const el = gl.domElement;
    const down = () => {
      surgeRef.current = 1;
    };
    el.addEventListener("pointerdown", down);
    return () => el.removeEventListener("pointerdown", down);
  }, [gl]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const mat = materialRef.current;
    if (!mat) return;
    const u = mat.uniforms;

    u.u_time.value = state.clock.elapsedTime;

    // R3F pointer is NDC (-1..1); the shader wants uv (0..1). Smooth it so the
    // field trails the cursor instead of snapping.
    const mx = state.pointer.x * 0.5 + 0.5;
    const my = state.pointer.y * 0.5 + 0.5;
    const k = Math.min(1, dt * 8);
    mouseRef.current.x += (mx - mouseRef.current.x) * k;
    mouseRef.current.y += (my - mouseRef.current.y) * k;
    u.u_mouse.value.copy(mouseRef.current);

    u.u_resolution.value.set(size.width, size.height);

    surgeRef.current = Math.max(0, surgeRef.current - dt * 1.6);
    u.u_surge.value = surgeRef.current;

    u.u_intensity.value = Number(params.intensity ?? 1);
    u.u_speed.value = Number(params.speed ?? 1);
    u.u_turbulence.value = Number(params.turbulence ?? 1);
    u.u_glow.value = Number(params.glow ?? 1);
    u.u_reactivity.value = Number(params.reactivity ?? 1);

    (u.u_color1.value as THREE.Color).copy(color1);
    (u.u_color2.value as THREE.Color).copy(color2);
    (u.u_bolt.value as THREE.Color).copy(bolt);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export function ElectricShader({ params }: { params: EffectProps }) {
  // Pointer-driven shader, so orbit/zoom/pan are off. The GLSL already supplies
  // its own glow, so the Stage3D bloom pass stays disabled.
  return (
    <Stage3D orbit={false} zoom={false} pan={false} bloom={false} background="#05060a">
      <Scene params={params} />
    </Stage3D>
  );
}
