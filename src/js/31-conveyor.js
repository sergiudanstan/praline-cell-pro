// infeed belt (white PU) out of the cooling tunnel
const B = CELL.belt, beltLen = B.x1 - B.x0;
for (const sy of [-1, 1]) box(beltLen + 0.04, 0.012, 0.05, M.alu, (B.x0 + B.x1) / 2, B.y + sy * (B.w / 2 + 0.008), B.top - 0.02);
const beltTex = stripeTexture("#eceeef", "#dde1e4", beltLen / 0.12);
const beltTop = mesh(new THREE.PlaneGeometry(beltLen, B.w), mat(0xffffff, 0.8, 0, { map: beltTex })); beltTop.position.set((B.x0 + B.x1) / 2, B.y, B.top);
box(beltLen, B.w, 0.03, M.white, (B.x0 + B.x1) / 2, B.y, B.top - 0.0155);
for (const x of [B.x0, B.x1]) { const r = vcyl(0.018, B.w + 0.01, M.steel, x, B.y, B.top - 0.018); r.rotation.set(0, 0, 0); }
for (const x of [B.x0 + 0.08, B.x1 - 0.08]) box(0.03, 0.03, B.top - 0.04, M.aluDark, x, B.y, (B.top - 0.04) / 2);
box(0.012, 0.03, 0.028, mat(0xe0b400, 0.5, 0.1), B.pick + 0.024, B.y - B.w / 2 - 0.014, B.top + 0.014);   // pick window sensor
box(0.08, 0.06, 0.06, M.black, B.x1 - 0.02, B.y - 0.10, B.top - 0.03);                              // drive motor
// cooling tunnel hood
const TN = CELL.tunnel, tnLen = TN.x1 - TN.x0, tnX = (TN.x0 + TN.x1) / 2;
box(tnLen, 0.20, 0.012, M.tunnel, tnX, B.y, B.top + 0.10);
for (const sy of [-1, 1]) box(tnLen, 0.012, 0.11, M.tunnel, tnX, B.y + sy * 0.094, B.top + 0.045);
box(tnLen * 0.8, 0.004, 0.018, M.cold, tnX, B.y - 0.101, B.top + 0.07);
box(tnLen, 0.17, 0.004, M.black, tnX, B.y, B.top + 0.092);

