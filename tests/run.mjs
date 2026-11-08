// Checks the cell logic in index.html without a browser.
// Usage: node tests/run.mjs [file.html] [--perturb]
//   --perturb removes the nest interlock (T3 no longer waits for the delta to release the nest),
//   to prove the mutex and clearance checks can fail.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) || join(here, "..", "index.html");
const perturb = args.includes("--perturb");
const html = readFileSync(file, "utf8");
const m = html.match(/\/\/ @@logic-start[^\n]*\n([\s\S]*?)\/\/ @@logic-end/);
if (!m) { console.error("logic block not found"); process.exit(2); }
let code = m[1];
if (perturb) {
  const before = code;
  code = code.replace("let u = Math.max(T.t, released);", "let u = Math.max(T.t, released - 1.2);");
  if (code === before) { console.error("perturbation target not found"); process.exit(2); }
}
const L = new Function("console", code + "\nreturn { CELL, BOX, CAP, RECIPE, SIDES, T3, DELTA, segs, zones, parts, boxes, DURATION, S, minClear, ikFail, N_PARTS, REJECTS, t3IK, deltaIK };")({ log() {} });

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) fails++; };
const mm = (v) => (v * 1000).toFixed(1);

// 1. every praline reaches a destination, boxes match the recipe
check(L.parts.length === L.N_PARTS, `${L.parts.length} pralines scheduled`);
check(L.parts.every((p) => p.track.at(-1).mode === "fixed" && p.track.at(-1).t < L.DURATION), "every praline ends in a box cavity or a reject bin before the cycle ends");
for (const sd of L.SIDES) {
  const inBox = L.parts.filter((p) => p.side === sd.i && !p.reject);
  const slots = inBox.map((p) => p.slot).sort((a, b) => a - b);
  check(slots.length === L.CAP && slots.every((s, n) => s === n), `box ${sd.letter}: cavities 1-${L.CAP} each filled once`);
  check(inBox.every((p) => p.flavour === L.RECIPE[p.slot]), `box ${sd.letter}: flavours follow the recipe`);
}
check(L.parts.filter((p) => p.reject).every((p) => L.REJECTS.has(p.k) && p.track.at(-1).box == null), "rejected pralines go to the reject bins only");

// 2. mutex: delta and T3 intervals on each nest never overlap
for (const sd of L.SIDES) {
  const iv = [...L.zones[sd.i].delta.map((z) => [...z, "delta"]), ...L.zones[sd.i].t3.map((z) => [...z, "t3"])].sort((a, b) => a[0] - b[0]);
  let overlap = 0;
  for (let n = 1; n < iv.length; n++) if (iv[n][0] < iv[n - 1][1] - 1e-9) overlap++;
  check(overlap === 0, `nest ${sd.letter}: ${iv.length} mutex intervals, ${overlap} overlaps`);
}
// segments per actor are contiguous and ordered
for (const [a, list] of Object.entries(L.segs)) {
  const gaps = list.filter((s, n) => n && Math.abs(s.t0 - list[n - 1].t1) > 1e-9).length;
  check(gaps === 0 && list[0].t0 <= 0.2 + 1e-9 && Math.abs(list.at(-1).t1 - L.DURATION) < 1e-9, `${a}: ${list.length} segments, contiguous to ${L.DURATION.toFixed(2)} s`);
}

// 3. kinematics: delta reachable all cycle, T3 joints within limits
check(L.ikFail === 0, `delta IK: ${L.ikFail} unreachable samples of ${L.S.dp.length}`);
for (const sd of L.SIDES) {
  const q = L.S.tq[sd.i];
  const bad = q.filter((v) => Math.abs(v[0]) > L.T3.lim1 * Math.PI / 180 + 1e-9 || Math.abs(v[1]) > L.T3.lim2 * Math.PI / 180 + 1e-9
    || v[2] > L.T3.zTop + 1e-9 || v[2] < L.T3.zTop - L.T3.stroke - 1e-9 || Math.abs(v[3]) > 2 * Math.PI).length;
  check(bad === 0, `${sd.name} joints within limits at all ${q.length} samples`);
}

// 4. clearance per pair >= 25 mm
const pairs = ["Delta-T3A", "Delta-T3B", "T3A-T3B"];
L.minClear.forEach((c, j) => check(c.m >= 0.025, `min clearance ${pairs[j]} = ${mm(c.m)} mm at ${c.at.toFixed(2)} s (>= 25 mm)`));

console.log(`\ncycle ${L.DURATION.toFixed(2)} s · ${L.parts.filter((p) => !p.reject).length} boxed · per side ${L.SIDES.map((sd) => L.parts.filter((p) => p.side === sd.i).length).join("/")}${perturb ? " · PERTURBED" : ""}`);
console.log(fails ? `${fails} check(s) failed` : "all checks passed");
process.exit(fails ? 1 : 0);
