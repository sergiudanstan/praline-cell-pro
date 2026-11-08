// stations: nest, camera, reject bin, gift box on an exit belt
const zoneMats = [], zoneRings = [], ringMats = [], flashes = [], boxGroups = [];
for (const sd of SIDES) {
  const N = sd.nest;
  vcyl(0.028, N.top - 0.012, M.aluDark, N.x, N.y, (N.top - 0.012) / 2);
  vcyl(0.030, 0.012, M.nest, N.x, N.y, N.top - 0.006, 40);
  const lip = mesh(new THREE.TorusGeometry(0.020, 0.0025, 10, 40), M.nest); lip.position.set(N.x, N.y, N.top + 0.001);
  const zm = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.08, depthWrite: false });
  const zone = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 48, 1, true), zm); zone.rotation.x = Math.PI / 2; zone.position.set(N.x, N.y, 0.16); zone.castShadow = false;
  const zr = mesh(new THREE.RingGeometry(0.087, 0.09, 64), new THREE.MeshBasicMaterial({ color: 0x888888 })); zr.position.set(N.x, N.y, 0.001); zr.castShadow = false;
  zoneMats.push(zm); zoneRings.push(zr);

  const C = sd.cam;
  vcyl(0.03, C.top - 0.008, M.black, C.x, C.y, (C.top - 0.008) / 2);
  vcyl(0.012, 0.01, M.lens, C.x, C.y, C.top);
  const rm = mat(0xffffff, 0.4, 0, { emissive: 0x000000 }); ringMats.push(rm);
  const ring = mesh(new THREE.TorusGeometry(0.034, 0.006, 12, 48), rm); ring.position.set(C.x, C.y, C.top - 0.002);
  const fl = new THREE.PointLight(0xffffff, 0, 0.5); fl.position.set(C.x, C.y, C.top + 0.05); world.add(fl); flashes.push(fl);

  const R = sd.reject;
  box(0.09, 0.09, 0.006, M.bin, R.x, R.y, 0.003);
  for (const [dx, dy, w, d] of [[0.042, 0, 0.005, 0.09], [-0.042, 0, 0.005, 0.09], [0, 0.042, 0.09, 0.005], [0, -0.042, 0.09, 0.005]]) box(w, d, R.top, M.bin, R.x + dx, R.y + dy, R.top / 2);
  box(0.05, 0.002, 0.018, M.reject, R.x, R.y - sd.s * 0.0455, R.top * 0.6);

  // exit belt under the box
  const ey = sd.s * (BOX.y0 + BOX.pitch / 2), ex0 = 0.38, ex1 = 0.88, eTop = 0.040;
  box(ex1 - ex0, 0.11, 0.02, M.white, (ex0 + ex1) / 2, ey, eTop - 0.01);
  for (const sy of [-1, 1]) box(ex1 - ex0, 0.008, 0.03, M.alu, (ex0 + ex1) / 2, ey + sy * 0.059, eTop - 0.005);
  for (const x of [ex0 + 0.05, ex1 - 0.05]) box(0.025, 0.025, eTop - 0.02, M.aluDark, x, ey, (eTop - 0.02) / 2);
  // gift box tray: dark card body, gold rim, eight cavities
  const g = new THREE.Group(); world.add(g); boxGroups.push(g);
  const bw = BOX.cols * BOX.pitch + 0.016, bd = BOX.rows * BOX.pitch + 0.016, bx = BOX.x0 + (BOX.cols - 1) * BOX.pitch / 2;
  box(bw, bd, BOX.top - eTop, M.boxBody, bx, ey, (BOX.top + eTop) / 2, g);
  for (const [dx, dy, w, d] of [[bw / 2, 0, 0.003, bd], [-bw / 2, 0, 0.003, bd], [0, bd / 2, bw, 0.003], [0, -bd / 2, bw, 0.003]]) box(w, d, 0.012, M.gold, bx + dx, ey + dy, BOX.top + 0.006, g);
  for (let n = 0; n < CAP; n++) {
    const [sx, sy] = slotXY(sd, n);
    const cv = mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.0012, 28), M.cavity, g); cv.rotation.x = Math.PI / 2; cv.position.set(sx, sy, BOX.top + 0.0006); cv.castShadow = false;
  }
}

// pralines: three flavours, origin at the bottom centre
const PW = CELL.part.w, PH = CELL.part.h;
const domeGeo = new THREE.SphereGeometry(PW / 2, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
domeGeo.rotateX(Math.PI / 2); domeGeo.scale(1, 1, PH / (PW / 2));
const leafGeo = new THREE.CircleGeometry(0.0035, 6); leafGeo.translate(0, 0, PH + 0.0004);
const squareGeo = new THREE.BoxGeometry(PW * 0.92, PW * 0.92, PH * 0.82); squareGeo.translate(0, 0, PH * 0.41);
const drizzleGeo = new THREE.BoxGeometry(0.0022, PW * 0.84, 0.0016);
const heartShape = new THREE.Shape(), hu = PW / 2;
heartShape.moveTo(0, -hu);
heartShape.bezierCurveTo(hu * 0.2, -hu * 0.55, hu * 1.05, -hu * 0.25, hu, hu * 0.35);
heartShape.bezierCurveTo(hu * 0.95, hu * 0.95, hu * 0.15, hu, 0, hu * 0.45);
heartShape.bezierCurveTo(-hu * 0.15, hu, -hu * 0.95, hu * 0.95, -hu, hu * 0.35);
heartShape.bezierCurveTo(-hu * 1.05, -hu * 0.25, -hu * 0.2, -hu * 0.55, 0, -hu);
const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: PH * 0.7, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.002, bevelSegments: 3, curveSegments: 20 });
heartGeo.translate(0, 0, 0.0025);
const whiteChoc = mat(0xf3e6cf, 0.5, 0);
const partMeshes = parts.map((p) => {
  const g = new THREE.Group(), m = p.reject ? BLOOM_MAT[p.flavour] : FLAVOUR_MAT[p.flavour];
  if (p.flavour === "dark") { mesh(domeGeo, m, g); mesh(leafGeo, M.gold, g).castShadow = false; }
  else if (p.flavour === "milk") { mesh(squareGeo, m, g); for (const dx of [-0.007, 0, 0.007]) { const d = mesh(drizzleGeo, whiteChoc, g); d.position.set(dx, 0, PH * 0.82 + 0.0008); d.rotation.z = 0.35; } }
  else mesh(heartGeo, m, g);
  world.add(g); return g;
});

