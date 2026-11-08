// paths
function pathLine(points, colorVar) {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points.flat()), 3));
  const ghost = new THREE.Line(g, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22 }));
  const live = new THREE.Line(g.clone(), new THREE.LineBasicMaterial({}));
  world.add(ghost, live); return { ghost, live, colorVar };
}
const paths = [pathLine(S.dp, "--delta"), pathLine(S.tp[0], "--t3a"), pathLine(S.tp[1], "--t3b")];
function rebuildPaths() {
  const src = [S.dp, S.tp[0], S.tp[1]];
  paths.forEach((p, i) => {
    for (const line of [p.ghost, p.live]) {
      line.geometry.dispose();
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(src[i].flat()), 3));
      line.geometry = g;
    }
    p.live.geometry.setDrawRange(0, 0);
  });
}

function applyTheme() {
  const top = new THREE.Color(css("--scene-top")), bottom = new THREE.Color(css("--scene-bottom"));
  const c = document.createElement("canvas"); c.width = 2; c.height = 256;
  const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(1, "#" + bottom.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex;
  floorMat.color.copy(bottom).lerp(top, 0.3);
  scene.environmentIntensity = themeIsDark() ? 0.5 : 0.7;
  for (const p of paths) { const col = new THREE.Color(css(p.colorVar)); p.ghost.material.color.copy(col); p.live.material.color.copy(col); }
  lastZone = [undefined, undefined];
  drawLanes(); renderGantt();
}

// ---------------------------------------------------------------- camera views (three.js frame: world (x, y, z) -> (x, z, -y))
const views = {
  iso: { pos: V(2.7, 2.1, 2.9), target: V(0.05, 0.35, 0) },
  front: { pos: V(0.05, 1.15, 3.35), target: V(0.05, 0.48, 0) },
  side: { pos: V(3.35, 1.15, 0.05), target: V(0, 0.48, 0) },
  top: { pos: V(0.05, 4.2, 0.02), target: V(0.05, 0, 0) },
  delta: { pos: V(0.62, 1.25, 1.7), target: V(0, 0.55, 0) },
  t3a: { pos: V(1.45, 1.15, 0.15), target: V(0.40, 0.28, 0.28) },
  t3b: { pos: V(1.45, 1.15, -0.15), target: V(0.40, 0.28, -0.28) },
};
window.pcViews = views;
let flight = null;
function setView(name) {
  const v = views[name]; if (!v) return;
  flight = { t: 0, fromP: camera.position.clone(), fromT: controls.target.clone(), toP: v.pos.clone(), toT: v.target.clone() };
  document.querySelectorAll(".views button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === name)));
}
camera.position.copy(views.iso.pos); controls.target.copy(views.iso.target);
document.querySelectorAll(".views button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
controls.addEventListener("start", () => { flight = null; document.querySelectorAll(".views button").forEach((b) => b.setAttribute("aria-pressed", "false")); });
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); drawLanes();
}
new ResizeObserver(resize).observe(viewport);

