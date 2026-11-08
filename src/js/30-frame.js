// floor, stainless table, frame
const FLOOR = -CELL.table.legs;
const floorMat = mat(0xdddddd, 0.95, 0);
const floor = mesh(new THREE.CircleGeometry(4.5, 96), floorMat); floor.position.z = FLOOR; floor.castShadow = false;
box(CELL.table.x, CELL.table.y, 0.03, M.top, 0, 0, -0.015);
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  box(0.045, 0.045, CELL.table.legs - 0.03, M.table, sx * (CELL.table.x / 2 - 0.05), sy * (CELL.table.y / 2 - 0.05), FLOOR + (CELL.table.legs - 0.03) / 2);
}
for (const sy of [-1, 1]) box(CELL.table.x - 0.1, 0.045, 0.06, M.table, 0, sy * (CELL.table.y / 2 - 0.05), -0.06);
for (const sx of [-1, 1]) box(0.045, CELL.table.y - 0.1, 0.06, M.table, sx * (CELL.table.x / 2 - 0.05), 0, -0.06);
box(CELL.table.x - 0.12, CELL.table.y - 0.12, 0.02, M.table, 0, 0, FLOOR + 0.12);
// overhead frame for the delta, glass guard at the back
const FR = { x0: -0.84, x1: 0.84, y0: -0.64, y1: 0.64, h: 0.95 };
for (const x of [FR.x0, FR.x1]) for (const y of [FR.y0, FR.y1]) box(0.04, 0.04, FR.h, M.alu, x, y, FR.h / 2);
for (const y of [FR.y0, FR.y1]) box(FR.x1 - FR.x0 + 0.04, 0.04, 0.04, M.alu, 0, y, FR.h);
for (const x of [FR.x0, FR.x1]) box(0.04, FR.y1 - FR.y0, 0.04, M.alu, x, 0, FR.h);
for (const dx of [-0.17, 0.17]) box(0.04, FR.y1 - FR.y0, 0.04, M.alu, DELTA.cx + dx, 0, FR.h);
const back = mesh(new THREE.PlaneGeometry(FR.x1 - FR.x0, FR.h - 0.04), M.glass); back.rotation.x = Math.PI / 2; back.position.set(0, FR.y1, FR.h / 2); back.castShadow = false;
const sideG = mesh(new THREE.PlaneGeometry(FR.y1 - FR.y0, FR.h - 0.04), M.glass); sideG.rotation.set(Math.PI / 2, Math.PI / 2, 0); sideG.position.set(FR.x0, 0, FR.h / 2); sideG.castShadow = false;

