// ================================================================ scene
const viewport = $("viewport");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.classList.add("main");
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.02, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 0.35; controls.maxDistance = 7;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a837e, 1.15));
const sun = new THREE.DirectionalLight(0xfffaf3, 2.1);
sun.position.set(1.4, 2.6, 1.1); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.5, far: 7 });
sun.shadow.bias = -0.0004;
scene.add(sun);
const fillL = new THREE.DirectionalLight(0xe6ecff, 0.55); fillL.position.set(-1.6, 1.2, -1.3); scene.add(fillL);

const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; scene.add(world);

