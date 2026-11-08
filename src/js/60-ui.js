// ================================================================ UI
let mode = "program";
const ACTOR_NAME = { conv: "CONV", delta: "DELTA", t3a: "T3-A", t3b: "T3-B" };
const ACTOR_LONG = { conv: "Infeed belt", delta: "Delta robot", t3a: "Epson T3-A", t3b: "Epson T3-B" };
const ACTOR_VAR = { conv: "--conv", delta: "--delta", t3a: "--t3a", t3b: "--t3b" };

// panels
const openPanels = { program: new Set(["live-card", "program-card"]), manual: new Set(["live-card", "jog-card"]) };
function syncPanels() {
  document.querySelectorAll(".rail-item[data-panel]").forEach((b) => {
    const allowed = b.dataset.modes.split(" ").includes(mode);
    b.hidden = !allowed;
    b.setAttribute("aria-pressed", String(allowed && openPanels[mode].has(b.dataset.panel)));
  });
  document.querySelectorAll(".drawer .card").forEach((c) => { c.hidden = !openPanels[mode].has(c.id); });
  $("drawer").hidden = openPanels[mode].size === 0;
  requestAnimationFrame(resize);
}
document.querySelectorAll(".rail-item[data-panel]").forEach((b) => b.addEventListener("click", () => {
  const s = openPanels[mode]; s.has(b.dataset.panel) ? s.delete(b.dataset.panel) : s.add(b.dataset.panel); syncPanels();
}));
document.querySelectorAll(".card .close").forEach((b) => b.addEventListener("click", () => { openPanels[mode].delete(b.closest(".card").id); syncPanels(); }));
if (matchMedia("(max-width: 900px)").matches) { openPanels.program = new Set(); openPanels.manual = new Set(); }

// gift box maps (cavity outline = recipe flavour, filled = praline placed)
const boxCells = SIDES.map((sd) => RECIPE.map((fl) => {
  const d = document.createElement("div"); d.style.setProperty("--fl", `var(--${fl})`); d.title = FLAVOURS[fl];
  $(sd.i ? "box-b" : "box-a").append(d); return d;
}));
$("flavours").innerHTML = Object.entries(FLAVOURS).map(([k, v]) => `<span><i style="background:var(--${k})"></i>${v}</span>`).join("");

// program list
const programItems = [];
for (const a of ACTORS) for (const s of segs[a]) if (s.kind !== "wait") programItems.push({ ...s, actor: a });
programItems.sort((x, y) => x.t0 - y.t0 || ACTORS.indexOf(x.actor) - ACTORS.indexOf(y.actor));
$("program-total").textContent = `${programItems.length} steps · ${DURATION.toFixed(1)} s`;
const programRows = programItems.map((it) => {
  const li = document.createElement("li"); li.dataset.actor = it.actor;
  li.innerHTML = `<i class="fill"></i><span class="chip ${it.actor}">${ACTOR_NAME[it.actor]}</span><span class="label"></span><span class="dur">${(it.t1 - it.t0).toFixed(2)} s</span><code></code>`;
  li.querySelector(".label").textContent = it.label;
  li.querySelector(".label").insertAdjacentHTML("beforeend", `<small>${it.t0.toFixed(1)}</small>`);
  li.querySelector("code").textContent = it.cmd;
  li.addEventListener("click", () => seek(it.t0 + 1e-3));
  $("program").append(li); return li;
});
document.querySelectorAll(".filter button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".filter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  programRows.forEach((li) => { li.hidden = b.dataset.actor !== "all" && li.dataset.actor !== b.dataset.actor; });
}));

// timing stats
function busy(a) { return segs[a].filter((s) => s.kind !== "wait").reduce((n, s) => n + s.t1 - s.t0, 0); }
const util = Object.fromEntries(ACTORS.map((a) => [a, busy(a) / DURATION]));
const good = parts.filter((p) => !p.reject).length;
function renderGantt() {
  const W = 330, rowH = 22, top = 8, left = 46, H = top + rowH * ACTORS.length + 24;
  const x = (t) => left + (t / DURATION) * (W - left - 6);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Busy and waiting time per actor">`;
  ACTORS.forEach((a, r) => {
    const y = top + r * rowH;
    svg += `<text x="0" y="${y + 14}">${ACTOR_NAME[a]}</text>`;
    svg += `<rect x="${left}" y="${y + 3}" width="${W - left - 6}" height="${rowH - 8}" rx="3" fill="${css("--panel-2")}"/>`;
    for (const s of segs[a]) if (s.kind !== "wait") svg += `<rect x="${x(s.t0).toFixed(1)}" y="${y + 3}" width="${Math.max(0.6, x(s.t1) - x(s.t0)).toFixed(1)}" height="${rowH - 8}" fill="${css(ACTOR_VAR[a])}" opacity="${s.kind === "inspect" ? 0.55 : 0.9}"/>`;
  });
  for (let t = 0; t <= DURATION; t += 5) svg += `<text x="${x(t).toFixed(1)}" y="${H - 6}" text-anchor="middle">${t}</text>`;
  svg += `</svg>`;
  const legend = ACTORS.map((a) => `<i style="background:${css(ACTOR_VAR[a])}"></i><span>${ACTOR_LONG[a]}</span><span class="n">${busy(a).toFixed(1)} s</span><span class="n">${(util[a] * 100).toFixed(0)} %</span>`).join("");
  const robots = ["delta", "t3a", "t3b"], bottleneck = robots.reduce((m, a) => (util[a] > util[m] ? a : m), "delta");
  $("gantt").innerHTML = svg + `<div class="legend">${legend}</div><div class="note"><b>${ACTOR_LONG[bottleneck]}</b> sets the pace. Per boxed praline: <b>${(DURATION / good).toFixed(2)} s</b>. The delta serves whichever nest frees first, so the two T3s work in parallel and neither nest is ever shared at the same time.</div>`;
}

// joints
const jointDefs = [
  ...[0, 1, 2].map((i) => ({ group: "delta", label: `θ${i + 1}`, lo: D.lim[0], hi: D.lim[1], unit: "°" })),
  ...SIDES.flatMap((sd) => [
    { group: sd.id, label: "J1", lo: -T3.lim1, hi: T3.lim1, unit: "°" },
    { group: sd.id, label: "J2", lo: -T3.lim2, hi: T3.lim2, unit: "°" },
    { group: sd.id, label: "J3 (Z)", lo: -T3.stroke * 1000, hi: 0, unit: " mm" },
    { group: sd.id, label: "J4", lo: -T3.lim4, hi: T3.lim4, unit: "°" },
  ]),
];
const GROUP_TITLE = { delta: "Delta · shoulders", t3a: "Epson T3-401S · A", t3b: "Epson T3-401S · B" };
let lastGroup = null;
const jointRows = jointDefs.map((j) => {
  if (j.group !== lastGroup) { const h = document.createElement("h3"); h.className = j.group; h.textContent = GROUP_TITLE[j.group]; $("joints").append(h); lastGroup = j.group; }
  const row = document.createElement("div"); row.className = "joint";
  row.innerHTML = `<span>${j.label}</span><div class="track ${j.group}"><i></i></div><span class="v">0</span>`;
  $("joints").append(row); return { ...j, track: row.querySelector(".track"), dot: row.querySelector("i"), v: row.querySelector(".v") };
});
const t3Vals = (q) => [q[0] * DEG, q[1] * DEG, (q[2] - T3.zTop) * 1000, q[3] * DEG];
function showJoints(ang, qs) {
  const vals = [...(ang || [0, 0, 0]).map((a) => a * DEG), ...t3Vals(qs[0]), ...t3Vals(qs[1])];
  jointRows.forEach((r, i) => {
    const v = vals[i], f = (v - r.lo) / (r.hi - r.lo);
    r.dot.style.left = `${clamp(f, 0, 1) * 100}%`; r.v.textContent = `${v.toFixed(1)}${r.unit}`;
    r.track.classList.toggle("near", f < 0.04 || f > 0.96);
  });
}

// report
for (const a of ["delta", "t3a", "t3b"]) {
  $("tcp").insertAdjacentHTML("beforeend", `<span class="chip ${a}">${ACTOR_NAME[a]}</span>` + ["x", "y", "z"].map((c) => `<div><small>${c}</small><b id="tcp-${a}-${c}">0</b></div>`).join(""));
}
const okClear = (c) => `<span class="${c.m > 0.025 ? "ok" : "warn"}">${(c.m * 1000).toFixed(0)} mm</span> at ${c.at.toFixed(1)} s`;
const reportRows = [
  ["Cycle time", `${DURATION.toFixed(1)} s`],
  ["Pralines in / boxed / rejected", `${N_PARTS} / ${good} / ${N_PARTS - good}`],
  ["Gift boxes filled", `${Math.floor(good / CAP)} × ${CAP}`],
  ["Throughput (boxed)", `${(60 * good / DURATION).toFixed(1)} /min · ${Math.round(3600 * good / CAP / DURATION)} boxes/h`],
  ...PAIRS.map((pr, j) => [`Min. ${pr[0]} ↔ ${pr[1]}`, okClear(minClear[j])]),
  ["Delta IK over the cycle", ikFail ? `<span class="warn">${ikFail} unreachable samples</span>` : `<span class="ok">all reachable</span>`],
  ["Delta peak TCP speed", `${peakV.toFixed(2)} m/s`],
  ["Delta peak shoulder speed", `${(peakW * DEG).toFixed(0)} °/s`],
  ["Utilisation delta / A / B", `${(util.delta * 100).toFixed(0)} / ${(util.t3a * 100).toFixed(0)} / ${(util.t3b * 100).toFixed(0)} %`],
  ["Shared zones", "nest A, nest B · Ø180 mm, one mutex each"],
  ["Box recipe", "3 dark · 3 milk · 2 ruby"],
  ["Belt top / nest top / box floor", `${B.top * 1000} / ${SIDES[0].nest.top * 1000} / ${BOX.top * 1000} mm`],
  ["Delta base height", `${D.zb * 1000} mm, arms ${D.RF * 1000} / ${D.RE * 1000}`],
  ["T3 reach / stroke", `${(T3.L1 + T3.L2) * 1000} / ${T3.stroke * 1000} mm`],
];
$("report").innerHTML = reportRows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
$("copy-csv").addEventListener("click", () => {
  const j = (p) => ["j1_deg", "j2_deg", "z_mm", "j4_deg"].map((n) => `${p}_${n}`);
  const head = ["t_s", "delta_x_mm", "delta_y_mm", "delta_z_mm", "theta1_deg", "theta2_deg", "theta3_deg", ...j("t3a"), ...j("t3b"), "clear_delta_t3a_mm", "clear_delta_t3b_mm", "clear_t3a_t3b_mm"].join(",");
  const tq = (q) => [(q[0] * DEG).toFixed(2), (q[1] * DEG).toFixed(2), (q[2] * 1000).toFixed(1), (q[3] * DEG).toFixed(2)];
  const rows = S.dp.map((p, n) => [(n / RATE).toFixed(3), ...p.map((v) => (v * 1000).toFixed(1)), ...S.da[n].map((a) => (a * DEG).toFixed(2)),
    ...tq(S.tq[0][n]), ...tq(S.tq[1][n]), ...S.cl.map((l) => (l[n] * 1000).toFixed(1))].join(","));
  const text = [head, ...rows].join("\n");
  const done = (ok) => { $("copy-note").textContent = ok ? `Copied ${rows.length} rows. Paste into a spreadsheet.` : "The browser refused the clipboard. The CSV was printed to the console instead."; };
  navigator.clipboard.writeText(text).then(() => done(true), () => { console.log(text); done(false); });
});

// timeline lanes
const lanes = $("lanes");
function drawLanes() {
  const w = lanes.clientWidth, h = lanes.clientHeight; if (!w) return;
  const dpr = Math.min(devicePixelRatio, 2); lanes.width = w * dpr; lanes.height = h * dpr;
  const g = lanes.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  ACTORS.forEach((a, r) => {
    const y = 3 + r * 11.5;
    g.fillStyle = css("--line"); g.fillRect(0, y, w, 9);
    g.fillStyle = css(ACTOR_VAR[a]);
    for (const s of segs[a]) if (s.kind !== "wait") { g.globalAlpha = s.kind === "inspect" ? 0.5 : 0.85; g.fillRect((s.t0 / DURATION) * w, y, Math.max(1, ((s.t1 - s.t0) / DURATION) * w), 9); }
    g.globalAlpha = 1;
  });
  g.fillStyle = css("--bad");
  for (const m of marks.inspect) if (!m.pass) g.fillRect((m.t0 / DURATION) * w, 50, Math.max(2, ((m.t1 - m.t0) / DURATION) * w), 3);
}
$("clock-total").textContent = DURATION.toFixed(1);
$("timeline").setAttribute("aria-valuemax", DURATION.toFixed(1));

// ---------------------------------------------------------------- jog (manual mode)
const jog = { dp: [...P.deltaHome], vac: false, q: SIDES.map((sd) => t3IK(sd, sd.ready)), grip: [false, false] };
const jogDefs = [
  { group: "delta", id: "dx", label: "X", min: -380, max: 320, step: 1, unit: "mm", get: () => jog.dp[0] * 1000, set: (v) => { jog.dp[0] = v / 1000; } },
  { group: "delta", id: "dy", label: "Y", min: -320, max: 320, step: 1, unit: "mm", get: () => jog.dp[1] * 1000, set: (v) => { jog.dp[1] = v / 1000; } },
  { group: "delta", id: "dz", label: "Z", min: 60, max: 330, step: 1, unit: "mm", get: () => jog.dp[2] * 1000, set: (v) => { jog.dp[2] = v / 1000; } },
  ...SIDES.flatMap((sd) => {
    const q = () => jog.q[sd.i];
    return [
      { group: sd.id, id: `${sd.id}j1`, label: "J1", min: -T3.lim1, max: T3.lim1, step: 0.5, unit: "°", get: () => q()[0] * DEG, set: (v) => { q()[0] = v * RAD; } },
      { group: sd.id, id: `${sd.id}j2`, label: "J2", min: -T3.lim2, max: T3.lim2, step: 0.5, unit: "°", get: () => q()[1] * DEG, set: (v) => { q()[1] = v * RAD; } },
      { group: sd.id, id: `${sd.id}j3`, label: "J3 (Z)", min: -T3.stroke * 1000, max: 0, step: 1, unit: "mm", get: () => (q()[2] - T3.zTop) * 1000, set: (v) => { q()[2] = T3.zTop + v / 1000; } },
      { group: sd.id, id: `${sd.id}j4`, label: "J4", min: -T3.lim4, max: T3.lim4, step: 1, unit: "°", get: () => q()[3] * DEG, set: (v) => { q()[3] = v * RAD; } },
    ];
  }),
];
let jogGroup = null;
const jogRows = jogDefs.map((d) => {
  if (d.group !== jogGroup) {
    const h = document.createElement("h3"); h.className = d.group;
    h.innerHTML = d.group === "delta" ? `Delta · TCP (Cartesian) <em id="jog-ik"></em>` : `Epson ${ACTOR_NAME[d.group]} · joints <em></em>`;
    $("jog").append(h); jogGroup = d.group;
  }
  const row = document.createElement("div"); row.className = `jog-row ${d.group}`;
  row.innerHTML = `<label for="jog-${d.id}">${d.label}</label><input type="range" id="jog-${d.id}" min="${d.min}" max="${d.max}" step="${d.step}"><input type="number" id="jog-${d.id}-n" min="${d.min}" max="${d.max}" step="${d.step}" aria-label="${d.label} ${d.unit}">`;
  $("jog").append(row);
  if (d.id === "dz") $("jog").insertAdjacentHTML("beforeend", `<div class="jog-check"><label><input type="checkbox" id="jog-vac"> Vacuum on</label></div>`);
  if (d.id.endsWith("j4")) $("jog").insertAdjacentHTML("beforeend", `<div class="jog-check"><label><input type="checkbox" id="jog-grip-${d.group}"> Fingers closed</label></div>`);
  const range = row.querySelector('input[type="range"]'), num = row.querySelector('input[type="number"]');
  const apply = (v) => { d.set(clamp(Number(v), d.min, d.max)); syncJog(); };
  range.addEventListener("input", () => apply(range.value)); num.addEventListener("change", () => apply(num.value));
  return { d, range, num };
});
$("jog-vac").addEventListener("change", (e) => { jog.vac = e.target.checked; });
SIDES.forEach((sd) => $(`jog-grip-${sd.id}`).addEventListener("change", (e) => { jog.grip[sd.i] = e.target.checked; }));
function syncJog() {
  for (const r of jogRows) { const v = r.d.get(); r.range.value = v; r.num.value = Number(v.toFixed(1)); }
  $("jog-vac").checked = jog.vac; SIDES.forEach((sd) => { $(`jog-grip-${sd.id}`).checked = jog.grip[sd.i]; });
}
$("jog-home").addEventListener("click", () => { jog.dp = [...P.deltaHome]; jog.q = SIDES.map((sd) => t3IK(sd, sd.ready)); jog.vac = false; jog.grip = [false, false]; syncJog(); });
$("jog-copy").addEventListener("click", () => {
  const d = deltaPose(time); jog.dp = [...d.p]; jog.vac = !!d.vac;
  SIDES.forEach((sd) => { const t = t3Pose(sd, time); jog.q[sd.i] = [...t.q]; jog.grip[sd.i] = t.grip > 0.5; });
  syncJog();
});
syncJog();
let lastJogAng = deltaIK(jog.dp);

