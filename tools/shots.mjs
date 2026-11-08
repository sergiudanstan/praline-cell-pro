// Deterministic Playwright stills of the cell, plus console errors and an fps reading.
// Usage: node tools/shots.mjs [--quick]
//   --quick  iso@12 and t3a@12 only
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import("/opt/homebrew/lib/node_modules/playwright/index.mjs");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(homedir(), "ZCodeProject/output/praline_cell_pro/shots");
const quick = process.argv.includes("--quick");
const views = ["iso", "front", "side", "top", "delta", "t3a", "t3b"];
const times = [2.5, 12.0, 21.0];
const shots = quick ? [["iso", 12.0], ["t3a", 12.0]] : views.flatMap((v) => times.map((t) => [v, t]));

mkdirSync(outDir, { recursive: true });

const server = spawn("python3", ["-m", "http.server", "8777", "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => { serverLog += d; });
server.stderr.on("data", (d) => { serverLog += d; });

const errors = [];
let browser;
function ignore(text) {
  return String(text).includes("_cad/t3.glb");
}

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("http.server did not answer on 127.0.0.1:8777")), 8000);
    const ping = async () => {
      if (server.exitCode != null) {
        clearTimeout(timer);
        reject(new Error("http.server exited\n" + serverLog));
        return;
      }
      try {
        const r = await fetch("http://127.0.0.1:8777/");
        if (r.status < 500) { clearTimeout(timer); resolve(); return; }
      } catch { /* not up yet */ }
      setTimeout(ping, 100);
    };
    ping();
  });

  browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--window-size=1700,1050"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (ignore(text)) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => {
    const text = String(err);
    if (ignore(text)) return;
    errors.push(text);
  });

  await page.goto("http://127.0.0.1:8777/index.html?cad=0", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.pcReady === true, { timeout: 45000 });
  // The HQ watchdog closes after the first 3 s. Wait it out, then lock HQ so the stills show AO.
  await page.waitForTimeout(3200);
  await page.evaluate(() => window.setQuality(true));

  const paths = [];
  for (const [v, t] of shots) {
    await page.evaluate(({ v, t }) => {
      window.pc.pause();
      window.pc.seek(t);
      window.pc.setView(v);
    }, { v, t });
    await page.waitForTimeout(1200);
    const file = join(outDir, `${v}_${t.toFixed(1)}.png`);
    await page.screenshot({ path: file });
    paths.push(file);
    console.log(file);
  }

  await page.evaluate(() => {
    document.querySelectorAll(".rail-item[data-panel]").forEach((b) => {
      const open = b.getAttribute("aria-pressed") === "true";
      const want = b.dataset.panel === "whatif-card";
      if (open !== want) b.click();
    });
    window.pc.pause();
    window.pc.setView("iso");
    window.pc.setBelt(1.80);
  });
  const belt180 = await page.evaluate(() => ({
    duration: window.pc.DURATION,
    steps: document.getElementById("program-total").textContent,
    chart: document.getElementById("whatif-chart").querySelector("svg") != null,
  }));
  console.log("setBelt 1.80", belt180.duration.toFixed(2), belt180.steps, "chart", belt180.chart);
  if (Math.abs(belt180.duration - 49.56) > 0.02 || !belt180.chart) {
    errors.push(`setBelt(1.80) duration ${belt180.duration} chart ${belt180.chart}`);
  }
  await page.waitForTimeout(400);
  const whatif = join(outDir, "whatif_1.80.png");
  await page.screenshot({ path: whatif });
  console.log(whatif);

  await page.evaluate(() => window.pc.setBelt(0.70));
  const belt070 = await page.evaluate(() => window.pc.DURATION);
  console.log("setBelt 0.70", belt070.toFixed(2));
  if (Math.abs(belt070 - 42.51) > 0.02) errors.push(`setBelt(0.70) duration ${belt070}`);

  await page.evaluate(() => {
    window.pc.setView("iso");
    window.pc.seek(12);
    document.getElementById("guards").checked = false;
    document.getElementById("guards").dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const guardsOff = join(outDir, "guards_off_12.0.png");
  await page.screenshot({ path: guardsOff });
  console.log(guardsOff);
  await page.evaluate(() => {
    document.getElementById("guards").checked = true;
    document.getElementById("guards").dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const guardsOn = join(outDir, "guards_on_12.0.png");
  await page.screenshot({ path: guardsOn });
  console.log(guardsOn);

  const checks = await page.evaluate(() => ({
    t3: window.pc.t3Check?.() ?? null,
    delta: window.pc.deltaCheck?.() ?? null,
    hq: window.__hqStats ?? null,
  }));
  if (checks.t3 != null) console.log("t3Check mm", checks.t3);
  if (checks.delta != null) console.log("deltaCheck mm", checks.delta);
  if (checks.hq) console.log("watchdog avgMs", checks.hq.avgMs.toFixed(1), "tripped", checks.hq.tripped);

  async function fps(on) {
    await page.evaluate((hq) => {
      window.setQuality(hq);
      window.pc.setView("iso");
      window.pc.play();
    }, on);
    await page.waitForTimeout(900);
    return page.evaluate(() => new Promise((resolve) => {
      const t0 = performance.now();
      let frames = 0;
      const step = (now) => {
        frames += 1;
        if (now - t0 >= 3000) resolve(frames * 1000 / (now - t0));
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }));
  }
  const fpsHq = await fps(true);
  const fpsOff = await fps(false);
  console.log(`fps HQ ${fpsHq.toFixed(1)}`);
  console.log(`fps noHQ ${fpsOff.toFixed(1)}`);

  if (errors.length) {
    console.error(`console errors: ${errors.length}`);
    for (const e of errors) console.error(e);
    process.exitCode = 1;
  } else {
    console.log("console errors: 0");
  }
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
