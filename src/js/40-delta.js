// ---------------------------------------------------------------- delta robot model
const D = DELTA;
const deltaGroup = new THREE.Group(); world.add(deltaGroup);
vcyl(0.17, 0.018, M.deltaPlate, D.cx, D.cy, D.zb + 0.075, 6, deltaGroup).rotation.set(Math.PI / 2, Math.PI / 6, 0);
vcyl(0.06, 0.06, M.black, D.cx, D.cy, D.zb + 0.11, 32, deltaGroup);
const deltaArms = D.arms.map((th) => {
  const c = Math.cos(th * RAD), s = Math.sin(th * RAD);
  const S0 = V(D.cx + D.F * s, D.cy - D.F * c, D.zb);
  const mg = new THREE.Group(); mg.position.copy(S0); mg.rotation.z = th * RAD; deltaGroup.add(mg);
  box(0.09, 0.075, 0.075, M.black, -0.07, 0.01, 0.0, mg);
  vcyl(0.035, 0.03, M.aluDark, 0, 0.0, 0, 24, mg).rotation.set(0, 0, Math.PI / 2);
  box(0.03, 0.03, 0.07, M.aluDark, -0.07, 0.01, 0.06, mg);
  const arm = new THREE.Group(); arm.position.copy(S0); arm.rotation.z = th * RAD; deltaGroup.add(arm);
  const pivot = new THREE.Group(); arm.add(pivot);
  box(0.03, D.RF, 0.026, M.deltaArm, 0.03, -D.RF / 2, 0, pivot);
  vcyl(0.02, 0.05, M.steel, 0.03, 0, 0, 20, pivot).rotation.set(0, 0, Math.PI / 2);
  box(0.07, 0.016, 0.016, M.steel, 0.03, -D.RF, 0, pivot);
  const rods = [rod(0.0055, M.carbon), rod(0.0055, M.carbon)];
  const balls = [0, 1, 2, 3].map(() => mesh(new THREE.SphereGeometry(0.009, 16, 12), M.steel));
  return { th, c, s, pivot, rods, balls };
});
const eff = new THREE.Group(); world.add(eff);
vcyl(0.055, 0.012, M.deltaPlate, 0, 0, 0, 6, eff).rotation.set(Math.PI / 2, Math.PI / 6, 0);
vcyl(0.010, D.tool - 0.02, M.steel, 0, 0, -(D.tool - 0.02) / 2, 20, eff);
const cup = mesh(new THREE.CylinderGeometry(0.008, 0.013, 0.02, 24), M.silicone, eff); cup.rotation.x = -Math.PI / 2; cup.position.z = -D.tool + 0.01;
const vacLed = vcyl(0.006, 0.006, mat(0x444444, 0.4, 0, { emissive: 0x000000 }), 0.03, 0, 0.01, 12, eff);

function setDelta(p, ang) {
  eff.position.set(p[0], p[1], p[2] + D.tool);
  deltaArms.forEach((A, i) => {
    const al = ang[i];
    A.pivot.rotation.x = al;
    const ry = -D.F - D.RF * Math.cos(al);
    const E = V(D.cx - ry * A.s, D.cy + ry * A.c, D.zb - D.RF * Math.sin(al));
    E.x += 0.03 * A.c; E.y += 0.03 * A.s;
    const Pp = V(eff.position.x + D.E * A.s, eff.position.y - D.E * A.c, eff.position.z);
    Pp.x += 0.03 * A.c; Pp.y += 0.03 * A.s;
    const t = V(A.c, A.s, 0).multiplyScalar(0.028);
    [-1, 1].forEach((sg, j) => {
      const a = E.clone().addScaledVector(t, sg), b = Pp.clone().addScaledVector(t, sg);
      placeRod(A.rods[j], a, b); A.balls[j * 2].position.copy(a); A.balls[j * 2 + 1].position.copy(b);
    });
  });
}

