"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useFrame } from "@react-three/fiber";
import { useRef, type PointerEvent, type ReactNode } from "react";
import type { Group } from "three";
import { Stage3D } from "@/components/effects/three/Stage3D";
import styles from "./three-assets.module.css";

const drops = [
  {
    index: "01",
    title: "Signal Shrine",
    type: "World prop kit",
    description:
      "A modular beacon, plinth, cables, and emissive inserts for sci-fi ruins, puzzle rooms, and strange little worlds.",
    formats: ["GLB", "2K PBR", "3 LODs"],
    className: styles.shrine,
  },
  {
    index: "02",
    title: "Pocket Dungeon",
    type: "Environment kit",
    description:
      "Grid-ready stone modules, doors, traps, torch sockets, and readable silhouettes for browser-scale encounters.",
    formats: ["GLB", "1K PBR", "Grid snap"],
    className: styles.dungeon,
  },
  {
    index: "03",
    title: "Courier Relics",
    type: "Hero props",
    description:
      "A focused set of worn cases, field terminals, key objects, and pickup-ready variants built for close inspection.",
    formats: ["GLB", "2K PBR", "Variants"],
    className: styles.relics,
  },
];

const deliveryContents = [
  ["Scene-ready GLB", "Named meshes, sensible origins, real-world scale, and transforms already applied."],
  ["Lean textures", "PBR maps in WebP or KTX2-ready sources, plus a clear texture-density note."],
  ["Preview kit", "Transparent thumbnail, turntable stills, wireframe view, and triangle count before download."],
  ["Starter scene", "A small Three.js example showing loading, lighting, material setup, and disposal."],
  ["Honest license", "The exact usage rights live beside every download, never hidden behind vague marketplace copy."],
  ["Change log", "Versioned packs with file-level notes, so an update never quietly breaks a production scene."],
];

function AssetScene({ reduceMotion }: { reduceMotion: boolean }) {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!group.current || reduceMotion) return;
    const dt = Math.min(delta, 0.04);
    group.current.rotation.y += dt * 0.12;
    group.current.rotation.x +=
      (state.pointer.y * 0.08 - group.current.rotation.x) * dt * 2.5;
    group.current.position.x +=
      (state.pointer.x * 0.16 - group.current.position.x) * dt * 2.5;
  });

  return (
    <group ref={group} rotation={[0.08, -0.35, 0]}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 4]} intensity={3.2} color="#b7fbff" />
      <pointLight position={[-3, 1, 3]} intensity={22} color="#8b68ff" />
      <pointLight position={[3, -2, 2]} intensity={18} color="#ff9a62" />

      <mesh position={[0, -0.45, 0]} castShadow>
        <cylinderGeometry args={[1.15, 1.35, 0.35, 8]} />
        <meshStandardMaterial color="#171d2e" metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <octahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color="#4f6fff"
          emissive="#3524b8"
          emissiveIntensity={0.72}
          metalness={0.55}
          roughness={0.2}
          wireframe
        />
      </mesh>
      <mesh position={[0, 0.25, 0]} scale={0.72}>
        <icosahedronGeometry args={[0.66, 1]} />
        <meshStandardMaterial
          color="#92fff5"
          emissive="#157a91"
          emissiveIntensity={0.4}
          metalness={0.35}
          roughness={0.22}
        />
      </mesh>
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 1.15, -0.05, 0]} rotation={[0, 0, x * 0.16]}>
          <boxGeometry args={[0.32, 1.15, 0.32]} />
          <meshStandardMaterial color="#242b3e" metalness={0.75} roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.04, 12, 64]} />
        <meshStandardMaterial color="#ff896b" emissive="#ff4c29" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(rawY, { stiffness: 170, damping: 24 });
  const rotateY = useSpring(rawX, { stiffness: 170, damping: 24 });

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    rawX.set(((event.clientX - rect.left) / rect.width - 0.5) * 8);
    rawY.set(((event.clientY - rect.top) / rect.height - 0.5) * -8);
  }

  function reset() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <motion.div
      className={className}
      style={{ rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
}

export function ThreeAssetLab() {
  const reduceMotion = useReducedMotion() ?? false;
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 0.88]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 62]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

  return (
    <main className={styles.page}>
      <section ref={heroRef} className={styles.hero} aria-labelledby="asset-lab-title">
        <div className={styles.grid} aria-hidden="true" />
        <motion.div
          className={styles.heroCopy}
          style={{
            y: reduceMotion ? 0 : copyY,
            opacity: reduceMotion ? 1 : copyOpacity,
          }}
        >
          <p className={styles.eyebrow}>Ideas Visualized · Asset Lab 00</p>
          <h1 id="asset-lab-title">
            Small worlds.
            <span>Ready to ship.</span>
          </h1>
          <p className={styles.lede}>
            Original 3D props and environment kits for Three.js, browser games,
            prototypes, and playable experiments. The first free drops are now in the forge.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#first-drops">
              Preview the first drops
            </a>
            <Link className={styles.secondaryAction} href="/game-assets">
              Explore game VFX
            </Link>
          </div>
          <dl className={styles.heroStats}>
            <div><dt>Format</dt><dd>GLB first</dd></div>
            <div><dt>Target</dt><dd>Web real-time</dd></div>
            <div><dt>Status</dt><dd>Coming soon</dd></div>
          </dl>
        </motion.div>

        <motion.div
          className={styles.heroScene}
          style={{
            y: reduceMotion ? 0 : sceneY,
            scale: reduceMotion ? 1 : sceneScale,
          }}
        >
          <div className={styles.sceneChrome}>
            <span>PREVIEW / SIGNAL SHRINE</span>
            <span>12.4K TRI</span>
          </div>
          <div className={styles.canvasWrap} aria-hidden="true">
            <Stage3D
              camera={{ position: [0, 0.1, 5], fov: 42 }}
              background="#090b12"
              dprMax={1.5}
              orbit={false}
              zoom={false}
              pan={false}
              hint={false}
              bloom
              bloomIntensity={0.55}
              bloomThreshold={0.32}
            >
              <AssetScene reduceMotion={reduceMotion} />
            </Stage3D>
          </div>
          <div className={styles.sceneFooter}>
            <span>Drag-free preview</span>
            <span className={styles.liveDot}>Procedural concept</span>
          </div>
        </motion.div>

        <div className={styles.scrollCue} aria-hidden="true">
          <span /> Scroll to inspect
        </div>
      </section>

      <section id="first-drops" className={styles.section} aria-labelledby="drops-heading">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>In the forge</p>
            <h2 id="drops-heading">The first drops</h2>
          </div>
          <p>
            Compact packs with a visual point of view. Each preview is an original
            concept built from code, not a borrowed marketplace asset.
          </p>
        </div>

        <div className={styles.dropGrid}>
          {drops.map((drop) => (
            <TiltCard key={drop.title} className={styles.dropCard}>
              <div className={`${styles.assetPreview} ${drop.className}`} aria-hidden="true">
                <span className={styles.previewOrb} />
                <span className={styles.previewRing} />
                <span className={styles.previewPlinth} />
                <span className={styles.assetIndex}>{drop.index}</span>
              </div>
              <div className={styles.dropContent}>
                <p>{drop.type}</p>
                <h3>{drop.title}</h3>
                <span>{drop.description}</span>
                <ul aria-label={`Planned ${drop.title} package contents`}>
                  {drop.formats.map((format) => <li key={format}>{format}</li>)}
                </ul>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.delivery}`} aria-labelledby="delivery-heading">
        <div className={styles.deliveryIntro}>
          <p className={styles.eyebrow}>Not just a mesh</p>
          <h2 id="delivery-heading">A clean handoff is part of the asset.</h2>
          <p>
            The goal is a download you can understand in five minutes and trust in a
            production branch. No mystery scale, missing textures, or licensing fog.
          </p>
        </div>
        <ol className={styles.deliveryList}>
          {deliveryContents.map(([title, description], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.pipeline}`} aria-labelledby="pipeline-heading">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Web-first pipeline</p>
            <h2 id="pipeline-heading">Made to stay fast.</h2>
          </div>
          <p>
            Every pack will publish its actual runtime weight and a recommended loading
            path, with graceful fallbacks for touch devices and reduced motion.
          </p>
        </div>
        <div className={styles.pipelineDiagram} aria-label="Planned asset delivery pipeline">
          {[
            ["01", "Model", "Clean topology · applied transforms"],
            ["02", "Compress", "Meshopt / Draco · texture targets"],
            ["03", "Preview", "Desktop · touch · reduced motion"],
            ["04", "Ship", "GLB · thumbnail · starter scene"],
          ].map(([number, title, detail]) => (
            <div key={number} className={styles.pipelineStep}>
              <span>{number}</span><h3>{title}</h3><p>{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.roadmap}`} aria-labelledby="roadmap-heading">
        <div>
          <p className={styles.eyebrow}>Release runway</p>
          <h2 id="roadmap-heading">A public shelf, built in small drops.</h2>
        </div>
        <div className={styles.roadmapTrack}>
          <article><span>Now</span><h3>Prototype the shelf</h3><p>Lock file standards, preview language, budgets, and licensing display.</p></article>
          <article><span>Next</span><h3>Release pack 001</h3><p>Ship one polished modular kit with a complete Three.js starter scene.</p></article>
          <article><span>Then</span><h3>Invite field tests</h3><p>Use real game builds to tune LODs, collision, naming, and packaging.</p></article>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="cta-heading">
        <p className={styles.eyebrow}>Follow the build</p>
        <h2 id="cta-heading">The shelf is empty on purpose.<br />The first drop should earn its place.</h2>
        <p>
          Until then, the live VFX library already has combat, spells, impacts,
          weather, lighting, and level atmosphere to remix.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/game-assets">Open game assets</Link>
          <a
            className={styles.secondaryAction}
            href="https://github.com/Idea-R/ideas-visualized"
            target="_blank"
            rel="noreferrer"
          >
            Watch the repository
          </a>
        </div>
      </section>
    </main>
  );
}
