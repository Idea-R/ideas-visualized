"use client";

import { useCanvas2D } from "../useCanvas2D";
import type { EffectProps } from "@/lib/effects/types";

type Scene =
  | "armory"
  | "grand_hall"
  | "warrior_forge"
  | "rogue_alley"
  | "mage_library"
  | "paladin_cathedral"
  | "ranger_forest"
  | "necromancer_crypt"
  | "graveyard"
  | "victory_sunrise"
  | "trophy_hall"
  | "archive"
  | "portal"
  | "parchment";

// Reference design space; scaled to fit the actual canvas each frame so the
// hand-placed decorations keep their proportions at any tile size.
const W = 800;
const H = 500;

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function drawArmory(c: CanvasRenderingContext2D, time: number) {
  const wallGrad = c.createLinearGradient(0, 0, 0, H);
  wallGrad.addColorStop(0, "#12101a");
  wallGrad.addColorStop(0.3, "#18161e");
  wallGrad.addColorStop(0.7, "#1a1822");
  wallGrad.addColorStop(1, "#141218");
  c.fillStyle = wallGrad;
  c.fillRect(0, 0, W, H);

  c.globalAlpha = 0.08;
  c.fillStyle = "#888888";
  for (let row = 0; row < Math.ceil(H / 28); row++) {
    const offset = row % 2 === 0 ? 0 : 32;
    for (let col = -1; col < Math.ceil(W / 64) + 1; col++) {
      c.fillRect(col * 64 + offset, row * 28, 60, 24);
    }
  }
  c.globalAlpha = 1;

  const floorY = H * 0.82;
  const floorGrad = c.createLinearGradient(0, floorY, 0, H);
  floorGrad.addColorStop(0, "#1a1820");
  floorGrad.addColorStop(0.15, "#161418");
  floorGrad.addColorStop(1, "#100e14");
  c.fillStyle = floorGrad;
  c.fillRect(0, floorY, W, H - floorY);
  c.fillStyle = "#222030";
  c.fillRect(0, floorY - 1, W, 3);

  const torches = [
    { x: 30, y: 200 },
    { x: W - 30, y: 200 },
    { x: 110, y: 380 },
    { x: W - 110, y: 380 },
  ];
  for (const t of torches) {
    const flicker = 0.6 + Math.sin(time * 4 + t.x * 0.7) * 0.15;
    c.globalAlpha = flicker * 0.12;
    const glow = c.createRadialGradient(t.x, t.y - 8, 0, t.x, t.y - 8, 60);
    glow.addColorStop(0, "#ff8833");
    glow.addColorStop(1, "transparent");
    c.fillStyle = glow;
    c.fillRect(t.x - 60, t.y - 68, 120, 120);
    c.globalAlpha = 1;
    c.fillStyle = "#443322";
    c.fillRect(t.x - 2, t.y, 4, 10);
    c.fillStyle = "#FF8833";
    c.globalAlpha = flicker * 0.7;
    const fh = 6 + Math.sin(time * 8 + t.x) * 2;
    c.beginPath();
    c.moveTo(t.x - 3, t.y);
    c.quadraticCurveTo(t.x - 1, t.y - fh * 0.7, t.x, t.y - fh);
    c.quadraticCurveTo(t.x + 1, t.y - fh * 0.7, t.x + 3, t.y);
    c.closePath();
    c.fill();
    c.fillStyle = "#FFDD66";
    c.globalAlpha = flicker * 0.9;
    c.fillRect(t.x - 1, t.y - 3, 2, 3);
    c.globalAlpha = 1;
  }

  c.globalAlpha = 0.15;
  c.fillStyle = "#aabbcc";
  for (let i = 0; i < 15; i++) {
    const dx = (time * 8 + i * 53.7) % W;
    const dy = (Math.sin(time * 0.5 + i * 2.3) * 0.5 + 0.5) * H * 0.75;
    c.fillRect(dx, dy, 1, 1);
  }
  c.globalAlpha = 1;
}

function drawGrandHall(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0e0c16");
  grad.addColorStop(0.4, "#141220");
  grad.addColorStop(0.7, "#161422");
  grad.addColorStop(1, "#0e0c14");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  const pillarW = 28;
  c.fillStyle = "#1c1a28";
  c.fillRect(0, 0, pillarW, H);
  c.fillRect(W - pillarW, 0, pillarW, H);
  c.fillStyle = "#222030";
  c.fillRect(pillarW - 3, 0, 3, H);
  c.fillRect(W - pillarW, 0, 3, H);

  const banners = [
    { x: 55, color: "#cc4444" },
    { x: 155, color: "#44cc44" },
    { x: 255, color: "#4488ff" },
    { x: W - 255, color: "#ffdd44" },
    { x: W - 155, color: "#88cc44" },
    { x: W - 55, color: "#aa44cc" },
  ];
  for (const b of banners) {
    const sway = Math.sin(time * 0.8 + b.x * 0.1) * 3;
    c.fillStyle = "#443322";
    c.fillRect(b.x - 16, 12, 32, 3);
    c.fillStyle = b.color + "44";
    c.beginPath();
    c.moveTo(b.x - 12 + sway * 0.5, 15);
    c.lineTo(b.x + 12 + sway * 0.5, 15);
    c.lineTo(b.x + 10 + sway, 70);
    c.lineTo(b.x + sway, 80);
    c.lineTo(b.x - 10 + sway, 70);
    c.closePath();
    c.fill();
    c.strokeStyle = b.color + "66";
    c.lineWidth = 1;
    c.stroke();
  }

  const floorY = H * 0.78;
  c.fillStyle = "#141220";
  c.fillRect(0, floorY, W, H - floorY);
  c.globalAlpha = 0.06;
  c.fillStyle = "#555555";
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < Math.ceil(W / 40); col++) {
      c.fillRect(col * 40 + 1, floorY + row * 20 + 1, 38, 18);
    }
  }
  c.globalAlpha = 1;

  c.globalAlpha = 0.08;
  c.fillStyle = "#882222";
  c.fillRect(W / 2 - 60, floorY, 120, H - floorY);
  c.globalAlpha = 1;

  c.globalAlpha = 0.12;
  c.fillStyle = "#bbccdd";
  for (let i = 0; i < 20; i++) {
    const px = (time * 6 + i * 41.3) % W;
    const py = (Math.sin(time * 0.4 + i * 1.9) * 0.5 + 0.5) * H * 0.7 + 20;
    c.fillRect(px, py, 1, 1);
  }
  c.globalAlpha = 1;
}

function drawWarriorForge(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a0c08");
  grad.addColorStop(0.5, "#1c1010");
  grad.addColorStop(1, "#201008");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  const lavaGlow = c.createRadialGradient(W / 2, H, 0, W / 2, H, H * 0.6);
  lavaGlow.addColorStop(0, "rgba(200, 60, 10, 0.15)");
  lavaGlow.addColorStop(0.5, "rgba(150, 40, 5, 0.06)");
  lavaGlow.addColorStop(1, "transparent");
  c.fillStyle = lavaGlow;
  c.fillRect(0, 0, W, H);

  const ax = W - 100;
  const ay = H * 0.7;
  c.fillStyle = "#2a2228";
  c.fillRect(ax - 15, ay, 30, 25);
  c.fillRect(ax - 25, ay - 8, 50, 10);
  c.fillRect(ax - 20, ay - 12, 40, 6);

  const fireFlicker = 0.7 + Math.sin(time * 3.5) * 0.15 + Math.sin(time * 7) * 0.05;
  c.globalAlpha = fireFlicker * 0.1;
  const fireGlow = c.createRadialGradient(W * 0.3, H * 0.65, 0, W * 0.3, H * 0.65, 120);
  fireGlow.addColorStop(0, "#ff6622");
  fireGlow.addColorStop(0.5, "#cc3300");
  fireGlow.addColorStop(1, "transparent");
  c.fillStyle = fireGlow;
  c.fillRect(0, H * 0.3, W * 0.6, H * 0.7);
  c.globalAlpha = 1;

  c.fillStyle = "#ff6633";
  for (let i = 0; i < 8; i++) {
    const ex = W * 0.3 + Math.sin(i * 4.3) * 60;
    const ey = H * 0.65 - ((time * 20 + i * 37) % (H * 0.5));
    const ea = Math.max(0, 1 - ey / (H * 0.3));
    c.globalAlpha = ea * 0.4;
    c.fillRect(ex, ey, 2, 2);
  }
  c.globalAlpha = 1;
}

function drawRogueAlley(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#060812");
  grad.addColorStop(0.3, "#0a0c18");
  grad.addColorStop(1, "#08080e");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  c.globalAlpha = 0.1;
  const moonGlow = c.createRadialGradient(W - 80, 50, 0, W - 80, 50, 80);
  moonGlow.addColorStop(0, "#aaccff");
  moonGlow.addColorStop(1, "transparent");
  c.fillStyle = moonGlow;
  c.fillRect(W - 160, 0, 160, 130);
  c.globalAlpha = 0.25;
  c.fillStyle = "#ccddff";
  c.beginPath();
  c.arc(W - 80, 50, 12, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#060812";
  c.beginPath();
  c.arc(W - 74, 47, 10, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;

  c.fillStyle = "#0c0e16";
  c.fillRect(0, 60, 65, H);
  c.fillRect(0, 30, 45, H);
  c.fillRect(W - 55, 80, 55, H);
  c.fillRect(W - 70, 45, 30, H);

  c.globalAlpha = 0.03;
  c.fillStyle = "#aabbdd";
  c.beginPath();
  c.moveTo(W - 120, 0);
  c.lineTo(W * 0.4, H);
  c.lineTo(W * 0.55, H);
  c.lineTo(W - 60, 0);
  c.fill();
  c.globalAlpha = 1;
}

function drawMageLibrary(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#08081a");
  grad.addColorStop(0.5, "#0c0c24");
  grad.addColorStop(1, "#0a0a1e");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  c.fillStyle = "#1a1428";
  c.fillRect(0, 50, 50, H - 100);
  c.fillRect(W - 50, 50, 50, H - 100);
  c.fillStyle = "#221a30";
  for (let i = 0; i < 8; i++) {
    const sy = 70 + i * 55;
    c.fillRect(0, sy, 48, 3);
    c.fillRect(W - 48, sy, 48, 3);
    c.globalAlpha = 0.15;
    for (let b = 0; b < 6; b++) {
      const colors = ["#cc4444", "#44cc88", "#4488ff", "#ffaa44", "#cc88ff", "#88ccff"];
      c.fillStyle = colors[b % colors.length];
      c.fillRect(5 + b * 7, sy + 4, 5, 20 + (b % 3) * 5);
      c.fillRect(W - 45 + b * 7, sy + 4, 5, 20 + (b % 3) * 5);
    }
    c.globalAlpha = 1;
  }

  c.globalAlpha = 0.12;
  const runes = ["\u26A1", "\u2726", "\u25C8", "\u27E1", "\u221E"];
  c.font = "14px monospace";
  c.textAlign = "center";
  for (let i = 0; i < 5; i++) {
    const rx = W * 0.3 + Math.sin(time * 0.5 + i * 1.8) * 100;
    const ry = H * 0.3 + Math.cos(time * 0.3 + i * 2.1) * 80;
    c.fillStyle = "#6688ff";
    c.fillText(runes[i], rx, ry);
  }
  c.globalAlpha = 1;

  c.globalAlpha = 0.06;
  const arcGlow = c.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, 150);
  arcGlow.addColorStop(0, "#4466ff");
  arcGlow.addColorStop(0.6, "#2233aa");
  arcGlow.addColorStop(1, "transparent");
  c.fillStyle = arcGlow;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 1;
}

function drawPaladinCathedral(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#14120a");
  grad.addColorStop(0.4, "#1a180e");
  grad.addColorStop(1, "#12100c");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  const gwx = W / 2;
  const gwy = 80;
  c.strokeStyle = "#443322";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(gwx - 50, gwy + 60);
  c.lineTo(gwx - 50, gwy - 10);
  c.arc(gwx, gwy - 10, 50, Math.PI, 0);
  c.lineTo(gwx + 50, gwy + 60);
  c.stroke();

  const panes = [
    { x: gwx - 30, y: gwy, w: 20, h: 25, color: "#cc333366" },
    { x: gwx - 5, y: gwy - 20, w: 20, h: 25, color: "#3366cc55" },
    { x: gwx + 15, y: gwy, w: 20, h: 25, color: "#44cc4455" },
    { x: gwx - 20, y: gwy + 25, w: 20, h: 20, color: "#ccaa3355" },
    { x: gwx + 5, y: gwy + 25, w: 20, h: 20, color: "#cc33cc44" },
  ];
  for (const p of panes) {
    c.fillStyle = p.color;
    c.fillRect(p.x, p.y, p.w, p.h);
  }

  const rayAlpha = 0.04 + Math.sin(time * 0.5) * 0.01;
  c.globalAlpha = rayAlpha;
  c.fillStyle = "#ffdd88";
  c.beginPath();
  c.moveTo(gwx - 40, gwy + 60);
  c.lineTo(gwx - 100, H);
  c.lineTo(gwx + 100, H);
  c.lineTo(gwx + 40, gwy + 60);
  c.fill();
  c.globalAlpha = 1;

  c.fillStyle = "#1e1c16";
  c.fillRect(15, 0, 20, H);
  c.fillRect(W - 35, 0, 20, H);

  c.fillStyle = "#ffdd88";
  for (let i = 0; i < 12; i++) {
    const px = gwx + Math.sin(time * 0.3 + i * 2) * 60;
    const py = gwy + 60 + ((time * 10 + i * 45) % (H - gwy - 60));
    c.globalAlpha = 0.15 + Math.sin(time + i) * 0.08;
    c.fillRect(px, py, 1.5, 1.5);
  }
  c.globalAlpha = 1;
}

function drawRangerForest(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#060e08");
  grad.addColorStop(0.5, "#0a140c");
  grad.addColorStop(1, "#080e0a");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  c.globalAlpha = 0.08;
  const mGlow = c.createRadialGradient(W * 0.6, 40, 0, W * 0.6, 40, 100);
  mGlow.addColorStop(0, "#aaddaa");
  mGlow.addColorStop(1, "transparent");
  c.fillStyle = mGlow;
  c.fillRect(W * 0.3, 0, W * 0.5, 140);
  c.globalAlpha = 1;

  const trees = [
    { x: 20, w: 18, h: H },
    { x: 60, w: 12, h: H * 0.85 },
    { x: W - 30, w: 16, h: H },
    { x: W - 70, w: 10, h: H * 0.9 },
    { x: W - 110, w: 14, h: H * 0.7 },
  ];
  for (const t of trees) {
    c.fillStyle = "#0e1a10";
    c.fillRect(t.x, H - t.h, t.w, t.h);
    c.fillStyle = "#142018";
    c.fillRect(t.x + 2, H - t.h, 2, t.h);
  }

  c.fillStyle = "#0a1a0c";
  for (let i = 0; i < 8; i++) {
    const cx = i * (W / 7) - 20;
    const cy = 30 + Math.sin(i * 1.5) * 20;
    c.beginPath();
    c.arc(cx, cy, 60 + (i % 3) * 15, 0, Math.PI * 2);
    c.fill();
  }

  c.fillStyle = "#aaffaa";
  for (let i = 0; i < 6; i++) {
    const fx = W * 0.2 + Math.sin(time * 0.7 + i * 3.1) * W * 0.3;
    const fy = H * 0.3 + Math.cos(time * 0.5 + i * 2.7) * H * 0.2;
    const blink = Math.sin(time * 2 + i * 1.4);
    if (blink > 0.3) {
      c.globalAlpha = (blink - 0.3) * 0.5;
      c.fillRect(fx, fy, 2, 2);
    }
  }
  c.globalAlpha = 1;
}

function drawNecromancerCrypt(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0a0a10");
  grad.addColorStop(0.5, "#0c0e14");
  grad.addColorStop(1, "#08080c");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  c.globalAlpha = 0.06;
  const mistGrad = c.createLinearGradient(0, H, 0, H * 0.4);
  mistGrad.addColorStop(0, "#22aa44");
  mistGrad.addColorStop(0.5, "#116622");
  mistGrad.addColorStop(1, "transparent");
  c.fillStyle = mistGrad;
  c.fillRect(0, H * 0.4, W, H * 0.6);
  c.globalAlpha = 1;

  const coffins = [
    { x: 50, y: H * 0.65 },
    { x: W - 90, y: H * 0.7 },
  ];
  for (const cf of coffins) {
    c.fillStyle = "#1a1620";
    c.fillRect(cf.x, cf.y, 40, 60);
    c.fillRect(cf.x + 5, cf.y - 8, 30, 10);
    c.fillStyle = "#443855";
    c.fillRect(cf.x + 17, cf.y + 10, 6, 25);
    c.fillRect(cf.x + 10, cf.y + 18, 20, 6);
  }

  const candles = [
    { x: 35, y: H * 0.5 },
    { x: W - 50, y: H * 0.55 },
    { x: W / 2, y: H * 0.45 },
  ];
  for (const cn of candles) {
    c.fillStyle = "#224422";
    c.fillRect(cn.x - 2, cn.y, 4, 15);
    const flicker = 0.6 + Math.sin(time * 5 + cn.x) * 0.2;
    c.globalAlpha = flicker * 0.4;
    c.fillStyle = "#44ff44";
    c.beginPath();
    c.arc(cn.x, cn.y - 3, 4, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = flicker * 0.08;
    const cGlow = c.createRadialGradient(cn.x, cn.y, 0, cn.x, cn.y, 40);
    cGlow.addColorStop(0, "#44ff44");
    cGlow.addColorStop(1, "transparent");
    c.fillStyle = cGlow;
    c.fillRect(cn.x - 40, cn.y - 40, 80, 80);
    c.globalAlpha = 1;
  }

  c.fillStyle = "#44aa44";
  for (let i = 0; i < 10; i++) {
    const mx = (time * 12 + i * 79) % W;
    const my = H * 0.65 + Math.sin(time * 0.8 + i * 2) * 40;
    c.globalAlpha = 0.08 + Math.sin(time + i) * 0.03;
    c.fillRect(mx, my, 3, 1);
  }
  c.globalAlpha = 1;
}

function drawGraveyard(c: CanvasRenderingContext2D, time: number) {
  const skyGrad = c.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, "#0c0408");
  skyGrad.addColorStop(0.3, "#140812");
  skyGrad.addColorStop(0.6, "#0e0a10");
  skyGrad.addColorStop(1, "#0a080c");
  c.fillStyle = skyGrad;
  c.fillRect(0, 0, W, H);

  const moonX = W * 0.75;
  const moonY = 60;
  c.globalAlpha = 0.12;
  const rGlow = c.createRadialGradient(moonX, moonY, 0, moonX, moonY, 80);
  rGlow.addColorStop(0, "#cc3333");
  rGlow.addColorStop(1, "transparent");
  c.fillStyle = rGlow;
  c.fillRect(moonX - 80, moonY - 80, 160, 160);
  c.globalAlpha = 0.3;
  c.fillStyle = "#cc4444";
  c.beginPath();
  c.arc(moonX, moonY, 16, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;

  const groundY = H * 0.7;
  c.fillStyle = "#0e0c12";
  c.fillRect(0, groundY, W, H - groundY);
  c.fillStyle = "#14121a";
  c.fillRect(0, groundY - 2, W, 4);

  const drawDeadTree = (tx: number, h: number) => {
    c.fillStyle = "#12101a";
    c.fillRect(tx - 3, groundY - h, 6, h);
    c.strokeStyle = "#12101a";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(tx, groundY - h * 0.7);
    c.lineTo(tx - 20, groundY - h * 0.9);
    c.moveTo(tx, groundY - h * 0.5);
    c.lineTo(tx + 18, groundY - h * 0.7);
    c.moveTo(tx, groundY - h * 0.85);
    c.lineTo(tx + 12, groundY - h);
    c.stroke();
  };
  drawDeadTree(70, 120);
  drawDeadTree(W - 90, 100);
  drawDeadTree(W - 40, 80);

  const stones = [
    { x: 150, w: 20, h: 30 },
    { x: 280, w: 18, h: 25 },
    { x: 420, w: 22, h: 35 },
    { x: 560, w: 16, h: 22 },
    { x: 680, w: 20, h: 28 },
  ];
  for (const s of stones) {
    c.fillStyle = "#1c1a24";
    c.fillRect(s.x - s.w / 2, groundY - s.h, s.w, s.h);
    c.beginPath();
    c.arc(s.x, groundY - s.h, s.w / 2, Math.PI, 0);
    c.fill();
  }

  c.globalAlpha = 0.06;
  c.fillStyle = "#aaaacc";
  for (let i = 0; i < 6; i++) {
    const fx = ((time * 15 + i * 130) % (W + 200)) - 100;
    const fy = groundY - 20 + Math.sin(i * 2) * 15;
    c.beginPath();
    c.ellipse(fx, fy, 60, 8, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

function drawVictorySunrise(c: CanvasRenderingContext2D, _time: number) {
  const skyGrad = c.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, "#0c1020");
  skyGrad.addColorStop(0.3, "#1a1830");
  skyGrad.addColorStop(0.5, "#2a1a18");
  skyGrad.addColorStop(0.7, "#3a2210");
  skyGrad.addColorStop(1, "#1a1008");
  c.fillStyle = skyGrad;
  c.fillRect(0, 0, W, H);

  const sunX = W / 2;
  const sunY = H * 0.5;
  c.globalAlpha = 0.15;
  const sunGlow = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, 200);
  sunGlow.addColorStop(0, "#ffaa44");
  sunGlow.addColorStop(0.4, "#ff6622");
  sunGlow.addColorStop(1, "transparent");
  c.fillStyle = sunGlow;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 1;

  c.fillStyle = "#0e0a0a";
  c.beginPath();
  c.moveTo(0, H * 0.55);
  const peaks: [number, number][] = [
    [0, 55],
    [80, 35],
    [180, 50],
    [300, 25],
    [400, 45],
    [500, 30],
    [620, 50],
    [750, 40],
    [W, 55],
  ];
  for (const [px, py] of peaks) c.lineTo(px, H * 0.01 * py + H * 0.3);
  c.lineTo(W, H);
  c.lineTo(0, H);
  c.fill();
}

function drawTrophyHall(c: CanvasRenderingContext2D, _time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#12100a");
  grad.addColorStop(0.5, "#1a1810");
  grad.addColorStop(1, "#0e0c08");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  const pillars = [15, W - 35];
  for (const px of pillars) {
    c.fillStyle = "#2a2418";
    c.fillRect(px, 0, 22, H);
    c.fillStyle = "#3a3420";
    c.fillRect(px + 2, 0, 3, H);
    c.fillRect(px + 17, 0, 3, H);
    c.fillStyle = "#4a4228";
    c.fillRect(px - 4, 0, 30, 8);
    c.fillRect(px - 4, H - 8, 30, 8);
  }

  const trophies = [
    { x: W * 0.2, y: 100, color: "#cc8822" },
    { x: W * 0.5, y: 80, color: "#FFD700" },
    { x: W * 0.8, y: 100, color: "#aa6611" },
  ];
  for (const t of trophies) {
    c.globalAlpha = 0.12;
    c.fillStyle = t.color;
    c.beginPath();
    c.arc(t.x, t.y, 18, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = t.color;
    c.lineWidth = 1.5;
    c.globalAlpha = 0.2;
    c.beginPath();
    c.arc(t.x, t.y, 18, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
  }

  c.globalAlpha = 0.04;
  const gGlow = c.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, 200);
  gGlow.addColorStop(0, "#FFD700");
  gGlow.addColorStop(1, "transparent");
  c.fillStyle = gGlow;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 1;
}

function drawArchive(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0c0a14");
  grad.addColorStop(0.5, "#10101e");
  grad.addColorStop(1, "#0a0a16");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  c.fillStyle = "#18141e";
  c.fillRect(0, 0, W, 40);
  c.fillStyle = "#201a28";
  c.fillRect(0, 38, W, 3);
  c.globalAlpha = 0.1;
  for (let i = 0; i < Math.ceil(W / 8); i++) {
    const colors = ["#cc4444", "#44cc88", "#4488ff", "#ffaa44", "#cc88ff"];
    c.fillStyle = colors[i % colors.length];
    c.fillRect(i * 8 + 2, 5, 5, 30);
  }
  c.globalAlpha = 1;

  const candlePos = [
    { x: 40, y: 50 },
    { x: W - 40, y: 50 },
  ];
  for (const cp of candlePos) {
    c.fillStyle = "#665544";
    c.fillRect(cp.x - 2, cp.y, 4, 12);
    const flicker = 0.6 + Math.sin(time * 4.5 + cp.x) * 0.15;
    c.globalAlpha = flicker * 0.08;
    const cGlow = c.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, 50);
    cGlow.addColorStop(0, "#ffaa44");
    cGlow.addColorStop(1, "transparent");
    c.fillStyle = cGlow;
    c.fillRect(cp.x - 50, cp.y - 50, 100, 100);
    c.globalAlpha = flicker * 0.6;
    c.fillStyle = "#ffcc44";
    c.fillRect(cp.x - 1, cp.y - 3, 2, 3);
    c.globalAlpha = 1;
  }

  c.globalAlpha = 0.06;
  c.strokeStyle = "#cc88ff";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(60, H - 30);
  c.quadraticCurveTo(W / 2, H - 50, W - 60, H - 30);
  c.stroke();
  c.globalAlpha = 1;
}

function drawPortal(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0a0c1a");
  grad.addColorStop(0.5, "#0e1020");
  grad.addColorStop(1, "#080a14");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H * 0.45;
  for (let ring = 3; ring >= 0; ring--) {
    const r = 60 + ring * 25;
    const alpha = 0.4 - ring * 0.08;
    c.globalAlpha = Math.max(0.05, alpha);
    c.strokeStyle = "#88CCFF";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, r, time * (0.3 + ring * 0.1), time * (0.3 + ring * 0.1) + Math.PI * 1.5);
    c.stroke();
  }
  c.globalAlpha = 1;

  c.globalAlpha = 0.18;
  const pGlow = c.createRadialGradient(cx, cy, 0, cx, cy, 100);
  pGlow.addColorStop(0, "#88CCFF");
  pGlow.addColorStop(0.5, "#4488cc");
  pGlow.addColorStop(1, "transparent");
  c.fillStyle = pGlow;
  c.fillRect(cx - 100, cy - 100, 200, 200);
  c.globalAlpha = 1;

  c.fillStyle = "#88CCFF";
  for (let i = 0; i < 8; i++) {
    const angle = time * 1.2 + i * ((Math.PI * 2) / 8);
    const dist = 70 + Math.sin(time * 2 + i) * 15;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.6;
    c.globalAlpha = 0.4 + Math.sin(time * 3 + i) * 0.2;
    c.fillRect(px, py, 2.5, 2.5);
  }
  c.globalAlpha = 1;
}

function drawParchment(c: CanvasRenderingContext2D, time: number) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0e0c0a");
  grad.addColorStop(0.5, "#14120e");
  grad.addColorStop(1, "#0a0a08");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  c.globalAlpha = 0.06;
  c.fillStyle = "#886644";
  roundRect(c, 20, 45, W - 40, H - 75, 6);
  c.fill();
  c.globalAlpha = 1;

  c.strokeStyle = "#332a1a";
  c.lineWidth = 2;
  c.globalAlpha = 0.2;
  roundRect(c, 20, 45, W - 40, H - 75, 6);
  c.stroke();
  c.globalAlpha = 1;

  const candles = [
    { x: 35, y: 55 },
    { x: W - 35, y: 55 },
    { x: 35, y: H - 45 },
    { x: W - 35, y: H - 45 },
  ];
  for (const cn of candles) {
    c.fillStyle = "#554422";
    c.fillRect(cn.x - 2, cn.y, 4, 10);
    const flicker = 0.5 + Math.sin(time * 4 + cn.x + cn.y) * 0.2;
    c.globalAlpha = flicker * 0.08;
    const cGlow = c.createRadialGradient(cn.x, cn.y, 0, cn.x, cn.y, 45);
    cGlow.addColorStop(0, "#ffaa44");
    cGlow.addColorStop(1, "transparent");
    c.fillStyle = cGlow;
    c.fillRect(cn.x - 45, cn.y - 45, 90, 90);
    c.globalAlpha = flicker * 0.5;
    c.fillStyle = "#ffcc44";
    c.fillRect(cn.x - 1, cn.y - 3, 2, 3);
    c.globalAlpha = 1;
  }
}

function drawScene(c: CanvasRenderingContext2D, scene: Scene, time: number) {
  switch (scene) {
    case "armory":
      drawArmory(c, time);
      break;
    case "grand_hall":
      drawGrandHall(c, time);
      break;
    case "warrior_forge":
      drawWarriorForge(c, time);
      break;
    case "rogue_alley":
      drawRogueAlley(c, time);
      break;
    case "mage_library":
      drawMageLibrary(c, time);
      break;
    case "paladin_cathedral":
      drawPaladinCathedral(c, time);
      break;
    case "ranger_forest":
      drawRangerForest(c, time);
      break;
    case "necromancer_crypt":
      drawNecromancerCrypt(c, time);
      break;
    case "graveyard":
      drawGraveyard(c, time);
      break;
    case "victory_sunrise":
      drawVictorySunrise(c, time);
      break;
    case "trophy_hall":
      drawTrophyHall(c, time);
      break;
    case "archive":
      drawArchive(c, time);
      break;
    case "portal":
      drawPortal(c, time);
      break;
    case "parchment":
      drawParchment(c, time);
      break;
    default: {
      const _exhaustive: never = scene;
      void _exhaustive;
    }
  }
}

/**
 * Animated level and menu backgrounds ported from the dungeon-crawler scene
 * renderers. Pick a scene to settle into its lighting, particles, and props.
 */
export function DungeonScenes({ params }: { params: EffectProps }) {
  const scene = String(params.scene ?? "warrior_forge") as Scene;
  const speed = Number(params.speed ?? 1);
  const brightness = Number(params.brightness ?? 1);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      return {
        clearMode: "full",
        draw: (c, _dt, t) => {
          c.save();
          c.scale(width / W, height / H);
          drawScene(c, scene, t * speed);
          c.restore();

          if (brightness < 1) {
            c.globalCompositeOperation = "source-over";
            c.fillStyle = `rgba(0,0,0,${(1 - brightness) * 0.85})`;
            c.fillRect(0, 0, width, height);
          } else if (brightness > 1) {
            c.globalCompositeOperation = "lighter";
            c.fillStyle = `rgba(255,255,255,${(brightness - 1) * 0.3})`;
            c.fillRect(0, 0, width, height);
            c.globalCompositeOperation = "source-over";
          }
        },
      };
    },
    [scene, speed, brightness]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
