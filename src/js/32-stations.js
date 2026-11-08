// ---------------------------------------------------------------- nests, inspection, reject collection and gift packaging
const zoneMats = [], zoneRings = [], ringMats = [], flashes = [], boxGroups = [];
for (const sd of SIDES) {
  const N = sd.nest;
  const foot = conveyorCylinder(0.024, 0.006, M.stainlessBrushed); foot.position.set(N.x, N.y, 0.003);
  const post = conveyorCylinder(0.010, N.top - 0.015, M.stainlessBrushed); post.position.set(N.x, N.y, (N.top - 0.003) / 2);
  // N.top is the seating plane, with a 3 mm conical locating rim above it; total block height 12 mm.
  const seat = lathe([[0, -0.009], [0.029, -0.009], [0.030, -0.008], [0.030, 0.002], [0.029, 0.003], [0.019, 0.003], [0.015, 0], [0, 0]], M.nestPOM);
  seat.position.set(N.x, N.y, N.top);
  rbox(0.010, 0.008, N.top + 0.007, 0.002, M.stainlessBrushed, N.x - 0.044, N.y, (N.top + 0.007) / 2);
  const sensor = conveyorCylinder(0.004, 0.025, M.steel); sensor.rotation.y = Math.PI / 2; sensor.position.set(N.x - 0.035, N.y, N.top + 0.003);
  const sensorTip = conveyorCylinder(0.0036, 0.002, M.blackPlastic); sensorTip.rotation.y = Math.PI / 2; sensorTip.position.set(N.x - 0.0215, N.y, N.top + 0.003);
  const zm = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.08, depthWrite: false });
  const zone = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 48, 1, true), zm); zone.rotation.x = Math.PI / 2; zone.position.set(N.x, N.y, 0.16); zone.castShadow = false;
  const zr = mesh(new THREE.RingGeometry(0.087, 0.09, 64), new THREE.MeshBasicMaterial({ color: 0x888888 })); zr.position.set(N.x, N.y, 0.001); zr.castShadow = false;
  zoneMats.push(zm); zoneRings.push(zr);
  const C = sd.cam;
  // The 72 mm camera/lens stack is recessed below the deck to preserve the logical glass plane.
  rbox(0.029, 0.029, 0.042, 0.002, M.aluDark, C.x, C.y, C.top - 0.056);
  const lens = conveyorCylinder(0.0125, 0.030, M.lens); lens.position.set(C.x, C.y, C.top - 0.020);
  const connector = conveyorCylinder(0.006, 0.014, M.steel); connector.rotation.y = Math.PI / 2; connector.position.set(C.x + 0.0215, C.y, C.top - 0.055);
  const housing = lathe([[0.026, -0.079], [0.029, -0.079], [0.030, -0.078], [0.030, -0.003], [0.029, -0.002], [0.026, -0.002]], M.stainlessBrushed);
  housing.position.set(C.x, C.y, C.top);
  const glass = conveyorCylinder(0.025, 0.002, M.glass); glass.position.set(C.x, C.y, C.top - 0.001);
  const rm = M.whitePOM.clone(); rm.emissive.setHex(0); ringMats.push(rm);
  const ring = mesh(new THREE.TorusGeometry(0.032, 0.003, 12, 48), rm); ring.position.set(C.x, C.y, C.top - 0.003);
  const fl = new THREE.PointLight(0xffffff, 0, 0.5); fl.position.set(C.x, C.y, C.top + 0.05); world.add(fl); flashes.push(fl);
  const R = sd.reject;
  rbox(0.090, 0.090, 0.004, 0.0015, M.stainlessBrushed, R.x, R.y, R.top - 0.098);
  for (const [dx, dy, w, d] of [[0.044, 0, 0.002, 0.090], [-0.044, 0, 0.002, 0.090], [0, 0.044, 0.086, 0.002], [0, -0.044, 0.086, 0.002]]) {
    rbox(w, d, 0.096, 0.0008, M.stainlessBrushed, R.x + dx, R.y + dy, R.top - 0.048);
    rbox(Math.max(w, 0.006), Math.max(d, 0.006), 0.004, 0.0015, M.stainlessBrushed, R.x + dx, R.y + dy, R.top - 0.002);
  }
  // A shallow flared chute guides drops into the open bowl without blocking the drop centre.
  for (const sg of [-1, 1]) {
    const chute = rbox(0.035, 0.065, 0.002, 0.0008, M.stainlessBrushed, R.x + sg * 0.040, R.y, R.top + 0.008);
    chute.rotation.y = -sg * 25 * RAD;
  }
  const tag = labelPlane("REJECT", 0.060, 0.018, { bg: "#ad2927", fg: "#ffffff" });
  tag.position.set(R.x, R.y - sd.s * 0.0451, R.top - 0.035); tag.rotation.x = sd.s * Math.PI / 2; world.add(tag);
  const g = new THREE.Group(); world.add(g); boxGroups.push(g);
  const ey = sd.s * (BOX.y0 + BOX.pitch / 2), bx = BOX.x0 + (BOX.cols - 1) * BOX.pitch / 2;
  const bw = BOX.cols * BOX.pitch + 0.016, bd = BOX.rows * BOX.pitch + 0.016, floorZ = 0.040, rimZ = BOX.top + 0.010;
  rbox(bw, bd, 0.003, 0.001, M.boxBody, bx, ey, floorZ + 0.0015, g);
  for (const [dx, dy, w, d] of [[bw / 2 - 0.0015, 0, 0.003, bd], [-bw / 2 + 0.0015, 0, 0.003, bd], [0, bd / 2 - 0.0015, bw - 0.006, 0.003], [0, -bd / 2 + 0.0015, bw - 0.006, 0.003]]) {
    rbox(w, d, rimZ - floorZ, 0.001, M.boxBody, bx + dx, ey + dy, (rimZ + floorZ) / 2, g);
    rbox(w, d, 0.002, 0.0008, M.gold, bx + dx, ey + dy, rimZ, g);
  }
  // Continuous carrier sheet below the cup floors; each cup has a real 10 mm recess.
  rbox(bw - 0.006, bd - 0.006, 0.002, 0.0008, M.cavity, bx, ey, BOX.top - 0.001, g);
  for (let n = 0; n < CAP; n++) {
    const [sx, sy] = slotXY(sd, n);
    const cup = lathe([[0, -0.001], [0.0145, -0.001], [0.0175, 0.0095], [0.017, 0.010], [0.0165, 0.0095], [0.014, 0], [0, 0]], M.cavity, g, 40);
    cup.position.set(sx, sy, BOX.top);
  }
}
// ---------------------------------------------------------------- shared praline geometries; all origins are bottom-centred
const PW = CELL.part.w, PH = CELL.part.h;
const pralineGeometryGroup = new THREE.Group();
const domeProfile = [[0, 0], [PW / 2 - 0.001, 0], [PW / 2, 0.001]];
for (let i = 1; i <= 16; i++) { const a = i * Math.PI / 32; domeProfile.push([PW / 2 * Math.cos(a), 0.001 + (PH - 0.001) * Math.sin(a)]); }
const domeGeo = lathe(domeProfile, FLAVOUR_MAT.dark, pralineGeometryGroup, 40).geometry;
const leafGeo = new THREE.CircleGeometry(0.0035, 6); leafGeo.rotateZ(0.25); leafGeo.translate(0, 0, PH + 0.0002);
const squareGeo = rbox(0.026, 0.026, 0.016, 0.003, FLAVOUR_MAT.milk, 0, 0, 0, pralineGeometryGroup).geometry;
squareGeo.translate(0, 0, 0.008);
// Raised white-chocolate ribbons bring the nominal pick surface to PH = 20 mm.
const drizzleGeo = rbox(0.0022, 0.022, 0.004, 0.001, M.whitePOM, 0, 0, 0, pralineGeometryGroup).geometry;
const heartShape = new THREE.Shape(), hu = PW / 2;
heartShape.moveTo(0, -hu);
heartShape.bezierCurveTo(hu * 0.2, -hu * 0.55, hu * 1.05, -hu * 0.25, hu, hu * 0.35);
heartShape.bezierCurveTo(hu * 0.95, hu * 0.95, hu * 0.15, hu, 0, hu * 0.45);
heartShape.bezierCurveTo(-hu * 0.15, hu, -hu * 0.95, hu * 0.95, -hu, hu * 0.35);
heartShape.bezierCurveTo(-hu * 1.05, -hu * 0.25, -hu * 0.2, -hu * 0.55, 0, -hu);
const heartGeo = extrudeXY(heartShape, 0, PH, FLAVOUR_MAT.ruby, pralineGeometryGroup, 0.0025).geometry;
pralineGeometryGroup.clear();
const whiteChoc = M.whitePOM.clone(); whiteChoc.color.setHex(0xf3e6cf);
let partMeshes = [];
function buildPartMeshes() {
  partMeshes.forEach((g) => g.removeFromParent()); // Shared geometries/materials must survive a rebuild.
  partMeshes = parts.map((p) => {
    const g = new THREE.Group(), m = p.reject ? BLOOM_MAT[p.flavour] : FLAVOUR_MAT[p.flavour];
    if (p.flavour === "dark") { mesh(domeGeo, m, g); mesh(leafGeo, M.gold, g).castShadow = false; }
    else if (p.flavour === "milk") {
      mesh(squareGeo, m, g);
      for (const dx of [-0.007, 0, 0.007]) { const stripe = mesh(drizzleGeo, whiteChoc, g); stripe.position.set(dx, 0, 0.018); stripe.rotation.z = 0.20; }
    } else mesh(heartGeo, m, g);
    g.position.set(B.pick - (p.k + 1) * B.pitch, B.y, B.top); g.visible = g.position.x > B.x0 + 0.015;
    world.add(g); return g;
  });
  return partMeshes;
}
buildPartMeshes();
