function mesh(geo, m, parent = world) { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; parent.add(o); return o; }
function box(w, d, h, m, x, y, z, parent) { const o = mesh(new THREE.BoxGeometry(w, d, h), m, parent); o.position.set(x, y, z); return o; }
function vcyl(r, h, m, x, y, z, seg = 32, parent) { const o = mesh(new THREE.CylinderGeometry(r, r, h, seg), m, parent); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); return o; }
const UP = V(0, 1, 0);
function rod(r, m, seg = 12) { return mesh(new THREE.CylinderGeometry(r, r, 1, seg), m); }
function placeRod(o, a, b) { const d = b.clone().sub(a); o.position.copy(a).addScaledVector(d, 0.5); o.scale.set(1, d.length(), 1); o.quaternion.setFromUnitVectors(UP, d.normalize()); }
function stadium(len, r, depth, m, parent) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false); s.absarc(len, 0, r, -Math.PI / 2, Math.PI / 2, false);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 24 });
  return mesh(g, m, parent);
}
function stripeTexture(base, stripe, repeat) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 16;
  const g = c.getContext("2d"); g.fillStyle = base; g.fillRect(0, 0, 256, 16); g.fillStyle = stripe; for (let i = 0; i < 256; i += 16) g.fillRect(i, 0, 5, 16);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, 1); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------- helpers of the hi-fi build (contract: plan §4.2; signatures are fixed)
// Rounded box: use it for every visible solid (radius 1.5-5 mm), plain box() only for hidden or tiny parts.
function rbox(w, d, h, r, m, x, y, z, parent) {
  const rr = Math.max(1e-5, Math.min(r, Math.min(w, d, h) / 2 - 1e-5));
  const o = mesh(new RoundedBoxGeometry(w, d, h, 4, rr), m, parent); o.position.set(x, y, z); return o;
}
const toShape = (pts) => (pts instanceof THREE.Shape ? pts : new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
// Extrusion of a closed outline over a total depth; a bevel keeps the outer size (bevelOffset = -bevel) and the total depth.
function extrudeShapeGeo(pts, depthTotal, bevel) {
  const b = Math.max(0, Math.min(bevel || 0, depthTotal / 2 - 1e-5));
  const geo = new THREE.ExtrudeGeometry(toShape(pts), { depth: depthTotal - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b,
    bevelOffset: -b, bevelSegments: 3, curveSegments: 24 });
  geo.translate(0, 0, b);
  return geo;
}
// Plan outline [[x, y], ...] (or a THREE.Shape) extruded from z0 to z1.
function extrudeXY(pts, z0, z1, m, parent, bevel = 0) { const geo = extrudeShapeGeo(pts, z1 - z0, bevel); geo.translate(0, 0, z0); return mesh(geo, m, parent); }
// Side profile [[x, z], ...] extruded along y from y0 to y1 (rotateX(+90°) maps depth w to -y, then shift by y1; no mirroring).
function extrudeXZ(pts, y0, y1, m, parent, bevel = 0) { const geo = extrudeShapeGeo(pts, y1 - y0, bevel); geo.rotateX(Math.PI / 2); geo.translate(0, y1, 0); return mesh(geo, m, parent); }
// Profile [[r, z], ...] (bottom to top) revolved about the local z axis.
function lathe(prof, m, parent, seg = 48) {
  const geo = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), seg); geo.rotateX(Math.PI / 2); return mesh(geo, m, parent);
}
// Tube through points (Vector3 or [x, y, z]); updateTube() rebuilds it in place (dispose + new geometry).
function tubeGeo(pts, r, tub, rad) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(p[0], p[1], p[2]))), false, "centripetal");
  return new THREE.TubeGeometry(curve, tub, r, rad, false);
}
function tubeAlong(pts, r, m, parent, tub = 64, rad = 12) { const o = mesh(tubeGeo(pts, r, tub, rad), m, parent); o.userData.tube = { r, tub, rad }; return o; }
function updateTube(o, pts) { const { r, tub, rad } = o.userData.tube; o.geometry.dispose(); o.geometry = tubeGeo(pts, r, tub, rad); }
// 40x40 slot-8 aluminium profile between two points (static parents only). T0 stub: plain bar. G1: real section, instanced.
const PROFILE_S = 0.040;
function profileBeam(a, b, parent = world) {
  const d = b.clone().sub(a), L = d.length();
  const o = mesh(new THREE.BoxGeometry(PROFILE_S, PROFILE_S, L), M.aluClear, parent);
  o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(V(0, 0, 1), d.normalize());
  return o;
}
function finalizeProfiles() {}
// ISO 7380 M8 button head (d 14 mm, h 4.4 mm) seated on a face with the given outward normal. T0 stub: one mesh per bolt.
function addBolt(pos, normal, parent = world) {
  const n = normal.clone().normalize(), o = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.0044, 16), M.steel, parent);
  o.position.copy(pos).addScaledVector(n, 0.0022); o.quaternion.setFromUnitVectors(V(0, 1, 0), n);
  return o;
}
// Sticker / tag: a plane facing +z with centred text. Not added to the scene; the caller places and rotates it.
function labelPlane(text, w, h, opts = {}) {
  const { bg = "#ffffff", fg = "#111111", font = "600 140px 'IBM Plex Sans', sans-serif", px = 256 } = opts;
  const c = document.createElement("canvas"); c.height = px; c.width = Math.max(px, Math.round(px * w / h));
  const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  o.receiveShadow = true;
  return o;
}

