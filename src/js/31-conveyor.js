// ---------------------------------------------------------------- hygienic conveyors and cooling tunnel (metres, z-up)
const B = CELL.belt, beltLen = B.x1 - B.x0;
// Shared turned hardware with 0.5 mm edge breaks; cylinder axis is local z.
function conveyorCylinder(r, length, material, parent = world) {
  const b = Math.min(0.0005, length / 4, r / 4);
  return lathe([[0, -length / 2], [r - b, -length / 2], [r, -length / 2 + b],
    [r, length / 2 - b], [r - b, length / 2], [0, length / 2]], material, parent);
}
const infeedGroup = new THREE.Group(); world.add(infeedGroup);
for (const sg of [-1, 1]) {
  rbox(beltLen + 0.036, 0.012, 0.050, 0.002, M.stainlessBrushed, (B.x0 + B.x1) / 2, B.y + sg * (B.w / 2 + 0.008), B.top - 0.025, infeedGroup);
  rbox(beltLen - 0.020, 0.008, 0.012, 0.002, M.stainlessBrushed, (B.x0 + B.x1) / 2, B.y + sg * 0.061, B.top + 0.012, infeedGroup);
  rbox(beltLen - 0.020, 0.004, 0.008, 0.0015, M.whitePOM, (B.x0 + B.x1) / 2, B.y + sg * 0.055, B.top + 0.013, infeedGroup);
}
const beltTex = stripeTexture("#f4f5f2", "#b7c2bc", beltLen / 0.12);
const infeedMaterial = M.beltPU.clone(); infeedMaterial.map = beltTex;
const beltTop = mesh(new THREE.PlaneGeometry(beltLen, B.w), infeedMaterial, infeedGroup);
beltTop.position.set((B.x0 + B.x1) / 2, B.y, B.top);
rbox(beltLen, B.w, 0.003, 0.001, M.beltPU, (B.x0 + B.x1) / 2, B.y, B.top - 0.0016, infeedGroup);
for (const x of [B.x0, B.x1]) {
  const roller = conveyorCylinder(0.018, B.w + 0.010, M.steel, infeedGroup); roller.rotation.x = Math.PI / 2; roller.position.set(x, B.y, B.top - 0.018);
}
// Four short square-tube legs sit on the deck, each with a threaded levelling foot.
for (const x of [B.x0 + 0.080, B.x1 - 0.080]) for (const sg of [-1, 1]) {
  const y = B.y + sg * 0.055, z1 = B.top - 0.050;
  for (const [dx, dy, w, d] of [[-0.014, 0, 0.002, 0.030], [0.014, 0, 0.002, 0.030], [0, -0.014, 0.026, 0.002], [0, 0.014, 0.026, 0.002]])
    rbox(w, d, z1 - 0.015, 0.0005, M.stainlessBrushed, x + dx, y + dy, (z1 + 0.015) / 2, infeedGroup);
  const foot = conveyorCylinder(0.020, 0.006, M.blackRubber, infeedGroup); foot.position.set(x, y, 0.003);
  const screw = conveyorCylinder(0.004, 0.016, M.steel, infeedGroup); screw.position.set(x, y, 0.014);
}
rbox(0.080, 0.080, 0.080, 0.004, M.gearboxSilver, B.x1, B.y - 0.105, B.top - 0.040, infeedGroup);
const infeedMotor = conveyorCylinder(0.035, 0.120, M.motorBlack, infeedGroup);
infeedMotor.rotation.x = Math.PI / 2; infeedMotor.position.set(B.x1, B.y - 0.205, B.top - 0.040);
for (const sg of [-1, 1]) {
  rbox(0.010, 0.010, 0.065, 0.002, M.stainlessBrushed, B.pick + 0.024, B.y + sg * 0.080, B.top - 0.010, infeedGroup);
  rbox(0.012, 0.018, 0.020, 0.002, M.blackPlastic, B.pick + 0.024, B.y + sg * 0.073, B.top + 0.010, infeedGroup);
  const lens = conveyorCylinder(0.003, 0.002, M.lens, infeedGroup); lens.rotation.x = Math.PI / 2; lens.position.set(B.pick + 0.024, B.y + sg * 0.063, B.top + 0.010);
}
const pickBeam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(B.pick + 0.024, B.y - 0.063, B.top + 0.010), V(B.pick + 0.024, B.y + 0.063, B.top + 0.010)]), new THREE.LineBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.5, depthWrite: false }));
infeedGroup.add(pickBeam);
// Entire tunnel section at the guard plane fits the shared infeed opening.
const tunnelGroup = new THREE.Group(); world.add(tunnelGroup);
const TN = CELL.tunnel, tnLen = TN.x1 - LAYOUT.tunnelOutX, tnX = (LAYOUT.tunnelOutX + TN.x1) / 2;
const inlet = LAYOUT.openings.infeed, tunnelY = (inlet.y[0] + inlet.y[1]) / 2;
const tunnelW = inlet.y[1] - inlet.y[0] - 0.020, tunnelZ0 = inlet.z[0] + 0.005, tunnelZ1 = inlet.z[1] - 0.015;
rbox(tnLen, tunnelW, 0.008, 0.003, M.tunnelWhite, tnX, tunnelY, tunnelZ1 - 0.004, tunnelGroup);
for (const sg of [-1, 1]) {
  rbox(tnLen, 0.008, tunnelZ1 - tunnelZ0, 0.003, M.tunnelWhite, tnX, tunnelY + sg * (tunnelW / 2 - 0.004), (tunnelZ0 + tunnelZ1) / 2, tunnelGroup);
  rbox(tnLen, 0.010, 0.010, 0.002, M.stainlessBrushed, tnX, tunnelY + sg * (tunnelW / 2 - 0.005), tunnelZ0 + 0.005, tunnelGroup);
  rbox(0.006, 0.010, tunnelZ1 - tunnelZ0, 0.002, M.stainlessBrushed, TN.x1 - 0.003, tunnelY + sg * (tunnelW / 2 - 0.005), (tunnelZ0 + tunnelZ1) / 2, tunnelGroup);
}
rbox(tnLen, 0.008, 0.004, 0.001, M.coldBlue, tnX, tunnelY, tunnelZ1 - 0.010, tunnelGroup);
rbox(B.x0 - LAYOUT.tunnelOutX, B.w, 0.003, 0.001, M.beltPU, (B.x0 + LAYOUT.tunnelOutX) / 2, B.y, B.top - 0.0015, tunnelGroup);
const curtainMaterial = M.pcClear.clone(); curtainMaterial.color.setHex(0xa8d9ef); curtainMaterial.transparent = true; curtainMaterial.opacity = 0.38; curtainMaterial.depthWrite = false;
const curtainHeight = tunnelZ1 - 0.012 - B.top - 0.003;
for (let i = 0; i < 8; i++) {
  const hinge = new THREE.Group(); hinge.position.set(TN.x1, tunnelY + (i - 3.5) * 0.018, tunnelZ1 - 0.012);
  // Deterministic pseudo-random tilt keeps comparison renders repeatable.
  hinge.rotation.y = Math.sin((i + 1) * 12.9898) * 3 * RAD; tunnelGroup.add(hinge);
  rbox(0.001, 0.018, curtainHeight, 0.0004, curtainMaterial, 0, 0, -curtainHeight / 2, hinge);
}
const exitBeltGroups = SIDES.map((sd) => {
  const group = new THREE.Group(); world.add(group);
  const ex0 = 0.38, ex1 = LAYOUT.exitOutX, ey = sd.s * LAYOUT.openings.exit.y, top = 0.040, len = ex1 - ex0;
  rbox(len, 0.110, 0.003, 0.001, M.beltPU, (ex0 + ex1) / 2, ey, top - 0.0015, group);
  for (const sg of [-1, 1]) rbox(len + 0.020, 0.008, 0.030, 0.002, M.stainlessBrushed, (ex0 + ex1) / 2, ey + sg * 0.059, top - 0.015, group);
  for (const x of [ex0, ex1]) { const roll = conveyorCylinder(0.014, 0.112, M.steel, group); roll.rotation.x = Math.PI / 2; roll.position.set(x, ey, top - 0.014); }
  for (const x of [ex0 + 0.040, ex1 - 0.040]) rbox(0.025, 0.095, 0.010, 0.002, M.aluBlasted, x, ey, 0.005, group);
  const motor = conveyorCylinder(0.018, 0.050, M.motorBlack, group); motor.rotation.x = Math.PI / 2; motor.position.set(ex1 - 0.020, ey + sd.s * 0.095, 0.025);
  return group;
});
