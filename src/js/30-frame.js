// Floor, base, deck, guard frame, delta bridge, doors, stack, HMI, tray. Plan §6.3.
// Metres, z up. Profiles stay satin anodised: profileBeam writes M.aluClear.
// Polycarbonate sits ≥ 2 mm off the rails; seals stop 1 mm short of the metal (no coplanar faces).
const G = LAYOUT.guard;
const POSTS = G.postsX;
const HALF = 0.02;

const floorMat = mat(0x8a8e92, 0.92, 0.02);
if (M.floor.map) {
  const floorMap = M.floor.map.clone();
  floorMap.repeat.set(24, 24);
  floorMat.map = floorMap;
}
const floor = mesh(new THREE.PlaneGeometry(14, 14), floorMat);
floor.position.z = LAYOUT.floor;
floor.castShadow = false;
floor.receiveShadow = true;
// applyTheme (50) paints floorMat from the near-white backdrop. Put the medium grey back afterwards.
function toneFloor() {
  const root = document.documentElement;
  const dark = root.dataset.theme === "dark" || (root.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  floorMat.color.set(dark ? 0x3a3e42 : 0x8a8e92);
  floorMat.roughness = 0.92;
  floorMat.metalness = 0.02;
}
window.addEventListener("themechange", () => queueMicrotask(toneFloor));
queueMicrotask(toneFloor);

function tapeStrip(x, y, w, d) {
  const o = mesh(new THREE.PlaneGeometry(w, d), M.tape);
  o.position.set(x, y, LAYOUT.floor + 0.003);
  o.castShadow = false;
  o.receiveShadow = false;
  return o;
}
const lineX = 0.92 + 0.45, lineY = 0.75 + 0.45, tapeW = 0.05;
tapeStrip(0, lineY, lineX * 2 + tapeW, tapeW);
tapeStrip(0, -lineY, lineX * 2 + tapeW, tapeW);
tapeStrip(lineX, 0, tapeW, lineY * 2 - tapeW);
tapeStrip(-lineX, 0, tapeW, lineY * 2 - tapeW);

// L bracket 40 × 35 × 4 mm on the outer face, plus a diagonal rib. Two pools so a mirrored leaf stays right-handed.
function bracketGeometry(mirror) {
  const upright = new RoundedBoxGeometry(0.016, 0.004, 0.040, 2, 0.0008);
  upright.translate(0.008, 0.002, 0.020);
  const arm = new RoundedBoxGeometry(0.035, 0.004, 0.016, 2, 0.0008);
  arm.translate(0.0175, 0.002, 0.008);
  const rib = new RoundedBoxGeometry(0.020, 0.003, 0.0035, 2, 0.0004);
  rib.rotateY(Math.PI / 4);
  rib.translate(0.014, 0.002, 0.014);
  const geo = BufferGeometryUtils.mergeGeometries([upright, arm, rib]);
  if (mirror) { geo.scale(1, -1, 1); geo.computeVertexNormals(); }
  return geo;
}
const BRACKET_CAP = 160;
function makeBrackets(mirror) {
  const o = new THREE.InstancedMesh(bracketGeometry(mirror), M.zinc9006, BRACKET_CAP);
  o.count = 0;
  o.castShadow = o.receiveShadow = true;
  o.frustumCulled = false;
  world.add(o);
  return o;
}
const brackets = makeBrackets(false);
const bracketsMir = makeBrackets(true);
const _bQ = new THREE.Quaternion();
const _bM = new THREE.Matrix4();
const _bS = new THREE.Vector3(1, 1, 1);
let bracketsFull = false;
function putBracket(pool, origin, quat) {
  if (pool.count >= BRACKET_CAP) { if (!bracketsFull) { bracketsFull = true; console.warn("brackets: capacity", BRACKET_CAP); } return; }
  _bM.compose(origin, quat, _bS);
  pool.setMatrixAt(pool.count++, _bM);
}
function boltAt(origin, quat, lx, ly, lz, nx, ny, nz) {
  addBolt(V(lx, ly, lz).applyQuaternion(quat).add(origin), V(nx, ny, nz).applyQuaternion(quat));
}
// `along` points from this end into the beam. The leaf sits on the outer face and reaches 16 mm back onto the post.
function addJointBracket(x, y, zBottom, along, proud) {
  const dir = along.clone();
  if (dir.lengthSq() < 1e-8) return;
  dir.normalize();
  const up = V(0, 0, 1);
  const thick = V().crossVectors(up, dir).normalize();
  const out = V(-dir.y, dir.x, 0);
  if (out.x * x + out.y * y < 0) out.negate();
  const mirror = thick.dot(out) < 0;
  _bQ.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, thick, up));
  const origin = V(x, y, zBottom).addScaledVector(dir, -0.016).addScaledVector(out, 0.0195 + (proud || 0));
  putBracket(mirror ? bracketsMir : brackets, origin, _bQ);
  const sy = mirror ? -1 : 1;
  boltAt(origin, _bQ, 0.009, sy * 0.004, 0.028, 0, sy, 0);
  boltAt(origin, _bQ, 0.026, sy * 0.004, 0.008, 0, sy, 0);
}
function rail(x0, y0, x1, y1, zc, proud) {
  profileBeam(V(x0, y0, zc), V(x1, y1, zc));
  const dx = x1 - x0, dy = y1 - y0;
  addJointBracket(x0, y0, zc - HALF, V(dx, dy, 0), proud);
  addJointBracket(x1, y1, zc - HALF, V(-dx, -dy, 0), proud);
}
// Two slot profiles, 80 mm overall. Centres 39.2 mm apart so the seam overlaps 0.8 mm instead of z-fighting.
function rail80(x0, y0, x1, y1, zLow, zHigh) {
  const mid = (zLow + zHigh) / 2;
  rail(x0, y0, x1, y1, mid - 0.0196, 0);
  rail(x0, y0, x1, y1, mid + 0.0196, 0.0015);
}
function endPlug(x, y, z, dir) {
  const n = dir.clone().normalize();
  const o = rbox(0.036, 0.036, 0.004, 0.001, M.blackPlastic, 0, 0, 0);
  o.quaternion.setFromUnitVectors(V(0, 0, 1), n);
  o.position.set(x, y, z).addScaledVector(n, 0.001);
  return o;
}
function turned(profile, material, x, y) {
  const o = lathe(profile, material);
  o.position.set(x, y, 0);
  return o;
}

// ---------------------------------------------------------------- base (z from the floor up to the deck)
const legsX = LAYOUT.base.legsX, legsY = LAYOUT.base.legsY;
const zLeg0 = LAYOUT.floor + LAYOUT.base.foot;
const zLeg1 = -0.114;
for (const lx of legsX) for (const ly of legsY) {
  for (const dx of [-HALF, HALF]) for (const dy of [-HALF, HALF]) profileBeam(V(lx + dx, ly + dy, zLeg0), V(lx + dx, ly + dy, zLeg1));
  turned([[0, -0.8604], [0.036, -0.8604], [0.040, -0.8592], [0.040, -0.8492], [0.036, -0.848], [0, -0.848]], M.blackRubber, lx, ly);
  turned([[0, -0.848], [0.0072, -0.848], [0.008, -0.8472], [0.008, -0.770], [0.0072, -0.769], [0, -0.769]], M.steel, lx, ly);
  const nut = mesh(new THREE.CylinderGeometry(0.0138, 0.0138, 0.014, 6), M.zinc9006);
  nut.rotation.x = Math.PI / 2;
  nut.position.set(lx, ly, -0.768);
  rbox(0.080, 0.080, 0.005, 0.001, M.blackPlastic, lx, ly, -0.759);
}
function legSpans(values) {
  const out = [];
  for (let i = 0; i < values.length - 1; i++) out.push([values[i] + 0.04 - 0.008, values[i + 1] - 0.04 + 0.008]);
  return out;
}
const baseX = legSpans(legsX);
const baseY0 = legsY[0] + 0.04 - 0.008, baseY1 = legsY[1] - 0.04 + 0.008;
for (const y of legsY) for (const [a, b] of baseX) {
  rail80(a, y, b, y, LAYOUT.base.topRailZ[0], LAYOUT.base.topRailZ[1]);
  rail(a, y, b, y, LAYOUT.base.railZ);
}
for (const x of [legsX[0], legsX[legsX.length - 1]]) {
  rail80(x, baseY0, x, baseY1, LAYOUT.base.topRailZ[0], LAYOUT.base.topRailZ[1]);
  rail(x, baseY0, x, baseY1, LAYOUT.base.railZ);
}
function skin(sx, sy, sz, x, y, z) { return rbox(sx, sy, sz, 0.0015, M.cabinet, x, y, z); }
const skinZ = -0.4325, skinH = 0.625;
const bay = [{ cx: -0.430, w: 0.774 }, { cx: 0.430, w: 0.774 }];
for (const { cx, w } of bay) skin(w, 0.0015, skinH, cx, 0.7512, skinZ);
skin(0.0015, 1.328, skinH, 0.9012, 0, skinZ);
skin(0.0015, 1.328, skinH, -0.9012, 0, skinZ);
for (const { cx, w } of bay) {
  const yFace = -0.75195;
  skin(w, 0.0015, skinH, cx, -0.7512, skinZ);
  const edge = cx - w / 2;
  for (const z of [-0.58, -0.30]) {
    rbox(0.012, 0.016, 0.046, 0.0015, M.zinc9006, edge + 0.004, yFace - 0.006, z);
    vcyl(0.003, 0.050, M.steel, edge + 0.004, yFace - 0.006, z);
  }
  rbox(0.150, 0.006, 0.024, 0.001, M.blackPlastic, cx, yFace - 0.003, -0.42);
  rbox(0.120, 0.004, 0.006, 0.0008, M.steel, cx, yFace - 0.006, -0.408);
  const lock = vcyl(0.008, 0.008, M.zinc9006, cx + 0.09, yFace - 0.007, -0.34);
  lock.rotation.set(0, 0, 0);
  for (let i = 0; i < 5; i++) rbox(0.070, 0.003, 0.004, 0.0006, M.aluDark, cx - 0.06, yFace - 0.002, -0.62 - i * 0.010);
}

// ---------------------------------------------------------------- deck: aluminium plate, 3 mm skin, 30 mm skirt. Holes clear the camera stacks (32).
function deckOutline() {
  const s = new THREE.Shape();
  s.moveTo(-0.90, -0.75); s.lineTo(0.90, -0.75); s.lineTo(0.90, 0.75); s.lineTo(-0.90, 0.75); s.closePath();
  for (const sy of [-1, 1]) {
    const cx = 0.30, cy = 0.15 * sy, a = 0.040;
    const h = new THREE.Path();
    h.moveTo(cx - a, cy - a); h.lineTo(cx - a, cy + a); h.lineTo(cx + a, cy + a); h.lineTo(cx + a, cy - a); h.closePath();
    s.holes.push(h);
  }
  return s;
}
extrudeXY(deckOutline(), -0.036, -0.0025, M.aluBlasted, world, 0);
extrudeXY(deckOutline(), -0.0035, 0, M.deck, world, 0);
rbox(1.805, 0.0025, 0.029, 0.0008, M.deck, 0, 0.7502, -0.0155);
rbox(1.805, 0.0025, 0.029, 0.0008, M.deck, 0, -0.7502, -0.0155);
rbox(0.0025, 1.505, 0.029, 0.0008, M.deck, 0.9002, 0, -0.0155);
rbox(0.0025, 1.505, 0.029, 0.0008, M.deck, -0.9002, 0, -0.0155);

// ---------------------------------------------------------------- guard frame
const guardPanels = [];
Object.defineProperty(guardPanels, "visible", {
  get() { return guardPanels.every((o) => o.visible); },
  set(v) { for (const o of guardPanels) o.visible = v; },
});
const pcMat = M.pcClear.clone();
pcMat.color.set(0xb7c3cc);
pcMat.opacity = 0.18;
pcMat.transparent = true;
pcMat.depthWrite = false;
pcMat.side = THREE.DoubleSide;
function pc(sx, sy, sz, x, y, z) {
  const o = rbox(sx, sy, sz, 0.001, pcMat, x, y, z);
  o.castShadow = false;
  o.receiveShadow = false;
  guardPanels.push(o);
  return o;
}
function band(sx, sy, sz, x, y, z) {
  const o = rbox(sx, sy, sz, 0.0006, M.sealBlack, x, y, z);
  o.castShadow = false;
  guardPanels.push(o);
  return o;
}
const xSeg = [];
for (let i = 0; i < POSTS.length - 1; i++) xSeg.push([POSTS[i] + HALF - 0.004, POSTS[i + 1] - HALF + 0.004]);
for (const x of POSTS) for (const y of [G.y0, G.y1]) {
  profileBeam(V(x, y, -0.002), V(x, y, G.h));
  endPlug(x, y, G.h, V(0, 0, 1));
}
for (const y of [G.y0, G.y1]) for (const [a, b] of xSeg) rail80(a, y, b, y, 1.02, G.h);
for (const x of [G.x0, G.x1]) rail80(x, G.y0 + HALF - 0.004, x, G.y1 - HALF + 0.004, 1.02, G.h);
for (const y of [G.y0, G.y1]) for (const [a, b] of xSeg) rail(a, y, b, y, (G.kick + 0.06) / 2);
// Kick rail stops at the tunnel mouth and at the two exit mouths. Ends bury 4 mm into the posts.
rail(G.x0, G.y0 + HALF - 0.004, G.x0, -0.13, 0.08);
rail(G.x0, 0.13, G.x0, G.y1 - HALF + 0.004, 0.08);
endPlug(G.x0, -0.13, 0.08, V(0, 1, 0));
endPlug(G.x0, 0.13, 0.08, V(0, -1, 0));
const exit = LAYOUT.openings.exit;
for (const sy of [-1, 1]) {
  const yA = sy * exit.y - exit.w / 2, yB = sy * exit.y + exit.w / 2;
  endPlug(G.x1, yA, 0.08, V(0, 1, 0));
  endPlug(G.x1, yB, 0.08, V(0, -1, 0));
}
rail(G.x1, G.y0 + HALF - 0.004, G.x1, -exit.y - exit.w / 2, 0.08);
rail(G.x1, -exit.y + exit.w / 2, G.x1, exit.y - exit.w / 2, 0.08);
rail(G.x1, exit.y + exit.w / 2, G.x1, G.y1 - HALF + 0.004, 0.08);
const brace = 0.25 / Math.SQRT2;
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const y = sy * 0.742;
  const a = V(sx * 0.90, y, 1.04 - brace);
  const b = V(sx * (0.90 - brace), y, 1.04);
  const d = b.clone().sub(a).normalize();
  profileBeam(a.clone().addScaledVector(d, -0.012), b.clone().addScaledVector(d, 0.012));
}

// Fixed polycarbonate on the short ends. Sheets stay 2 mm off the rails; gaskets sit on the sheet.
function endSheet(x, y0, y1, z0, z1) { pc(0.006, y1 - y0, z1 - z0, x, (y0 + y1) / 2, (z0 + z1) / 2); }
function yBand(x, y0, y1, z) { band(0.008, y1 - y0, 0.007, x, (y0 + y1) / 2, z); }
function zBand(x, y, z0, z1) { band(0.008, 0.007, z1 - z0, x, y, (z0 + z1) / 2); }
const zA = G.kick + 0.002, zB = 1.018;
const feed = LAYOUT.openings.infeed;
const yIn0 = feed.y[0], yIn1 = feed.y[1], zIn = feed.z[1];
endSheet(-0.875, -0.708, yIn0 - 0.002, zA, zB);
endSheet(-0.875, yIn1 + 0.002, 0.708, zA, zB);
endSheet(-0.875, yIn0 + 0.002, yIn1 - 0.002, zIn + 0.002, zB);
yBand(-0.875, -0.700, 0.700, zB - 0.005);
zBand(-0.875, -0.703, zA + 0.008, zB - 0.008);
zBand(-0.875, 0.703, zA + 0.008, zB - 0.008);
yBand(-0.875, -0.700, yIn0 - 0.008, zA + 0.005);
yBand(-0.875, yIn1 + 0.008, 0.700, zA + 0.005);
yBand(-0.875, yIn0 + 0.008, yIn1 - 0.008, zIn + 0.006);
zBand(-0.875, yIn0 - 0.007, zA + 0.008, zIn - 0.004);
zBand(-0.875, yIn1 + 0.007, zA + 0.008, zIn - 0.004);
const zEx = exit.z[1];
const mouths = [-1, 1].map((sy) => [sy * exit.y - exit.w / 2, sy * exit.y + exit.w / 2]);
endSheet(0.875, -0.708, 0.708, zEx + 0.002, zB);
endSheet(0.875, -0.708, mouths[0][0] - 0.002, zA, zEx);
endSheet(0.875, mouths[0][1] + 0.002, mouths[1][0] - 0.002, zA, zEx);
endSheet(0.875, mouths[1][1] + 0.002, 0.708, zA, zEx);
yBand(0.875, -0.700, 0.700, zB - 0.005);
zBand(0.875, -0.703, zEx + 0.008, zB - 0.008);
zBand(0.875, 0.703, zEx + 0.008, zB - 0.008);
yBand(0.875, -0.700, mouths[0][0] - 0.008, zA + 0.005);
yBand(0.875, mouths[0][1] + 0.008, mouths[1][0] - 0.008, zA + 0.005);
yBand(0.875, mouths[1][1] + 0.008, 0.700, zA + 0.005);
for (const [y0, y1] of mouths) {
  zBand(0.875, y0 - 0.007, zA + 0.008, zEx - 0.004);
  zBand(0.875, y1 + 0.007, zA + 0.008, zEx - 0.004);
  yBand(0.875, y0 + 0.008, y1 - 0.008, zEx + 0.006);
}

function addDoor(x0, x1, yFrame, outSign, postX) {
  const gap = 0.006;
  const xa = x0 + gap, xb = x1 - gap, z0 = G.kick + gap, z1 = 1.02 - gap;
  const xL = xa + HALF, xR = xb - HALF, zB = z0 + HALF, zT = z1 - HALF;
  profileBeam(V(xL, yFrame, z0), V(xL, yFrame, z1));
  profileBeam(V(xR, yFrame, z0), V(xR, yFrame, z1));
  profileBeam(V(xL + HALF, yFrame, zB), V(xR - HALF, yFrame, zB));
  profileBeam(V(xL + HALF, yFrame, zT), V(xR - HALF, yFrame, zT));
  endPlug(xL, yFrame, z1, V(0, 0, 1));
  endPlug(xR, yFrame, z1, V(0, 0, 1));
  const pw = (xR - HALF) - (xL + HALF), ph = (zT - HALF) - (zB + HALF);
  const pcx = (xL + xR) / 2, pcz = (zB + zT) / 2;
  pc(pw, 0.006, ph, pcx, yFrame, pcz);
  band(pw, 0.008, 0.007, pcx, yFrame, pcz + ph / 2 - 0.002);
  band(pw, 0.008, 0.007, pcx, yFrame, pcz - ph / 2 + 0.002);
  band(0.007, 0.008, ph - 0.012, pcx + pw / 2 - 0.002, yFrame, pcz);
  band(0.007, 0.008, ph - 0.012, pcx - pw / 2 + 0.002, yFrame, pcz);
  const yFace = yFrame + outSign * HALF;
  const hingeX = (postX + (postX < 0 ? xa : xb)) / 2;
  for (const z of [0.30, 0.80]) {
    rbox(0.040, 0.030, 0.080, 0.002, M.zinc9006, hingeX, yFace + outSign * 0.012, z);
    vcyl(0.004, 0.086, M.steel, hingeX, yFace + outSign * 0.012, z);
  }
  const hx = x0 + x1 < 0 ? xR - 0.05 : xL + 0.05;
  const zA = 0.52, zBnd = 0.70;
  tubeAlong([
    V(hx, yFace + outSign * 0.006, zA),
    V(hx, yFace + outSign * 0.055, zA + 0.025),
    V(hx, yFace + outSign * 0.068, (zA + zBnd) / 2),
    V(hx, yFace + outSign * 0.055, zBnd - 0.025),
    V(hx, yFace + outSign * 0.006, zBnd),
  ], 0.011, M.blackPlastic, world, 24, 10);
  const xSw = x0 + x1 < 0 ? -0.024 : 0.024;
  rbox(0.040, 0.040, 0.120, 0.002, M.estopYellow, xSw, yFace + outSign * 0.016, 0.34);
  rbox(0.030, 0.015, 0.060, 0.0015, M.zinc9006, x0 + x1 < 0 ? xR + 0.008 : xL - 0.008, yFace + outSign * 0.008, 0.34);
  const lab = labelPlane("!", 0.064, 0.064, { bg: "#e6b000", fg: "#1a1a1a", font: "700 200px sans-serif", px: 256 });
  lab.position.set(pcx, yFrame + outSign * 0.008, 0.22);
  lab.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(outSign < 0 ? 1 : -1, 0, 0), V(0, 0, 1), V(0, outSign, 0)));
  world.add(lab);
  guardPanels.push(lab);
}
addDoor(-0.88, -0.02, G.y0, -1, -0.90);
addDoor(0.02, 0.88, G.y0, -1, 0.90);
addDoor(-0.88, -0.02, G.y1, 1, -0.90);
addDoor(0.02, 0.88, G.y1, 1, 0.90);

// Delta bridge. Lower profile bottom is 1.015, so the pair sits 5 mm into the adaptor (top face z = 1.020) and the seam cannot read as a gap.
for (const x of LAYOUT.bridge.xs) {
  rail(x, -0.72, x, 0.72, 1.035);
  rail(x, -0.72, x, 0.72, 1.074);
}

// ---------------------------------------------------------------- stack light on the front-right post
const stackLamps = { red: M.lampRed, amber: M.lampAmber, green: M.lampGreen };
function stackTurn(r, z0, z1, material) {
  const c = Math.min(0.001, (z1 - z0) / 4, r / 3);
  const o = lathe([[0, z0], [r - c, z0], [r, z0 + c], [r, z1 - c], [r - c, z1], [0, z1]], material);
  o.position.set(LAYOUT.stack.x, LAYOUT.stack.y, 0);
  return o;
}
let stackZ = 1.108;
stackTurn(0.034, stackZ, stackZ + 0.035, M.blackPlastic); stackZ += 0.035;
stackTurn(0.0125, stackZ, stackZ + 0.150, M.blackPlastic); stackZ += 0.150;
stackTurn(0.030, stackZ, stackZ + 0.050, stackLamps.green); stackZ += 0.050;
stackTurn(0.030, stackZ, stackZ + 0.050, stackLamps.amber); stackZ += 0.050;
stackTurn(0.030, stackZ, stackZ + 0.050, stackLamps.red); stackZ += 0.050;
stackTurn(0.032, stackZ, stackZ + 0.028, M.blackPlastic);

function mushroom(parent, x, y, z, axis) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, y, z);
  g.quaternion.setFromUnitVectors(V(0, 0, 1), axis.clone().normalize());
  lathe([[0, -0.001], [0.030, -0.001], [0.0325, 0.0004], [0.0325, 0.004], [0.028, 0.0055], [0, 0.0055]], M.estopYellow, g);
  lathe([[0, 0.0055], [0.016, 0.0055], [0.020, 0.0085], [0.020, 0.015], [0.012, 0.0175], [0, 0.017]], M.estopRed, g);
  return g;
}
mushroom(world, 0, G.y1 + 0.019, 0.55, V(0, 1, 0));

// ---------------------------------------------------------------- HMI on the front-left post. Screen centre is LAYOUT.hmi.z; G4 draws the canvas.
const hmiRoot = new THREE.Group();
hmiRoot.position.set(-0.98, -0.90, LAYOUT.hmi.z);
hmiRoot.rotation.z = -0.30;
world.add(hmiRoot);
rbox(0.41, 0.06, 0.30, 0.004, M.t3Dark, 0, 0, 0, hmiRoot);
const hmiCanvas = document.createElement("canvas");
hmiCanvas.width = 512;
hmiCanvas.height = 384;
hmiCanvas.getContext("2d").fillStyle = "#14181e";
hmiCanvas.getContext("2d").fillRect(0, 0, 512, 384);
const hmiTexture = new THREE.CanvasTexture(hmiCanvas);
hmiTexture.colorSpace = THREE.SRGBColorSpace;
const hmiScreen = { canvas: hmiCanvas, texture: hmiTexture };
const screenMat = M.screen.clone();
screenMat.map = hmiTexture;
screenMat.emissiveMap = hmiTexture;
screenMat.emissiveIntensity = 0.22;
const hmiFace = mesh(new THREE.PlaneGeometry(0.24, 0.18), screenMat, hmiRoot);
hmiFace.castShadow = false;
hmiFace.position.set(0, -0.0315, 0.04);
hmiFace.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 0), V(0, 0, 1), V(0, -1, 0)));
mushroom(hmiRoot, -0.09, -0.030, -0.09, V(0, -1, 0));
for (const [bx, bm] of [[0.02, M.lampGreen], [0.06, M.whitePOM]]) {
  const g = new THREE.Group();
  hmiRoot.add(g);
  g.position.set(bx, -0.030, -0.10);
  g.quaternion.setFromUnitVectors(V(0, 0, 1), V(0, -1, 0));
  lathe([[0, 0], [0.010, 0], [0.012, 0.001], [0.012, 0.006], [0.007, 0.009], [0, 0.009]], bm, g);
}
function knuckle(p) {
  const o = mesh(new THREE.SphereGeometry(0.034, 20, 14), M.zinc9006);
  o.position.copy(p);
  return o;
}
function shaft(a, b) {
  const d = b.clone().sub(a);
  const len = d.length();
  const c = Math.min(0.001, 0.025 * 0.25);
  const o = lathe([[0, 0], [0.024, 0], [0.025, c], [0.025, len - c], [0.024, len], [0, len]], M.aluBlasted);
  o.position.copy(a);
  o.quaternion.setFromUnitVectors(V(0, 0, 1), d.normalize());
  return o;
}
const hmiPivot = V(LAYOUT.hmi.x, LAYOUT.hmi.y - 0.03, 0.50);
const hmiElbow = V(-0.95, -0.83, 0.53);
hmiRoot.updateMatrixWorld(true);
const hmiBack = V(0, 0.04, 0).applyQuaternion(hmiRoot.quaternion).add(hmiRoot.position);
knuckle(hmiPivot);
knuckle(hmiElbow);
knuckle(hmiBack);
shaft(hmiPivot, hmiElbow);
shaft(hmiElbow, hmiBack);

// Perforated U tray along the back top rail, then four leads down onto the delta bridge.
const tray = extrudeXZ([
  [-0.050, 1.100], [0.050, 1.100], [0.050, 1.160], [0.047, 1.160],
  [0.047, 1.103], [-0.047, 1.103], [-0.047, 1.160], [-0.050, 1.160],
], 0, 1.80, M.galv, world, 0);
tray.rotation.z = -Math.PI / 2;
tray.position.set(-0.90, G.y1, -0.001);
for (let x = -0.72; x <= 0.721; x += 0.12) rbox(0.016, 0.003, 0.005, 0.0005, M.aluDark, x, 0.782, 1.128);
for (let i = 0; i < 4; i++) {
  const y = G.y1 + (i - 1.5) * 0.012;
  tubeAlong([
    V(-0.72, y, 1.125), V(0.12, y, 1.125), V(0.16, 0.55, 1.115), V(0.16, 0.22, 1.07),
  ], 0.0032, M.blackRubber, world, 20, 8);
}

brackets.instanceMatrix.needsUpdate = true;
bracketsMir.instanceMatrix.needsUpdate = true;
