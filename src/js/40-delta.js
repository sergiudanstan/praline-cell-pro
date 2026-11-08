// ---------------------------------------------------------------- delta robot: plan §6.2, metres, z-up
const D = DELTA;
const deltaGroup = new THREE.Group(); world.add(deltaGroup);
// Nominal triangle vertices point between the arms; fillets are tangent to its flat sides.
function deltaTriangle(radius, fillet) {
  const pts = [];
  for (const deg of [60, 180, 300]) {
    const a = deg * RAD, cx = (radius - 2 * fillet) * Math.cos(a), cy = (radius - 2 * fillet) * Math.sin(a);
    for (let j = -60; j <= 60; j += 6) pts.push([cx + fillet * Math.cos(a + j * RAD), cy + fillet * Math.sin(a + j * RAD)]);
  }
  return pts;
}
// Small edge breaks, fastener locations, connector and hose-clip details are cosmetic approximations.
function deltaCylinder(r, z0, z1, material, parent) {
  const b = Math.min(0.0005, (z1 - z0) / 4, r / 4);
  return lathe([[0, z0], [r - b, z0], [r, z0 + b], [r, z1 - b], [r - b, z1], [0, z1]], material, parent);
}
const deltaFixed = new THREE.Group(); deltaFixed.position.set(D.cx, D.cy, 0); deltaGroup.add(deltaFixed);
const dl = LAYOUT.delta;
rbox(0.40, 0.40, dl.plateZ[1] - dl.plateZ[0], 0.003, M.aluClear, 0, 0, (dl.plateZ[0] + dl.plateZ[1]) / 2, deltaFixed);
for (const s of [-1, 1]) for (const t of [-0.13, 0.13]) {
  addBolt(V(s * 0.18, t, dl.plateZ[1]), V(0, 0, 1), deltaFixed);
  addBolt(V(t, s * 0.18, dl.plateZ[1]), V(0, 0, 1), deltaFixed);
}
extrudeXY(deltaTriangle(0.215, 0.040), dl.hoodZ[0], dl.hoodZ[1] - 0.020, M.hoodSteel, deltaFixed, 0.002);
// Low spun cover: 20 mm fall over 215 mm (> 3 degrees), meeting the adaptor at its crown.
lathe([[0.215, dl.hoodZ[1] - 0.020], [0.214, dl.hoodZ[1] - 0.0195], [0.020, dl.hoodZ[1]], [0, dl.hoodZ[1]]], M.hoodSteel, deltaFixed);
extrudeXY(deltaTriangle(0.250, 0.045), dl.baseZ[0], dl.baseZ[1], M.aluBlasted, deltaFixed, 0.002);
const deltaSpringMaterial = M.steel.clone();
{
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#aaa"; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#222"; ctx.lineWidth = 5;
  for (let y = -128; y < 256; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y + 16); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  deltaSpringMaterial.bumpMap = texture; deltaSpringMaterial.bumpScale = 0.0005;
}
const eff = new THREE.Group(); world.add(eff);
// Three long sides of length 80 mm at apothem 24 mm; short sides truncate the corners.
const deltaPlateOutline = [];
for (const th of D.arms) {
  const c = Math.cos(th * RAD), s = Math.sin(th * RAD);
  for (const sg of [-1, 1]) deltaPlateOutline.push([0.024 * s + sg * 0.040 * c, -0.024 * c + sg * 0.040 * s]);
}
deltaPlateOutline.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
extrudeXY(deltaPlateOutline, -0.006, 0.006, M.aluClear, eff, 0.0015);
const deltaArms = D.arms.map((th) => {
  const c = Math.cos(th * RAD), s = Math.sin(th * RAD);
  const shoulder = new THREE.Group(); shoulder.position.set(D.cx + D.F * s, D.cy - D.F * c, D.zb); shoulder.rotation.z = th * RAD; deltaGroup.add(shoulder);
  const gearbox = deltaCylinder(dl.driveR, 0.0225, 0.0925, M.gearboxSilver, shoulder); gearbox.rotation.y = Math.PI / 2;
  rbox(0.008, 0.060, 0.060, 0.002, M.aluBlasted, 0.096, 0, 0, shoulder);
  rbox(0.120, 0.060, 0.060, 0.004, M.motorBlack, 0.160, 0, 0, shoulder);
  rbox(0.025, 0.020, 0.030, 0.002, M.motorBlack, 0.180, 0.030, 0.015, shoulder);
  for (const x of [0.173, 0.187]) { const gland = deltaCylinder(0.004, 0, 0.010, M.blackRubber, shoulder); gland.rotation.x = -Math.PI / 2; gland.position.set(x, 0.040, 0.015); }
  rbox(0.050, 0.040, 0.060, 0.003, M.aluBlasted, -0.0475, 0, 0, shoulder);
  for (const x of [-0.0475, 0.080]) rbox(0.012, 0.040, dl.baseZ[0] - D.zb, 0.002, M.aluBlasted, x, 0, (dl.baseZ[0] - D.zb) / 2, shoulder);
  const pivot = new THREE.Group(); shoulder.add(pivot);
  const hub = deltaCylinder(0.035, -0.0225, 0.0225, M.aluClear, pivot); hub.rotation.y = Math.PI / 2;
  const upper = deltaCylinder(0.0175, 0, D.RF, M.carbonGloss, pivot); upper.rotation.x = Math.PI / 2;
  rbox(0.040, 0.040, 0.050, 0.003, M.aluClear, 0, -D.RF, 0, pivot);
  const pin = deltaCylinder(0.006, -0.038, 0.038, M.steel, pivot); pin.rotation.y = Math.PI / 2; pin.position.y = -D.RF;
  // Balls belong to the real links, independently of the forearm placement calculation.
  const elbowBalls = [], plateBalls = [], rods = [], cups = [];
  for (const sg of [-1, 1]) {
    const eb = mesh(new THREE.SphereGeometry(0.009, 20, 12), M.steel, pivot); eb.position.set(sg * 0.028, -D.RF, 0); elbowBalls.push(eb);
    const pb = mesh(new THREE.SphereGeometry(0.009, 20, 12), M.steel, eff); pb.position.set(D.E * s + sg * 0.028 * c, -D.E * c + sg * 0.028 * s, 0); plateBalls.push(pb);
    const stud = deltaCylinder(0.004, 0, D.E - 0.024, M.steel, eff); stud.quaternion.setFromUnitVectors(V(0, 0, 1), V(s, -c, 0)); stud.position.set(0.024 * s + sg * 0.028 * c, -0.024 * c + sg * 0.028 * s, 0);
    rods.push(rod(0.007, M.carbonMatte, 24));
    // Socket rims straddle the ball centres, tapering onto the 14 mm carbon tubes.
    cups.push([0, 1].map(() => lathe([[0.009, -0.010], [0.0125, -0.0095], [0.013, -0.008], [0.013, 0.008], [0.008, 0.020], [0.007, 0.020]], M.whitePOM, world, 24)));
  }
  const springs = Array.from({ length: 4 }, () => rod(0.003, deltaSpringMaterial, 16));
  return { th, c, s, shoulder, pivot, rods, cups, elbowBalls, plateBalls, springs };
});
deltaCylinder(0.025, -0.014, -0.006, M.steel, eff);
deltaCylinder(0.009, -D.tool + 0.025, -0.014, M.steel, eff);
rbox(0.025, 0.025, 0.025, 0.002, M.steel, 0, 0, -D.tool + 0.0375, eff);
const deltaVacFitting = deltaCylinder(0.004, 0, 0.012, M.puBlue, eff); deltaVacFitting.rotation.y = Math.PI / 2; deltaVacFitting.position.set(0.0125, 0, -D.tool + 0.0375);
// One and a half bellows, ending exactly at the TCP contact plane.
lathe([[0, -D.tool], [0.011, -D.tool], [0.011, -D.tool + 0.001], [0.006, -D.tool + 0.006], [0.010, -D.tool + 0.010], [0.006, -D.tool + 0.015], [0.008, -D.tool + 0.020], [0.008, -D.tool + 0.025]], M.siliconeBlue, eff, 32);
const deltaVacMaterial = M.lampGreen.clone(); deltaVacMaterial.emissive.setHex(0);
const vacLed = deltaCylinder(0.004, 0.006, 0.012, deltaVacMaterial, eff); vacLed.position.set(0.015, 0, 0);
const deltaHoseClips = [0.3, 0.7].map(() => rbox(0.014, 0.014, 0.012, 0.002, M.whitePOM, 0, 0, 0, world));
const deltaHoseStart = V(D.cx, D.cy, dl.baseZ[0]);
deltaCylinder(0.004, dl.baseZ[0] - 0.012, dl.baseZ[0], M.puBlue, deltaFixed);
const deltaHose = tubeAlong([deltaHoseStart, V(D.cx, D.cy, 0.6), V(D.cx + 0.025, D.cy, 0.4)], 0.003, M.puBlue, world, 64, 10);
let deltaLastPose = null;
function setDelta(p, ang) {
  eff.position.set(p[0], p[1], p[2] + D.tool);
  let hosePoints;
  deltaArms.forEach((A, i) => {
    const al = ang[i]; A.pivot.rotation.x = al;
    const E = V(D.cx + (D.F + D.RF * Math.cos(al)) * A.s, D.cy - (D.F + D.RF * Math.cos(al)) * A.c, D.zb - D.RF * Math.sin(al));
    const Pp = V(p[0] + D.E * A.s, p[1] - D.E * A.c, p[2] + D.tool);
    const tangent = V(A.c, A.s, 0), direction = Pp.clone().sub(E).normalize();
    [-1, 1].forEach((sg, j) => {
      const a = E.clone().addScaledVector(tangent, sg * 0.028), b = Pp.clone().addScaledVector(tangent, sg * 0.028);
      placeRod(A.rods[j], a, b);
      A.cups[j].forEach((cup, end) => { cup.position.copy(end ? b : a); cup.quaternion.setFromUnitVectors(V(0, 0, 1), direction.clone().multiplyScalar(end ? -1 : 1)); });
    });
    [E, Pp].forEach((end, k) => [-1, 1].forEach((sg, j) => {
      const centre = end.clone().addScaledVector(direction, sg * 0.012);
      placeRod(A.springs[k * 2 + j], centre.clone().addScaledVector(tangent, -0.028), centre.clone().addScaledVector(tangent, 0.028));
    }));
    if (i === 0) {
      const radial = V(A.s, -A.c, 0);
      const clips = [0.3, 0.7].map((f, j) => {
        const point = E.clone().lerp(Pp, f).addScaledVector(tangent, 0.028).addScaledVector(radial, 0.010);
        deltaHoseClips[j].position.copy(point); deltaHoseClips[j].quaternion.setFromUnitVectors(V(0, 0, 1), direction); return point;
      });
      hosePoints = [deltaHoseStart, E.clone().addScaledVector(radial, 0.030), ...clips, V(p[0] + 0.0245, p[1], p[2] + 0.0375)];
    }
  });
  updateTube(deltaHose, hosePoints);
  deltaLastPose = { p: [...p], ang: [...ang] };
}
// Check actual mesh endpoints against independently parented link ball centres for every sample.
// Includes the rod geometry centre: a displaced mesh/geometry cannot pass by checking shared inputs.
function deltaCheck() {
  const saved = deltaLastPose;
  let maxMM = 0;
  try {
    if (!S.dp.length || S.dp.length !== S.da.length) throw new Error("Missing delta samples");
    for (let n = 0; n < S.dp.length; n++) {
      setDelta(S.dp[n], S.da[n]); world.updateWorldMatrix(true, true);
      for (const A of deltaArms) A.rods.forEach((bar, j) => {
        bar.geometry.computeBoundingBox();
        const bounds = bar.geometry.boundingBox, centre = bounds.getCenter(V(0, 0, 0));
        for (const [y, ball] of [[bounds.max.y, A.plateBalls[j]], [bounds.min.y, A.elbowBalls[j]]]) {
          const end = bar.localToWorld(V(centre.x, y, centre.z)), target = ball.getWorldPosition(V(0, 0, 0));
          const mm = end.distanceTo(target) * 1000;
          if (!Number.isFinite(mm)) throw new Error("Non-finite delta endpoint error");
          maxMM = Math.max(maxMM, mm);
        }
      });
    }
  } finally { if (saved) setDelta(saved.p, saved.ang); }
  return maxMM;
}
setDelta(S.dp[0], S.da[0]);
window.pcHooks = Object.assign(window.pcHooks || {}, { deltaCheck });
