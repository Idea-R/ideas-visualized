// Poster generator: drives a real (wall-clock) headless Chrome over the DevTools
// Protocol so requestAnimationFrame-based effects actually animate before we
// capture. The old `--screenshot` + `--virtual-time-budget` path does NOT drive
// rAF, so incremental/burst effects came out blank. Here we navigate to
// /embed/<slug>?drive=1, let it run ~4.5s (the embed route forces motion on and
// feeds a scripted pointer/click sequence), then capture.
//
// Usage:
//   node scripts/gen-posters.mjs                 # all effects
//   node scripts/gen-posters.mjs slug1 slug2     # only these
//
// Env: BASE_URL (default http://localhost:3300), POSTER_DELAY_MS (default 4500)

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dest = join(root, "public", "posters");
mkdirSync(dest, { recursive: true });

const BASE_URL = process.env.BASE_URL || "http://localhost:3300";
const DELAY = Number(process.env.POSTER_DELAY_MS || 4500);
const PORT = 9333;
const W = 800;
const H = 500;

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
];
const chrome = chromePaths.find((p) => p && existsSync(p));
if (!chrome) throw new Error("Chrome not found");

// Slug list from meta.ts
const metaSrc = readFileSync(join(root, "lib", "effects", "meta.ts"), "utf8");
const allSlugs = [...metaSrc.matchAll(/^\s*slug:\s*"([^"]+)"/gm)].map((m) => m[1]);
const only = process.argv.slice(2);
const slugs = only.length ? allSlugs.filter((s) => only.includes(s)) : allSlugs;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDir = join(tmpdir(), "cr-poster-cdp");
try { rmSync(userDir, { recursive: true, force: true }); } catch {}

const proc = spawn(chrome, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  `--window-size=${W},${H}`,
  `--user-data-dir=${userDir}`,
  "about:blank",
], { stdio: "ignore" });

async function getBrowserWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome CDP did not become ready");
}

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const eventHandlers = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method) {
      for (const h of eventHandlers) h(msg);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  return { ready, send, onEvent: (h) => eventHandlers.push(h), close: () => ws.close() };
}

async function main() {
  const wsUrl = await getBrowserWs();
  const cdp = cdpClient(wsUrl);
  await cdp.ready;

  let i = 0;
  for (const slug of slugs) {
    i++;
    const url = `${BASE_URL}/embed/${slug}?drive=1`;
    let targetId;
    try {
      ({ targetId } = await cdp.send("Target.createTarget", { url: "about:blank", newWindow: true, width: W, height: H }));
      const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
      await cdp.send("Page.enable", {}, sessionId);
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
      await cdp.send("Page.navigate", { url }, sessionId);
      await sleep(DELAY);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, sessionId);
      writeFileSync(join(dest, `${slug}.png`), Buffer.from(data, "base64"));
      console.log(`[${i}/${slugs.length}] ${slug}`);
    } catch (e) {
      console.log(`[${i}/${slugs.length}] FAIL ${slug}: ${e.message}`);
    } finally {
      if (targetId) { try { await cdp.send("Target.closeTarget", { targetId }); } catch {} }
    }
  }
  cdp.close();
  console.log("POSTERS_DONE");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => { try { proc.kill(); } catch {} });
