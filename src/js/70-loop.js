// ---------------------------------------------------------------- playback
let time = 0, playing = true, speed = 1;
const playIcon = $("play-icon");
function setPlaying(p) {
  playing = p;
  playIcon.innerHTML = p ? '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
  $("play").setAttribute("aria-label", p ? "Pause" : "Play");
}
function seek(t) { time = clamp(t, 0, DURATION); if (mode !== "program") setMode("program"); }
$("play").addEventListener("click", () => { if (mode !== "program") setMode("program"); if (!playing && time >= DURATION) time = 0; setPlaying(!playing); });
$("restart").addEventListener("click", () => { time = 0; });
document.querySelectorAll(".chips button").forEach((b) => b.addEventListener("click", () => {
  speed = Number(b.dataset.speed); document.querySelectorAll(".chips button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
}));
$("trail").addEventListener("change", (e) => paths.forEach((p) => { p.ghost.visible = p.live.visible = e.target.checked && mode === "program"; }));
const tl = $("timeline");
let scrubbing = false;
const scrubTo = (e) => { const r = tl.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * DURATION); };
tl.addEventListener("pointerdown", (e) => { scrubbing = true; tl.setPointerCapture(e.pointerId); scrubTo(e); });
tl.addEventListener("pointermove", (e) => { if (scrubbing) scrubTo(e); });
tl.addEventListener("pointerup", () => { scrubbing = false; });
tl.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") seek(time + 0.5); if (e.key === "ArrowLeft") seek(time - 0.5); });
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); $("play").click(); }
});
function setMode(m) {
  mode = m;
  document.querySelectorAll(".mode-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  if (m === "manual") { setPlaying(false); $("jog-copy").click(); }
  paths.forEach((p) => { p.ghost.visible = p.live.visible = $("trail").checked && m === "program"; });
  syncPanels();
}
document.querySelectorAll(".mode-switch button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

// ---------------------------------------------------------------- per-frame state
const nowEls = Object.fromEntries(ACTORS.map((a) => [a, [$(`now-${a}`), $(`cmd-${a}`)]]));
let lastSegs = {};
function showNow(a, s) {
  if (lastSegs[a] === s) return; lastSegs[a] = s;
  nowEls[a][0].textContent = s.label; nowEls[a][1].textContent = s.cmd || "";
  if (a === "t3a" || a === "t3b") $(`verdict-${a}`).innerHTML = s.kind === "inspect" ? `<span class="verdict ${s.pass ? "pass" : "fail"}">${s.pass ? "PASS" : "FAIL"}</span>` : "";
}
function placeParts(t, dPose, tPoses) {
  const travel = beltTravel(t), filled = [[], []];
  let rejected = 0;
  parts.forEach((p, n) => {
    const g = partMeshes[n];
    if (mode === "manual") { g.visible = false; return; }
    let kf = null; for (const k of p.track) if (k.t <= t) kf = k;
    g.rotation.set(0, 0, 0);
    if (kf.mode === "belt") {
      const x = B.pick - (p.k + 1) * B.pitch + travel;
      g.visible = x > B.x0 + 0.015;
      g.position.set(x, B.y, B.top);
      return;
    }
    g.visible = true;
    if (kf.mode === "delta") {
      g.position.set(dPose.p[0], dPose.p[1], dPose.p[2] - PH);
    } else if (kf.mode === "t3") {
      const k = t3FK(SIDES[kf.side], tPoses[kf.side].q); g.position.set(k.tcp[0], k.tcp[1], k.tcp[2] - PH / 2); g.rotation.z = k.yaw;
    } else {
      g.position.set(...kf.p);
      const final = kf === p.track.at(-1);
      if (final && p.reject) { g.rotation.set(0.35, -0.2, 0.6); rejected++; }
      if (final && kf.box != null) { g.position.x += boxShift(kf.box, t); filled[kf.box].push(p.slot); }
    }
  });
  return { travel, filled, rejected };
}
const OWNER_LABEL = { delta: "Delta", t3a: "T3-A", t3b: "T3-B" };
let lastZone = [undefined, undefined], lastBoxSig = "", lastFirstActive = null;
function update(dt) {
  let dPose, tPoses, ang, owners = [null, null];
  if (mode === "program") {
    if (playing) {
      time += dt * speed;
      if (time >= DURATION) { if ($("loop").checked) time %= DURATION; else { time = DURATION; setPlaying(false); } }
    }
    dPose = deltaPose(time); tPoses = SIDES.map((sd) => t3Pose(sd, time)); ang = deltaIK(dPose.p);
    showNow("conv", convState(time).seg); showNow("delta", dPose.seg); SIDES.forEach((sd, i) => showNow(sd.id, tPoses[i].seg));
    const { travel, filled, rejected } = placeParts(time, dPose, tPoses);
    beltTex.offset.x = -travel / 0.12;
    owners = SIDES.map((sd) => zoneOwner(sd.i, time));
    SIDES.forEach((sd, i) => {
      const s = tPoses[i].seg, inspecting = s.kind === "inspect";
      ringMats[i].emissive.set(inspecting ? (s.pass ? 0x9cf0b0 : 0xff6a5c) : 0x000000);
      flashes[i].intensity = inspecting ? 0.6 : 0;
      boxGroups[i].position.x = boxShift(i, time);
    });
    const sig = filled.map((f) => f.join(".")).join("|") + "|" + rejected;
    if (sig !== lastBoxSig) {
      lastBoxSig = sig;
      SIDES.forEach((sd, i) => {
        boxCells[i].forEach((d, n) => d.classList.toggle("full", filled[i].includes(n)));
        $(sd.i ? "box-b-n" : "box-a-n").textContent = `${filled[i].length} / ${CAP}`;
      });
      $("box-note").textContent = `${filled[0].length + filled[1].length} of ${2 * CAP} cavities filled · ${rejected} in the reject bins`;
    }
    // program list highlight
    let firstActive = null;
    programItems.forEach((it, n) => {
      const li = programRows[n], active = time >= it.t0 && time < it.t1;
      if (active && !firstActive && !li.hidden) firstActive = li;
      li.classList.toggle("active", active); li.classList.toggle("done", time >= it.t1);
      li.querySelector(".fill").style.width = active ? `${((time - it.t0) / (it.t1 - it.t0)) * 100}%` : "0";
    });
    if (firstActive && firstActive !== lastFirstActive && playing) {
      lastFirstActive = firstActive;
      const list = $("program"); list.scrollTop = firstActive.offsetTop - 40;
    }
    const idx = Math.min(NS - 1, Math.round(time * RATE));
    paths.forEach((p) => p.live.geometry.setDrawRange(0, idx + 1));
    $("playhead").style.left = `${(time / DURATION) * 100}%`;
    $("clock-now").textContent = time.toFixed(1);
    $("live-sub").textContent = `${time.toFixed(1)} s`;
  } else {
    ang = deltaIK(jog.dp);
    $("jog-ik").textContent = ang ? "reachable" : "out of reach";
    $("jog-ik").className = ang ? "ok" : "warn";
    if (ang) lastJogAng = ang;
    ang = ang || lastJogAng;
    dPose = { p: jog.dp, vac: jog.vac ? 1 : 0 }; tPoses = SIDES.map((sd) => ({ q: jog.q[sd.i], grip: jog.grip[sd.i] ? 1 : 0 }));
    placeParts(0, dPose, tPoses);
    ringMats.forEach((m) => m.emissive.set(0x000000)); flashes.forEach((f) => { f.intensity = 0; });
    $("live-sub").textContent = "manual";
    showNowManual();
  }
  if (ang) setDelta(dPose.p, ang);
  SIDES.forEach((sd, i) => setT3(t3Models[i], tPoses[i].q, tPoses[i].grip));
  vacLed.material.emissive.set(dPose.vac ? 0x18d040 : 0x000000);

  const cl = clearances(dPose.p, ang, tPoses[0].q, tPoses[1].q);
  const jMin = cl.reduce((m, c, j) => (c < cl[m] ? j : m), 0);
  const clearNow = cl[jMin];
  setStack(Number.isFinite(clearNow) && clearNow < 0.025 ? "alarm" : (mode === "program" && playing ? "run" : "hold"));
  paintHmi(dt, clearNow);
  $("s-clear").textContent = Number.isFinite(clearNow) ? Math.round(clearNow * 1000) : "–";
  $("s-clear").className = clearNow < 0.025 ? "warn" : "";
  $("s-clear-pair").textContent = `${PAIRS[jMin][0]} ↔ ${PAIRS[jMin][1]}`;
  $("s-vac").textContent = dPose.vac ? "On" : "Off";
  SIDES.forEach((sd, i) => {
    const k = sd.i ? "b" : "a", gr = tPoses[i].grip;
    $(`s-grip-${k}`).textContent = gr > 0.5 ? "Closed" : "Open";
    $(`s-grip-${k}-mm`).textContent = `${(lerp(0.044, PW + 0.004, gr) * 1000).toFixed(0)} mm`;
  });
  owners.forEach((owner, i) => {
    if (owner === lastZone[i]) return;
    lastZone[i] = owner;
    const v = owner ? ACTOR_VAR[owner] : "--faint", col = new THREE.Color(css(v));
    zoneMats[i].color.copy(col); zoneMats[i].opacity = owner ? 0.16 : 0.06; zoneRings[i].material.color.copy(col);
    $(`zone-dot-${i}`).style.background = `var(${v})`;
    $(`zone-owner-${i}`).textContent = owner ? OWNER_LABEL[owner] : "free";
  });
  showJoints(ang, tPoses.map((p) => p.q));
  ["x", "y", "z"].forEach((c, j) => {
    $(`tcp-delta-${c}`).textContent = (dPose.p[j] * 1000).toFixed(0);
    SIDES.forEach((sd, i) => { $(`tcp-${sd.id}-${c}`).textContent = (t3FK(sd, tPoses[i].q).tcp[j] * 1000).toFixed(0); });
  });
}
function showNowManual() {
  lastSegs = {};
  $("now-conv").textContent = "Stopped"; $("cmd-conv").textContent = "";
  $("now-delta").textContent = "Jogging"; $("cmd-delta").textContent = `TCP ${jog.dp.map((v) => (v * 1000).toFixed(0)).join(", ")} mm`;
  SIDES.forEach((sd) => {
    $(`now-${sd.id}`).textContent = "Jogging"; $(`verdict-${sd.id}`).innerHTML = "";
    $(`cmd-${sd.id}`).textContent = `Go JA(${jog.q[sd.i].map((v, i) => i === 2 ? ((v - T3.zTop) * 1000).toFixed(0) : (v * DEG).toFixed(1)).join(", ")})`;
  });
}

// ---------------------------------------------------------------- stack lamp and HMI
let stackState = "";
function setStack(state) {
  if (state === stackState) return;
  stackState = state;
  stackLamps.green.emissiveIntensity = state === "run" ? 1.5 : 0;
  stackLamps.amber.emissiveIntensity = state === "hold" ? 1.5 : 0;
  stackLamps.red.emissiveIntensity = state === "alarm" ? 1.5 : 0;
}
let hmiAcc = 0.5;
function paintHmi(dt, clearM) {
  hmiAcc += dt;
  if (hmiAcc < 0.5) return;
  hmiAcc = 0;
  const c = hmiScreen.canvas, g = c.getContext("2d");
  g.fillStyle = "#14181e";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#8fd0c8";
  g.font = "600 36px sans-serif";
  g.fillText("PRALINE CELL", 28, 58);
  const hold = !(mode === "program" && playing);
  g.fillStyle = hold ? "#e0b15a" : "#7ddea0";
  g.font = "700 54px sans-serif";
  g.fillText(hold ? "HOLD" : "RUN", 28, 130);
  g.fillStyle = "#d7dee6";
  g.font = "500 28px sans-serif";
  const lines = [
    `Cycle   ${time.toFixed(1)} / ${DURATION.toFixed(1)} s`,
    `Boxes   A ${$("box-a-n").textContent}    B ${$("box-b-n").textContent}`,
    `Index   ${BELT.index.toFixed(2)} s    ${(75 / BELT.index).toFixed(0)} mm/s`,
    `Clear   ${Number.isFinite(clearM) ? Math.round(clearM * 1000) : "–"} mm`,
  ];
  lines.forEach((line, i) => g.fillText(line, 28, 190 + i * 44));
  hmiScreen.texture.needsUpdate = true;
}

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
timer.connect(document);
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 0.8); const e = ease(flight.t);
    camera.position.lerpVectors(flight.fromP, flight.toP, e); controls.target.lerpVectors(flight.fromT, flight.toT, e);
    if (flight.t >= 1) flight = null;
  }
  update(dt);
  controls.update();
  renderFrame();
  requestAnimationFrame(frame);
}
window.addEventListener("themechange", applyTheme);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
syncPanels(); resize(); applyTheme(); setPlaying(true);
// hooks for recording and checks: pc.seek(t), pc.pause()
window.pc = {
  get segs() { return segs; },
  get parts() { return parts; },
  get zones() { return zones; },
  get DURATION() { return DURATION; },
  get minClear() { return minClear; },
  get ikFail() { return ikFail; },
  get S() { return S; },
  seek, pause: () => setPlaying(false), play: () => setPlaying(true), setView, setBelt: refreshModel,
  setCamera: (pos, target) => {
    flight = null;
    camera.position.set(pos[0], pos[1], pos[2]);
    controls.target.set(target[0], target[1], target[2]);
    controls.update();
  },
  ...(window.pcHooks || {}),
};
window.pcReady = true;
requestAnimationFrame(frame);
