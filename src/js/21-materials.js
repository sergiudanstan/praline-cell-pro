const mat = (color, roughness = 0.5, metalness = 0.1, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const M = {
  alu: mat(0xc3c8ce, 0.35, 0.7), aluDark: mat(0x9aa1a8, 0.4, 0.7), table: mat(0xb4b9bf, 0.5, 0.6), top: mat(0xdfe2e5, 0.32, 0.75),
  black: mat(0x26292d, 0.55, 0.3), carbon: mat(0x1d1f22, 0.35, 0.4), white: mat(0xf4f4f2, 0.5, 0.0),
  deltaArm: mat(0x6c7a86, 0.35, 0.6), deltaPlate: mat(0xb0b7bf, 0.3, 0.75), steel: mat(0xd2d6db, 0.22, 0.85),
  t3: mat(0xeceeef, 0.42, 0.05), t3Dark: mat(0x3b4046, 0.5, 0.2), silicone: mat(0x3d8fd0, 0.7, 0.0),
  bin: mat(0xd3d7db, 0.35, 0.25), nest: mat(0xf2f1ec, 0.45, 0.0), reject: mat(0xb8392f, 0.6, 0.05), lens: mat(0x111316, 0.2, 0.3),
  boxBody: mat(0x3a1f14, 0.75, 0.05), gold: mat(0xd4a83a, 0.3, 0.85), cavity: mat(0x241209, 0.85, 0.0),
  tunnel: mat(0xe9ecef, 0.3, 0.7), cold: mat(0x9fd3f5, 0.4, 0, { emissive: 0x2b6c99, emissiveIntensity: 0.6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xd8e6ee, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false }),
};
const FLAVOUR_MAT = { dark: mat(0x3a2016, 0.38, 0.05), milk: mat(0x7b4a2d, 0.45, 0.04), ruby: mat(0xb8435f, 0.4, 0.04) };
const BLOOM_MAT = { dark: mat(0x8f8279, 0.95, 0), milk: mat(0xa99282, 0.95, 0), ruby: mat(0xcfa3ad, 0.95, 0) };
// Contract keys of the hi-fi build (plan §4.3). T0 stubs with the final colours; G1 turns them into physical materials with textures.
// The old keys above stay until every old builder is replaced (cleanup at the end).
Object.assign(M, {
  aluClear: mat(0xc9ccd0, 0.40, 1.0), aluBlasted: mat(0xbfc3c7, 0.55, 1.0), aluDark: mat(0x1c1d1f, 0.45, 0.4),
  stainlessBrushed: mat(0xc8c6c2, 0.30, 1.0), steel: mat(0xd2d6db, 0.18, 1.0), chrome: mat(0xeceef0, 0.08, 1.0),
  zinc9006: mat(0xa5a8a6, 0.5, 0.8), galv: mat(0xb4b8bb, 0.45, 0.9),
  blackPlastic: mat(0x151515, 0.65, 0), blackRubber: mat(0x151515, 0.85, 0), whitePOM: mat(0xf2f1ec, 0.5, 0),
  siliconeBlue: mat(0x2f7fd0, 0.6, 0), puBlue: mat(0x2a6fd6, 0.45, 0),
  pcClear: mat(0xffffff, 0.05, 0, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
  sealBlack: mat(0x111111, 0.8, 0),
  t3White: mat(0xeef0ef, 0.42, 0), t3Grey: mat(0xc4c8cc, 0.45, 0), t3Dark: mat(0x2e3236, 0.55, 0.1), duct: mat(0x3a3d42, 0.6, 0),
  carbonGloss: mat(0x16181b, 0.3, 0.2), carbonMatte: mat(0x16181b, 0.55, 0.1), motorBlack: mat(0x18191b, 0.5, 0.3),
  gearboxSilver: mat(0xb8bcc0, 0.35, 0.9), hoodSteel: mat(0xc8c6c2, 0.30, 1.0),
  deck: mat(0xc8c6c2, 0.30, 1.0), beltPU: mat(0xf4f4f2, 0.8, 0), tunnelWhite: mat(0xe9ecef, 0.35, 0.2),
  coldBlue: mat(0x9fd3f5, 0.4, 0, { emissive: 0x2b6c99, emissiveIntensity: 0.6 }),
  floor: mat(0xb9bcbd, 0.55, 0), tape: mat(0xe8c22a, 0.6, 0), cabinet: mat(0xc8c6c2, 0.32, 1.0), nestPOM: mat(0xf2f1ec, 0.45, 0),
  lampRed: mat(0x5a1010, 0.4, 0, { emissive: 0x000000 }), lampAmber: mat(0x5a3a08, 0.4, 0, { emissive: 0x000000 }),
  lampGreen: mat(0x0d4a1a, 0.4, 0, { emissive: 0x000000 }),
  estopRed: mat(0xc0201a, 0.4, 0), estopYellow: mat(0xf2c400, 0.5, 0),
  screen: mat(0x0b0d10, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 0 }),
});
