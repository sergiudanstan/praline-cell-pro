// ---------------------------------------------------------------- T3-401S: mounting-face coordinates, metres; plan §6.1.
function arm2Outline() {            // convex hull of the front circle around J3 and the rounded rear block
  const P = [];
  for (let i = 0; i < 360; i += 6) { const a = i * RAD; P.push([0.175 + 0.048 * Math.cos(a), 0.048 * Math.sin(a)]); }
  for (const [cx, cy, a0] of [[0.088, 0.0427, 0], [-0.048, 0.0427, 90], [-0.048, -0.0427, 180], [0.088, -0.0427, 270]])
    for (let i = 0; i <= 90; i += 10) { const a = (a0 + i) * RAD; P.push([cx + 0.022 * Math.cos(a), cy + 0.022 * Math.sin(a)]); }
  P.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cross(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.slice().reverse()) { while (up.length > 1 && cross(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));   // ~51 points; check: max x 0.2230, max |y| 0.0647, min x -0.0700
}
// Merge only direct static meshes: joint groups and independently moving fingers stay separate.
function mergeT3Link(group) {
  const batches = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh || o.isInstancedMesh) continue;
    o.updateMatrix();
    let g = o.geometry.clone();
    if (g.index) { const old = g; g = g.toNonIndexed(); old.dispose(); }
    g.applyMatrix4(o.matrix);
    for (const key of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(key)) g.deleteAttribute(key);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!batches.has(o.material)) batches.set(o.material, []);
    batches.get(o.material).push(g);
    group.remove(o); o.geometry.dispose();
  }
  return [...batches].map(([material, geometries]) => {
    const geo = BufferGeometryUtils.mergeGeometries(geometries, false);
    if (!geo) throw new Error("T3 geometry merge failed");
    geometries.forEach((g) => g.dispose());
    return mesh(geo, material, group);
  });
}
// Decorative details not dimensioned by the manual: connector spacing, recesses,
// bevels (0.5 mm), vent holes (6 mm), tag size and screw sockets are visual approximations.
function t3Cylinder(r, z0, z1, material, x, y, parent) {
  const b = Math.min(0.0005, (z1 - z0) / 4, r / 4);
  const o = lathe([[0, z0], [r - b, z0], [r, z0 + b], [r, z1 - b], [r - b, z1], [0, z1]], material, parent);
  o.position.set(x, y, 0); return o;
}
function t3Texture(kind) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const ctx = c.getContext("2d"); ctx.fillStyle = "#aaa"; ctx.fillRect(0, 0, 256, 256);
  if (kind === "vent") {
    ctx.fillStyle = "#111";
    for (let row = 0; row < 6; row++) for (let col = 0; col < 4; col++) {
      ctx.beginPath(); ctx.ellipse(32 + col * 64, 21 + row * 43, 17, 12, 0, 0, 2 * Math.PI); ctx.fill();
    }
  } else {
    ctx.strokeStyle = "#333"; ctx.lineWidth = 6;
    for (let i = -256; i <= 512; i += 64) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i + 64); ctx.stroke(); }
  }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (kind !== "vent") tex.repeat.set(1, 10);
  return tex;
}
const t3ShaftMaterial = M.chrome.clone();
t3ShaftMaterial.bumpMap = t3Texture("shaft"); t3ShaftMaterial.bumpScale = 0.00035;
const t3VentMaterial = M.t3Dark.clone(); t3VentMaterial.map = t3Texture("vent");
t3VentMaterial.map.colorSpace = THREE.SRGBColorSpace;
const t3LedMaterial = M.lampAmber.clone(); t3LedMaterial.emissive.setHex(0xffa020); t3LedMaterial.emissiveIntensity = 1;
function buildT3(sd) {
  const root = new THREE.Group(); root.position.set(sd.x, sd.y, T3G.riser); root.rotation.z = sd.face; world.add(root);
  // Pedestal remains separate from proc.base so the optional CAD can replace the robot alone.
  const pedestal = new THREE.Group(); root.add(pedestal);
  rbox(0.210, 0.170, 0.015, 0.003, M.aluClear, -0.055, 0, -0.0075, pedestal);
  rbox(0.240, 0.200, 0.015, 0.003, M.aluClear, -0.055, 0, -0.1275, pedestal);
  for (const x of [-0.135, 0.025]) for (const y of [-0.060, 0.060]) profileBeam(V(x, y, -0.120), V(x, y, -0.015), pedestal);
  const tag = labelPlane(sd.letter, 0.035, 0.012, { bg: sd.i ? "#8a3db5" : "#2f4fb8", fg: "#ffffff" });
  tag.position.set(0.0651, 0, -0.1275); tag.rotation.set(Math.PI / 2, 0, Math.PI / 2); pedestal.add(tag);
  mergeT3Link(pedestal);
  const base = new THREE.Group(); root.add(base);
  rbox(0.180, 0.142, 0.008, 0.0035, M.t3White, -0.055, 0, 0.004, base);
  for (const x of [0.020, -0.100]) for (const y of [-0.060, 0.060]) t3Cylinder(0.0065, 0.008, 0.016, M.t3Dark, x, y, base);
  rbox(0.172, 0.120, 0.178, 0.010, M.t3White, -0.054, 0, 0.097, base);
  rbox(0.076, 0.120, 0.062, 0.006, M.t3White, -0.102, 0, 0.211, base);
  extrudeXZ([[0, 0.236], [-0.145, 0.236], [-0.145, 0.356], [-0.085, 0.416], [0, 0.416]], -0.062, 0.062, M.t3White, base, 0.004);
  t3Cylinder(0.052, 0.236, 0.416, M.t3White, 0, 0, base);
  const vent = rbox(0.075, 0.090, 0.001, 0.0004, t3VentMaterial, -0.1154, 0, 0.3864, base); vent.rotation.y = -Math.PI / 4;
  const led = mesh(new THREE.SphereGeometry(0.009, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), t3LedMaterial, base);
  led.rotation.x = Math.PI / 2; led.position.set(-0.040, 0.030, 0.416);
  rbox(0.002, 0.090, 0.150, 0.0005, M.t3Dark, -0.141, 0, 0.100, base);
  // Rear connector dimensions follow the table; small port recesses approximate the drawing.
  for (const z of [0.095, 0.145]) rbox(0.004, 0.012, 0.045, 0.001, M.steel, -0.144, 0.012, z, base);
  rbox(0.006, 0.040, 0.012, 0.002, M.steel, -0.145, 0, 0.077, base);
  rbox(0.008, 0.014, 0.015, 0.001, M.steel, -0.146, 0.030, 0.113, base);
  rbox(0.009, 0.009, 0.010, 0.001, M.blackPlastic, -0.147, 0.030, 0.113, base);
  rbox(0.007, 0.012, 0.006, 0.001, M.steel, -0.145, 0.030, 0.139, base);
  rbox(0.008, 0.009, 0.003, 0.0005, M.blackPlastic, -0.146, 0.030, 0.139, base);
  rbox(0.010, 0.050, 0.040, 0.003, M.t3Dark, -0.147, 0, 0.048, base);
  for (const [z, r, material] of [[0.085, 0.003, M.puBlue], [0.106, 0.003, M.puBlue], [0.127, 0.002, M.puBlue], [0.148, 0.003, M.whitePOM]]) {
    const fitting = t3Cylinder(r, 0, 0.012, material, 0, 0, base); fitting.rotation.y = -Math.PI / 2; fitting.position.set(-0.142, -0.030, z);
  }
  const tp = t3Cylinder(0.012, 0, 0.008, M.t3Dark, 0, 0, base); tp.rotation.y = -Math.PI / 2; tp.position.set(-0.145, 0, 0.313);
  t3Cylinder(0.022, 0.416, 0.446, M.t3Dark, 0, 0, base);
  const j1 = new THREE.Group(); root.add(j1);
  const arm1 = stadium(T3.L1, 0.039, 0.035, M.t3White, j1);
  // Normalize the helper's bevel-inclusive bounds to the exact table dimensions.
  arm1.geometry.computeBoundingBox();
  const bounds = arm1.geometry.boundingBox, size = bounds.getSize(V());
  arm1.geometry.translate(-bounds.min.x, -bounds.min.y, -bounds.min.z);
  arm1.geometry.scale((T3.L1 + 0.078) / size.x, 0.078 / size.y, 0.035 / size.z);
  arm1.geometry.translate(-0.039, -0.039, T3G.a1[0]);
  t3Cylinder(0.045, 0.186, 0.192, M.t3Dark, 0, 0, j1);
  const points = [V(0, 0, 0.446), V(0, 0, 0.486)];
  for (let i = 1; i <= 24; i++) { const a = Math.PI - i * Math.PI / 24; points.push(V(0.1125 + 0.1125 * Math.cos(a), 0, 0.486 + 0.1125 * Math.sin(a))); }
  points.push(V(0.225, 0, 0.4427)); tubeAlong(points, T3G.ductR, M.duct, j1, 96, 16);
  const j2 = new THREE.Group(); j2.position.set(T3.L1, 0, 0); j1.add(j2);
  t3Cylinder(0.035, 0.2273, 0.2362, M.t3Dark, 0, 0, j2);
  extrudeXY(arm2Outline(), 0.2362, 0.388, M.t3White, j2, 0.005);
  extrudeXZ([[-0.070, 0.383], [0.135, 0.383], [0.010, 0.4127], [-0.070, 0.4127]], -0.060, 0.060, M.t3White, j2, 0.005);
  t3Cylinder(0.040, 0.214, 0.398, M.t3White, 0.175, 0, j2);
  lathe([[0.030, 0.205], [0.040, 0.236]], M.t3White, j2).position.x = 0.175;
  t3Cylinder(0.030, 0.398, 0.404, M.t3Dark, 0.175, 0, j2);
  t3Cylinder(0.041, 0.2345, 0.2375, M.t3Dark, 0.175, 0, j2);
  t3Cylinder(0.022, 0.4127, 0.4427, M.t3Dark, 0, 0, j2);
  rbox(0.031, 0.013, 0.006, 0.001, M.t3Dark, 0.040, 0.025, 0.410, j2);
  for (const [x, y, r] of [[0.045, -0.022, 0.003], [0.065, -0.022, 0.003], [0.065, 0, 0.002]]) t3Cylinder(r, 0.405, 0.417, M.puBlue, x, y, j2);
  t3Cylinder(0.006, 0.389, 0.395, M.t3Dark, 0.110, 0.022, j2);
  const quill = new THREE.Group(); world.add(quill);
  t3Cylinder(0.008, T3G.tool, T3G.tool + T3G.shaftLen, t3ShaftMaterial, 0, 0, quill);
  t3Cylinder(0.015, 0.4157, 0.4277, M.steel, 0, 0, quill);
  t3Cylinder(0.015, 0.105, 0.115, M.steel, 0, 0, quill);
  const gripper = new THREE.Group(); quill.add(gripper);
  t3Cylinder(0.016, 0.055, 0.075, M.aluDark, 0, 0, gripper);
  rbox(0.034, 0.046, 0.030, 0.003, M.aluDark, 0, 0, 0.040, gripper);
  rbox(0.010, 0.050, 0.006, 0.0015, M.aluDark, 0, 0, 0.025, gripper);
  for (const y of [-0.012, 0.012]) { const f = t3Cylinder(0.003, 0, 0.010, M.puBlue, 0, 0, gripper); f.rotation.y = Math.PI / 2; f.position.set(0.017, y, 0.045); }
  mergeT3Link(gripper);
  const fingers = [-1, 1].map((sg) => { const f = rbox(0.012, 0.008, 0.030, 0.002, M.siliconeBlue, 0, sg * 0.022, 0.010, gripper); f.userData.sg = sg; return f; });
  const proc = { base: mergeT3Link(base), arm1: mergeT3Link(j1), arm2: mergeT3Link(j2), shaft: mergeT3Link(quill) };
  return { sd, root, j1, j2, quill, gripper, fingers, proc };
}
const t3Models = SIDES.map(buildT3);
function setT3(m, q, grip) {
  m.j1.rotation.z = q[0]; m.j2.rotation.z = q[1];
  const k = t3FK(m.sd, q); m.quill.position.set(k.j3[0], k.j3[1], q[2]); m.gripper.rotation.z = k.yaw;
  const half = lerp(0.022, PW / 2 + 0.002, grip);
  m.fingers.forEach((f) => { f.position.y = f.userData.sg * half; });
}
function t3Check() {
  let maxMM = 0;
  for (const m of t3Models) {
    const saved = [m.j1.rotation.z, m.j2.rotation.z];
    try {
      for (let i = 0; i < 20; i++) {
        const q = [(Math.random() * 2 - 1) * T3.lim1 * RAD, (Math.random() * 2 - 1) * T3.lim2 * RAD, T3.zTop, 0];
        m.j1.rotation.z = q[0]; m.j2.rotation.z = q[1]; m.root.updateWorldMatrix(true, true);
        const p = m.j2.localToWorld(V(T3.L2, 0, 0)), expected = t3FK(m.sd, q).j3;
        // world may be rotated for display; compare in the cell's z-up coordinates.
        world.worldToLocal(p);
        const mm = Math.hypot(p.x - expected[0], p.y - expected[1]) * 1000;
        if (!Number.isFinite(mm)) throw new Error("Non-finite T3 kinematic check");
        maxMM = Math.max(maxMM, mm);
      }
    } finally { m.j1.rotation.z = saved[0]; m.j2.rotation.z = saved[1]; m.root.updateWorldMatrix(true, true); }
  }
  return maxMM;
}
window.pcHooks = Object.assign(window.pcHooks || {}, { t3Check });
