// ================================================================ shared 3D layout (metres, z up, deck top z = 0). Read-only for every task (plan §4.1).
const LAYOUT = {
  floor: -0.86,                                    // floor level (working height 860 mm)
  deck: { x: 1.80, y: 1.50, t: 0.035 },            // deck plate, top at z = 0 (wider than the old 1.36 so the T3 has >= 90 mm cable room behind it)
  base: { legsX: [-0.86, 0, 0.86], legsY: [-0.71, 0.71], foot: 0.10, railZ: -0.70, topRailZ: [-0.115, -0.035] },
  guard: { x0: -0.90, x1: 0.90, y0: -0.73, y1: 0.73, postsX: [-0.90, 0, 0.90], h: 1.10, kick: 0.10, panelT: 0.006 },
  bridge: { xs: [-0.16, 0.16], z0: 1.02, z1: 1.10 },  // two 80x40 beams (= two 40x40 side by side, 80 vertical) spanning y, underside 1.02
  delta: { plateZ: [1.005, 1.020], hoodZ: [0.875, 1.005], baseZ: [0.855, 0.875], driveR: 0.030 },
  t3: { riser: 0.135 },                            // must equal T3G.riser in the logic block
  tunnelOutX: -1.40,                               // cooling tunnel continues outside the guard to here
  exitOutX: 1.20,                                  // exit belts leave the guard to here
  openings: { infeed: { y: [-0.13, 0.13], z: [0.04, 0.26] }, exit: { y: 0.218, w: 0.16, z: [0.0, 0.13] } },
  stack: { x: 0.90, y: -0.73 },                    // tower light on this top corner post
  hmi: { x: -0.90, y: -0.73, z: 0.55 },            // swing arm on this post, screen centre height above deck
};

