// ---------------------------------------------------------------- Epson T3 models (procedural, proportions of the T3-401S)
function buildT3(sd) {
  const accent = mat(new THREE.Color(sd.i ? 0x8a3db5 : 0x2f4fb8), 0.4, 0.1);
  const base = new THREE.Group(); base.position.set(sd.x, sd.y, 0); base.rotation.z = sd.face - Math.PI; world.add(base);
  const baseL = 0.235, baseW = 0.16, baseH = T3.zArm - 0.03;
  box(baseL, baseW, baseH, M.t3, baseL / 2 - 0.075, 0, baseH / 2, base);
  box(0.006, baseW * 0.7, baseH * 0.55, M.t3Dark, baseL - 0.075 + 0.003, 0, baseH * 0.45, base);
  for (const sy of [-1, 1]) box(0.07, 0.003, 0.02, accent, 0.04, sy * (baseW / 2 + 0.001), baseH - 0.03, base);
  vcyl(0.075, 0.03, M.t3, 0, 0, baseH + 0.015, 48, base);
  const j1 = new THREE.Group(); j1.position.set(0, 0, T3.zArm); base.add(j1);
  stadium(T3.L1, 0.06, 0.05, M.t3, j1);
  vcyl(0.062, 0.006, M.t3Dark, 0, 0, 0.058, 48, j1);
  const j2 = new THREE.Group(); j2.position.set(T3.L1, 0, 0.06); j1.add(j2);
  vcyl(0.05, 0.01, M.t3Dark, 0, 0, -0.002, 40, j2);
  stadium(T3.L2, 0.052, 0.05, M.t3, j2).position.z = 0.006;
  box(T3.L2 * 0.55, 0.09, 0.07, M.t3, T3.L2 * 0.55, 0, 0.09, j2);
  for (const sy of [-1, 1]) box(0.06, 0.003, 0.018, accent, T3.L2 * 0.55, sy * 0.046, 0.1, j2);
  vcyl(0.045, 0.12, M.t3, T3.L2, 0, 0.06, 40, j2);
  const quill = new THREE.Group(); world.add(quill);
  vcyl(0.008, 0.33, M.steel, 0, 0, 0.045 + 0.165, 20, quill);
  vcyl(0.012, 0.012, M.t3Dark, 0, 0, 0.045 + 0.33, 20, quill);
  const gripper = new THREE.Group(); quill.add(gripper);
  box(0.034, 0.046, 0.026, M.t3Dark, 0, 0, 0.033, gripper);
  const fingers = [-1, 1].map((sg) => { const f = box(0.012, 0.006, 0.030, M.silicone, 0, 0, 0.006, gripper); f.userData.sg = sg; return f; });
  return { sd, j1, j2, quill, gripper, fingers };
}
const t3Models = SIDES.map(buildT3);
function setT3(m, q, grip) {
  m.j1.rotation.z = Math.PI + q[0];
  m.j2.rotation.z = q[1];
  const k = t3FK(m.sd, q);
  m.quill.position.set(k.j3[0], k.j3[1], q[2]);
  m.gripper.rotation.z = k.yaw;
  const half = lerp(0.022, PW / 2 + 0.002, grip);
  m.fingers.forEach((f) => { f.position.y = f.userData.sg * half; });
}

