// @@logic-start  (pure JS, no DOM and no three.js: tests/run.mjs evaluates this block in Node)
const DEG = 180 / Math.PI, RAD = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, s) => a + (b - a) * s;
const ease = (s) => s * s * s * (10 + s * (6 * s - 15));          // minimum-jerk profile
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ================================================================ cell geometry (metres, z up, deck z = 0, belt along +x)
const CELL = {
  table: { x: 1.80, y: 1.36, legs: 0.86 },
  belt: { y: 0.0, x0: -0.88, x1: -0.04, w: 0.10, top: 0.095, pick: -0.14, pitch: 0.075 },
  tunnel: { x0: -0.88, x1: -0.60 },
  part: { w: 0.028, h: 0.020 },                              // praline footprint and height
};
// Gift box: 2 x 4 cavities. Slot n sits at x0 + col * pitch, and rows step away from the belt.
const BOX = { cols: 4, rows: 2, pitch: 0.036, x0: 0.43, y0: 0.20, top: 0.060, exitLen: 0.34, exitT: 2.0 };
const CAP = BOX.cols * BOX.rows;
const RECIPE = ["dark", "milk", "ruby", "milk", "ruby", "dark", "milk", "dark"];   // per box: 3 dark, 3 milk, 2 ruby
const FLAVOURS = { dark: "Dark 70 % dome", milk: "Milk praliné square", ruby: "Ruby heart" };
// Delta: three revolute shoulders at radius F, upper arm RF, parallelogram lower arm RE, effector radius E.
const DELTA = { cx: 0.0, cy: 0.0, zb: 0.82, F: 0.100, E: 0.035, RF: 0.200, RE: 0.520, tool: 0.100,
                lim: [-40, 95], arms: [90, 210, 330] };
// Epson T3-401S: 225 + 175 mm arms, 150 mm Z stroke, J1 ±132°, J2 ±141°, J4 ±360°.
const T3 = { L1: 0.225, L2: 0.175, zTop: 0.21, stroke: 0.150, lim1: 132, lim2: 141, lim4: 360 };
// Real T3-401S envelope from Epson's outer-dimension drawing, metres above the T3 mounting face.
// The T3 stands on a riser: shaft end at stroke top is 150 mm above the mounting face, so riser + 0.150 - tool = T3.zTop.
const T3G = { riser: 0.135, tool: 0.075, a1: [0.1923, 0.2273], a2: [0.2362, 0.4127], a2Front: 0.0478, a2Rear: 0.070,
              shaftLen: 0.3407, ductBase: 0.446, ductTop: 0.5985, ductR: 0.017 };
// Belt what-if: seconds per 75 mm index. index0 reproduces the validated 42.51 s cycle.
const BELT = { index0: 0.70, index: 0.70, min: 0.35, max: 2.80, step: 0.05 };
const SAFE_DELTA = 0.215, SAFE_T3 = 0.20;                // approach heights (TCP z)
// Two mirrored stations, A on the -y side of the belt and B on the +y side. Each T3 faces the belt.
const SIDES = [-1, 1].map((s, i) => ({
  i, s, id: i ? "t3b" : "t3a", name: i ? "T3-B" : "T3-A", letter: i ? "B" : "A",
  x: 0.30, y: 0.45 * s, face: -s * Math.PI / 2,
  nest: { x: 0.14, y: 0.17 * s, top: 0.095 },
  cam: { x: 0.30, y: 0.15 * s, top: 0.04, hover: 0.16 },
  reject: { x: 0.52, y: 0.37 * s, top: 0.10 },
  ready: [0.36, 0.25 * s, SAFE_T3],
}));
const DELTA_PICK_Z = CELL.belt.top + CELL.part.h;        // delta TCP is the suction cup face
const DELTA_NEST_Z = SIDES[0].nest.top + CELL.part.h;
const T3_GRIP_NEST = SIDES[0].nest.top + CELL.part.h / 2;   // T3 TCP is at the fingertip centre
const T3_GRIP_BOX = BOX.top + CELL.part.h / 2;
const N_PARTS = 18;
const REJECTS = new Set([4, 11]);                         // pralines 5 and 12 fail inspection (bloom / crack)

// ---------------------------------------------------------------- kinematics
function deltaIK(p) {   // p: TCP world [x,y,z]  -> shoulder angles (rad, + = down) or null
  const x = p[0] - DELTA.cx, y = p[1] - DELTA.cy, z = p[2] + DELTA.tool - DELTA.zb;
  const out = [];
  for (const th of DELTA.arms) {
    const c = Math.cos(th * RAD), s = Math.sin(th * RAD);
    const xl = x * c + y * s, yl = -x * s + y * c;            // world -> arm frame
    const a = yl - DELTA.E + DELTA.F;
    const A = 2 * a * DELTA.RF, B = 2 * z * DELTA.RF;
    const C = DELTA.RE ** 2 - xl * xl - a * a - DELTA.RF ** 2 - z * z;
    const r = Math.hypot(A, B);
    if (Math.abs(C / r) > 1) return null;
    const al = Math.atan2(B, A) + Math.acos(C / r);
    if (al * DEG < DELTA.lim[0] || al * DEG > DELTA.lim[1]) return null;
    out.push(al);
  }
  return out;
}
function t3FK(sd, q) {      // q: [q1, q2 (rad), z (TCP), q4] -> points
  const p1 = sd.face + q[0], p2 = p1 + q[1];
  const j2 = [sd.x + T3.L1 * Math.cos(p1), sd.y + T3.L1 * Math.sin(p1)];
  const j3 = [j2[0] + T3.L2 * Math.cos(p2), j2[1] + T3.L2 * Math.sin(p2)];
  return { j2, j3, tcp: [j3[0], j3[1], q[2]], yaw: p2 + q[3] };
}
function t3IK(sd, p, yaw = 0, prefer = null) {
  const dx = p[0] - sd.x, dy = p[1] - sd.y, r2 = dx * dx + dy * dy;
  const c2 = (r2 - T3.L1 ** 2 - T3.L2 ** 2) / (2 * T3.L1 * T3.L2);
  if (Math.abs(c2) > 1) return null;
  const sols = [1, -1].map((sg) => {
    const q2 = sg * Math.acos(c2);
    const p1 = Math.atan2(dy, dx) - Math.atan2(T3.L2 * Math.sin(q2), T3.L1 + T3.L2 * Math.cos(q2));
    const q1 = wrap(p1 - sd.face);
    const q4 = wrap(yaw - p1 - q2);
    return { q: [q1, q2, p[2], q4], sg };
  }).filter((s) => Math.abs(s.q[0]) <= T3.lim1 * RAD && Math.abs(s.q[1]) <= T3.lim2 * RAD);
  if (!sols.length) return null;
  if (prefer) {   // continuity: the solution nearest the previous joint position
    const jd = (s) => Math.abs(s.q[0] - prefer[0]) + Math.abs(s.q[1] - prefer[1]);
    sols.sort((a, b) => jd(a) - jd(b));
  } else {        // otherwise keep the elbow away from the delta's workspace
    const dist = (s) => { const f = t3FK(sd, s.q); return -Math.hypot(f.j2[0] - DELTA.cx, f.j2[1] - DELTA.cy); };
    sols.sort((a, b) => dist(a) - dist(b));
  }
  return sols[0].q;
}
function mustIK(sd, p, yaw, prefer) {
  const q = t3IK(sd, p, yaw, prefer);
  if (!q) throw new Error(`${sd.name}: point ${p.map((v) => (v * 1000).toFixed(0)).join(", ")} mm is out of reach`);
  return q;
}

// ---------------------------------------------------------------- program: scheduled with interlocks
const P = {
  deltaHome: [CELL.belt.pick, CELL.belt.y, SAFE_DELTA + 0.05],
  abovePick: [CELL.belt.pick, CELL.belt.y, SAFE_DELTA],
  pick: [CELL.belt.pick, CELL.belt.y, DELTA_PICK_Z],
  aboveNest: SIDES.map((sd) => [sd.nest.x, sd.nest.y, SAFE_DELTA]),
  nest: SIDES.map((sd) => [sd.nest.x, sd.nest.y, DELTA_NEST_Z]),
};
const slotXY = (sd, n) => [BOX.x0 + (n % BOX.cols) * BOX.pitch, sd.s * (BOX.y0 + Math.floor(n / BOX.cols) * BOX.pitch)];

const ACTORS = ["conv", "delta", "t3a", "t3b"];
let segs, zones, parts, marks, boxes;      // rebuilt by rebuild() for each belt index
function resetModel() {
  segs = { conv: [], delta: [], t3a: [], t3b: [] };
  zones = SIDES.map(() => ({ delta: [], t3: [] }));   // mutex intervals per nest
  parts = [];
  marks = { inspect: [] };
  boxes = SIDES.map(() => ({ last: 0, exit: null }));
}
function add(actor, seg) { segs[actor].push(seg); return seg.t1; }

function schedule(beltIndex) {
  let tConv = 0.2, tDelta = 0, pickClear = 0, deltaAt = P.deltaHome, lastSide = 1;
  const st = SIDES.map((sd) => ({ t: 0, q: mustIK(sd, sd.ready), free: 0, good: 0, slot: 0 }));
  const L = CELL.belt.pitch;
  for (let k = 0; k < N_PARTS; k++) {
    const part = { k, track: [{ t: 0, mode: "belt" }], reject: REJECTS.has(k) };
    parts.push(part);
    // the belt indexes one pitch once the pick window is clear
    const ci0 = Math.max(tConv, pickClear);
    if (ci0 > tConv) add("conv", { t0: tConv, t1: ci0, kind: "wait", label: "Wait: pick window occupied", cmd: "WAIT pick_clear" });
    const ci1 = ci0 + beltIndex;
    add("conv", { t0: ci0, t1: ci1, kind: "index", label: `Index praline ${k + 1}`, cmd: `BELT.INDEX ${(L * 1000).toFixed(0)} mm T=${beltIndex.toFixed(2)} s`, k });
    tConv = ci1;

    // dispatch: the nest that frees first, among boxes that still have room
    const open = [0, 1].filter((i) => part.reject || st[i].good < CAP);
    const i = open.sort((a, b) => st[a].free - st[b].free || (a === lastSide) - (b === lastSide))[0];
    const sd = SIDES[i], T = st[i], a = sd.id;
    lastSide = i; part.side = i;
    if (!part.reject) T.good++;

    // delta: pick from the belt, wait for the nest interlock, place, return
    let t = Math.max(tDelta, ci1);
    if (t > tDelta) add("delta", { t0: tDelta, t1: t, kind: "wait", label: "Wait: praline in pick window", cmd: "WAIT part_present", from: deltaAt, to: deltaAt });
    if (deltaAt !== P.abovePick) t = add("delta", { t0: t, t1: t + 0.40, kind: "lin", label: "Approach pick", cmd: "MOVL above_pick", from: deltaAt, to: P.abovePick });
    t = add("delta", { t0: t, t1: t + 0.20, kind: "lin", label: `Descend to praline ${k + 1}`, cmd: "MOVL pick v=500", from: P.abovePick, to: P.pick });
    t = add("delta", { t0: t, t1: t + 0.12, kind: "io", label: "Soft vacuum on", cmd: "DO vac=1; WAIT vac_ok", from: P.pick, to: P.pick, vac: [0, 1] });
    part.track.push({ t, mode: "delta" });
    t = add("delta", { t0: t, t1: t + 0.20, kind: "lin", label: "Lift", cmd: "MOVL above_pick", from: P.pick, to: P.abovePick, vac: [1, 1] });
    pickClear = t;
    if (T.free > t) t = add("delta", { t0: t, t1: T.free, kind: "wait", label: `Wait: nest ${sd.letter} occupied`, cmd: `WAIT nest${sd.letter}_free`, from: P.abovePick, to: P.abovePick, vac: [1, 1] });
    const zoneIn = t;
    t = add("delta", { t0: t, t1: t + 0.50, kind: "arch", label: `Transfer to nest ${sd.letter}`, cmd: `MOVJ arch above_nest${sd.letter}`, from: P.abovePick, to: P.aboveNest[i], vac: [1, 1] });
    t = add("delta", { t0: t, t1: t + 0.20, kind: "lin", label: "Descend into nest", cmd: `MOVL nest${sd.letter} v=300`, from: P.aboveNest[i], to: P.nest[i], vac: [1, 1] });
    t = add("delta", { t0: t, t1: t + 0.10, kind: "io", label: "Vacuum off, soft blow", cmd: "DO vac=0; DO blow=1", from: P.nest[i], to: P.nest[i], vac: [1, 0] });
    part.track.push({ t, mode: "fixed", p: [sd.nest.x, sd.nest.y, sd.nest.top] });
    t = add("delta", { t0: t, t1: t + 0.20, kind: "lin", label: "Lift out of nest", cmd: `MOVL above_nest${sd.letter}`, from: P.nest[i], to: P.aboveNest[i] });
    const released = t + 0.15;                     // delta signals the nest free once clear of it
    zones[i].delta.push([zoneIn, released]);
    t = add("delta", { t0: t, t1: t + 0.45, kind: "arch", label: "Return to pick", cmd: "MOVJ arch above_pick", from: P.aboveNest[i], to: P.abovePick });
    deltaAt = P.abovePick; tDelta = t;

    // T3: nest -> camera -> box cavity or reject bin
    let u = Math.max(T.t, released);
    if (u > T.t) add(a, { t0: T.t, t1: u, kind: "wait", label: "Wait: praline in nest", cmd: `Wait Sw(Nest${sd.letter}) = On`, q0: T.q, q1: T.q });
    const qAN = mustIK(sd, [sd.nest.x, sd.nest.y, SAFE_T3], 0, T.q);
    const t3In = u;
    u = add(a, { t0: u, t1: u + 0.40, kind: "ptp", label: "Go over nest", cmd: "Go P_NestAppr", q0: T.q, q1: qAN });
    const qN = [...qAN]; qN[2] = T3_GRIP_NEST;
    u = add(a, { t0: u, t1: u + 0.24, kind: "lin", label: `Move down to praline ${k + 1}`, cmd: "Move P_Nest", q0: qAN, q1: qN });
    u = add(a, { t0: u, t1: u + 0.18, kind: "io", label: "Close soft fingers", cmd: "On Grip; Wait Sw(GripOK) = On", q0: qN, q1: qN, grip: [0, 1] });
    part.track.push({ t: u, mode: "t3", side: i });
    u = add(a, { t0: u, t1: u + 0.24, kind: "lin", label: "Move up", cmd: "Move P_NestAppr", q0: qN, q1: qAN, grip: [1, 1] });
    T.free = u + 0.15;
    zones[i].t3.push([t3In, T.free]);
    const qC = mustIK(sd, [sd.cam.x, sd.cam.y, sd.cam.hover], 0, qAN);
    u = add(a, { t0: u, t1: u + 0.50, kind: "ptp", label: "Go to camera", cmd: "Go P_Cam", q0: qAN, q1: qC, grip: [1, 1] });
    u = add(a, { t0: u, t1: u + 0.45, kind: "inspect", label: "Inspect from below", cmd: "VRun InspPraline; VGet InspPraline.Passed", q0: qC, q1: qC, grip: [1, 1], k, pass: !part.reject });
    marks.inspect.push({ t0: u - 0.45, t1: u, pass: !part.reject, k, side: i });
    let qA, qP, dest;
    if (part.reject) {
      qA = mustIK(sd, [sd.reject.x, sd.reject.y, SAFE_T3], 0, qC); qP = [...qA]; qP[2] = sd.reject.top + 0.05;
      dest = [sd.reject.x + 0.008, sd.reject.y - 0.006 * sd.s, sd.reject.top - 0.085];
    } else {
      const [sx, sy] = slotXY(sd, T.slot);
      qA = mustIK(sd, [sx, sy, SAFE_T3], 0, qC); qP = [...qA]; qP[2] = T3_GRIP_BOX;
      dest = [sx, sy, BOX.top]; part.slot = T.slot; T.slot++;
    }
    const n = part.slot + 1;
    u = add(a, { t0: u, t1: u + 0.50, kind: "ptp", label: part.reject ? "Go to reject bin" : `Go over cavity ${n}`, cmd: part.reject ? "Go P_RejAppr" : `Go Pallet(${i + 1}, ${n}) +Z(${((SAFE_T3 - T3_GRIP_BOX) * 1000).toFixed(0)})`, q0: qC, q1: qA, grip: [1, 1] });
    u = add(a, { t0: u, t1: u + 0.24, kind: "lin", label: "Move down", cmd: part.reject ? "Move P_Rej" : `Move Pallet(${i + 1}, ${n})`, q0: qA, q1: qP, grip: [1, 1] });
    u = add(a, { t0: u, t1: u + 0.16, kind: "io", label: part.reject ? "Drop in reject bin" : `Release into cavity ${n}`, cmd: "Off Grip", q0: qP, q1: qP, grip: [1, 0] });
    part.track.push({ t: u, mode: "fixed", p: dest, box: part.reject ? null : i });
    u = add(a, { t0: u, t1: u + 0.24, kind: "lin", label: "Move up", cmd: "Move Here +Z", q0: qP, q1: qA });
    if (!part.reject) boxes[i].last = u;
    T.q = qA; T.t = u;
  }
  // both T3s park, and each full box leaves on its exit belt
  for (const sd of SIDES) {
    const T = st[sd.i], qR = mustIK(sd, sd.ready, 0, T.q);
    T.t = add(sd.id, { t0: T.t, t1: T.t + 0.45, kind: "ptp", label: "Go to ready", cmd: "Go P_Ready", q0: T.q, q1: qR });
    T.q = qR;
    const b = boxes[sd.i]; b.exit = [b.last + 0.3, b.last + 0.3 + BOX.exitT];
  }
  const end = Math.max(tConv, tDelta, ...st.map((T) => T.t), ...boxes.map((b) => b.exit[1])) + 0.6;
  for (const a of ACTORS) {
    const last = segs[a].at(-1), t1 = last ? last.t1 : 0, sd = SIDES.find((x) => x.id === a);
    if (t1 < end) segs[a].push({ t0: t1, t1: end, kind: "wait", label: a === "conv" ? "Idle" : "Cycle complete", cmd: "",
      from: a === "delta" ? P.abovePick : undefined, to: a === "delta" ? P.abovePick : undefined,
      q0: sd ? st[sd.i].q : undefined, q1: sd ? st[sd.i].q : undefined });
  }
  // flavours follow the box recipe; a rejected praline keeps the flavour it would have filled
  for (const p of parts) p.flavour = p.reject ? RECIPE[(p.k * 5) % CAP] : RECIPE[p.slot];
  return end;
}
let DURATION;

function segAt(list, t) {
  let lo = 0, hi = list.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (list[mid].t0 <= t) lo = mid; else hi = mid - 1; }
  return list[lo];
}
function deltaPose(t) {
  const s = segAt(segs.delta, t);
  const f = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0), 0, 1), e = ease(f);
  const a = s.from || P.deltaHome, b = s.to || a;
  const p = [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
  if (s.kind === "arch") p[2] += 0.05 * Math.sin(Math.PI * e);
  const vac = s.vac ? (f < 0.5 ? s.vac[0] : s.vac[1]) : 0;
  return { p, vac, seg: s, f };
}
function t3Pose(sd, t) {
  const s = segAt(segs[sd.id], t);
  const f = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0), 0, 1), e = ease(f);
  const a = s.q0, b = s.q1 || a;
  const q = a.map((v, i) => lerp(v, b[i], e));
  const grip = s.grip ? lerp(s.grip[0], s.grip[1], f) : 0;
  return { q, grip, seg: s, f };
}
function convState(t) {
  const s = segAt(segs.conv, t);
  return { seg: s, moving: s.kind === "index" };
}
function beltTravel(t) {   // metres of belt travel since t = 0
  let d = 0;
  for (const s of segs.conv) { if (s.kind !== "index" || s.t0 > t) continue; d += CELL.belt.pitch * ease(clamp((t - s.t0) / (s.t1 - s.t0), 0, 1)); }
  return d;
}
function boxShift(i, t) { const e = boxes[i].exit; return BOX.exitLen * ease(clamp((t - e[0]) / (e[1] - e[0]), 0, 1)); }
function zoneOwner(i, t) {
  for (const [a, b] of zones[i].delta) if (t >= a && t < b) return "delta";
  for (const [a, b] of zones[i].t3) if (t >= a && t < b) return SIDES[i].id;
  return null;
}

// ---------------------------------------------------------------- clearance: capsule model (plain arrays)
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function segDist(p1, q1, p2, q2) {
  const d1 = vsub(q1, p1), d2 = vsub(q2, p2), r = vsub(p1, p2);
  const a = vdot(d1, d1), e = vdot(d2, d2), f = vdot(d2, r);
  let s, t;
  if (a < 1e-12 && e < 1e-12) return Math.hypot(...r);
  if (a < 1e-12) { s = 0; t = clamp(f / e, 0, 1); }
  else {
    const c = vdot(d1, r);
    if (e < 1e-12) { t = 0; s = clamp(-c / a, 0, 1); }
    else {
      const b = vdot(d1, d2), den = a * e - b * b;
      s = den > 1e-12 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  return Math.hypot(...[0, 1, 2].map((j) => p1[j] + d1[j] * s - (p2[j] + d2[j] * t)));
}
function deltaCapsules(p, ang) {   // envelopes of the detailed delta: upper arm + hub, elbow pin + balls, rod pair + sockets + springs, plate, tool
  const eff = [p[0], p[1], p[2] + DELTA.tool], caps = [];
  DELTA.arms.forEach((th, i) => {
    const c = Math.cos(th * RAD), s = Math.sin(th * RAD), al = ang[i];
    const S = [DELTA.cx + DELTA.F * s, DELTA.cy - DELTA.F * c, DELTA.zb];
    const ry = -DELTA.F - DELTA.RF * Math.cos(al);
    const E = [DELTA.cx - ry * s, DELTA.cy + ry * c, DELTA.zb - DELTA.RF * Math.sin(al)];
    const Pp = [eff[0] + DELTA.E * s, eff[1] - DELTA.E * c, eff[2]];
    caps.push([S, E, 0.030],
      [[E[0] - c * 0.038, E[1] - s * 0.038, E[2]], [E[0] + c * 0.038, E[1] + s * 0.038, E[2]], 0.016],
      [E, Pp, 0.041]);
  });
  caps.push([[eff[0], eff[1], eff[2] + 0.006], [eff[0], eff[1], eff[2] - 0.006], 0.060]);
  caps.push([eff, [p[0], p[1], p[2] - 0.002], 0.016]);
  return caps;
}
function t3Capsules(sd, q) {       // envelopes of the real T3-401S: arm 1, arm 2 (two layers), gripper, shaft, cable duct
  const k = t3FK(sd, q), zb = T3G.riser, J1 = [sd.x, sd.y], J2 = k.j2, J3 = k.j3;
  const d = [J3[0] - J2[0], J3[1] - J2[1]], n = Math.hypot(d[0], d[1]);
  const tip = [J3[0] + d[0] / n * T3G.a2Front, J3[1] + d[1] / n * T3G.a2Front];
  const mid = [(J1[0] + J2[0]) / 2, (J1[1] + J2[1]) / 2];
  return [
    [[J1[0], J1[1], zb + 0.21], [J2[0], J2[1], zb + 0.21], 0.045],
    [[J2[0], J2[1], zb + 0.275], [tip[0], tip[1], zb + 0.275], 0.055],
    [[J2[0], J2[1], zb + 0.365], [tip[0], tip[1], zb + 0.335], 0.050],
    [[J3[0], J3[1], q[2] - 0.005], [J3[0], J3[1], q[2] + T3G.tool], 0.030],
    [[J3[0], J3[1], q[2] + T3G.tool], [J3[0], J3[1], q[2] + T3G.tool + T3G.shaftLen], 0.016],
    [[J1[0], J1[1], zb + T3G.ductBase], [mid[0], mid[1], zb + T3G.ductTop], 0.024],
    [[mid[0], mid[1], zb + T3G.ductTop], [J2[0], J2[1], zb + T3G.a2[1]], 0.024],
  ];
}
function capsClear(A, B) {
  let m = Infinity;
  for (const a of A) for (const b of B) m = Math.min(m, segDist(a[0], a[1], b[0], b[1]) - a[2] - b[2]);
  return m;
}
const PAIRS = [["Delta", "T3-A"], ["Delta", "T3-B"], ["T3-A", "T3-B"]];
function clearances(dp, ang, qa, qb) {   // [delta-A, delta-B, A-B] in metres
  const ca = t3Capsules(SIDES[0], qa), cb = t3Capsules(SIDES[1], qb);
  const dc = ang ? deltaCapsules(dp, ang) : null;
  return [dc ? capsClear(dc, ca) : NaN, dc ? capsClear(dc, cb) : NaN, capsClear(ca, cb)];
}

// sample the whole cycle for the report, the paths, the tests and the CSV (redone by rebuild())
const RATE = 30;
let NS, S, ikFail, minClear, peakV, peakW;
function sampleCycle() {
  NS = Math.ceil(DURATION * RATE) + 1;
  S = { dp: [], da: [], tq: [[], []], tp: [[], []], cl: [[], [], []] };
  ikFail = 0;
  for (let n = 0; n < NS; n++) {
    const t = Math.min(DURATION, n / RATE);
    const d = deltaPose(t), a = deltaIK(d.p), qs = SIDES.map((sd) => t3Pose(sd, t).q);
    if (!a) ikFail++;
    S.dp.push(d.p); S.da.push(a || S.da.at(-1) || [0, 0, 0]);
    SIDES.forEach((sd, i) => { S.tq[i].push(qs[i]); S.tp[i].push(t3FK(sd, qs[i]).tcp); });
    clearances(d.p, a, qs[0], qs[1]).forEach((c, j) => S.cl[j].push(c));
  }
  minClear = S.cl.map((list) => {
    let m = Infinity, at = 0;
    list.forEach((c, n) => { if (c < m) { m = c; at = n / RATE; } });
    return { m, at };
  });
  peakV = 0; peakW = 0;
  for (let n = 1; n < NS; n++) {
    peakV = Math.max(peakV, Math.hypot(...S.dp[n].map((x, j) => x - S.dp[n - 1][j])) * RATE);
    for (let j = 0; j < 3; j++) peakW = Math.max(peakW, Math.abs(S.da[n][j] - S.da[n - 1][j]) * RATE);
  }
}
// Rebuilds the program, the sampling and the clearances for a belt index time (s). Returns the fresh model.
function rebuild(beltIndex = BELT.index0) {
  BELT.index = clamp(beltIndex, BELT.min, BELT.max);
  resetModel();
  DURATION = schedule(BELT.index);
  sampleCycle();
  return { segs, zones, parts, marks, boxes, DURATION, S, NS, minClear, ikFail, peakV, peakW, beltIndex: BELT.index };
}
// Schedule only (no sampling), for the what-if chart. Leaves the current model untouched.
function cycleFor(beltIndex) {
  const keep = { segs, zones, parts, marks, boxes, DURATION };
  resetModel();
  const d = schedule(clamp(beltIndex, BELT.min, BELT.max));
  const busyOf = (a) => segs[a].filter((s) => s.kind !== "wait").reduce((n, s) => n + s.t1 - s.t0, 0);
  const waitOf = (a, label) => segs[a].filter((s) => s.kind === "wait" && s.label === label).reduce((n, s) => n + s.t1 - s.t0, 0);
  const out = { beltIndex, DURATION: d, util: Object.fromEntries(ACTORS.map((a) => [a, busyOf(a) / d])),
                deltaWaitsBelt: waitOf("delta", "Wait: praline in pick window"), beltWaits: waitOf("conv", "Wait: pick window occupied") };
  ({ segs, zones, parts, marks, boxes, DURATION } = keep);
  return out;
}
function current() { return { segs, DURATION }; }
rebuild();
console.log("[praline] duration", DURATION.toFixed(2), "ikFail", ikFail, "minClear mm", minClear.map((c) => (c.m * 1000).toFixed(1)).join(" / "));
// @@logic-end

