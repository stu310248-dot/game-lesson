import * as THREE from 'three';
import '../styles.css';

const mount = document.querySelector('#gameViewport');
const loading = document.querySelector('#loading');
const hint = document.querySelector('#fieldHint');
const viewName = document.querySelector('#viewName');
const actionTitle = document.querySelector('#actionTitle');
const actionDescription = document.querySelector('#actionDescription');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91b8d2);
scene.fog = new THREE.Fog(0x91b8d2, 85, 190);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd9efff, 0x42613d, 2.0));
const sun = new THREE.DirectionalLight(0xfff1d8, 2.6);
sun.position.set(-28, 48, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -65; sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65; sun.shadow.camera.bottom = -65;
scene.add(sun);

const mat = (color, roughness = 0.85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const grassMat = mat(0x2c8b48);
const darkGrassMat = mat(0x24783e);
const dirtMat = mat(0xb77a49);
const chalkMat = mat(0xf3ead2);
const whiteMat = mat(0xf4f2e9);
const blueMat = mat(0x1767a5);
const redMat = mat(0xa83c45);
const skinMat = mat(0xc98e68);
const gloveMat = mat(0x282e36);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.52 });

function box(parent, name, size, position, material, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = cast; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function cylinder(parent, radiusTop, radiusBottom, height, position, material, segments = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function line(points, material, radius = 0.055) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 6, false), material);
  scene.add(mesh); return mesh;
}

// Field is built on the X/Z plane; home plate is at the front (z = 22).
const field = new THREE.Group();
scene.add(field);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(190, 190), mat(0x1c3b35));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.14; ground.receiveShadow = true; field.add(ground);

const outfield = new THREE.Shape();
outfield.moveTo(0, 22); outfield.lineTo(-8, 22);
outfield.absarc(0, 22, 79, Math.PI, 0, true);
outfield.lineTo(0, 22);
const outMesh = new THREE.Mesh(new THREE.ShapeGeometry(outfield, 80), grassMat);
outMesh.rotation.x = -Math.PI / 2; outMesh.receiveShadow = true; field.add(outMesh);

// Alternating mowing stripes.
for (let i = 0; i < 8; i++) {
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 52), darkGrassMat);
  stripe.rotation.x = -Math.PI / 2;
  stripe.rotation.z = (i - 3.5) * 0.018;
  stripe.position.set((i - 3.5) * 9.2, 0.012, -9);
  stripe.receiveShadow = true; field.add(stripe);
}

// Infield dirt and diamond.
const diamond = new THREE.Mesh(new THREE.CircleGeometry(21, 4), dirtMat);
diamond.rotation.x = -Math.PI / 2; diamond.rotation.z = Math.PI / 4;
diamond.position.set(0, 0.025, 0); diamond.scale.set(1, 1, 1); field.add(diamond);
const infieldGrass = new THREE.Mesh(new THREE.CircleGeometry(14.7, 4), grassMat);
infieldGrass.rotation.x = -Math.PI / 2; infieldGrass.rotation.z = Math.PI / 4;
infieldGrass.position.y = 0.045; field.add(infieldGrass);

const basePositions = {
  home: [0, 0.18, 22], first: [15.5, 0.18, 6.5],
  second: [0, 0.18, -9], third: [-15.5, 0.18, 6.5]
};
for (const [key, pos] of Object.entries(basePositions)) {
  const base = box(field, key + '-base', [1.8, 0.28, 1.8], pos, chalkMat, false);
  base.rotation.y = Math.PI / 4;
}
cylinder(field, 2.15, 2.15, 0.12, [0, 0.12, 0], dirtMat, 48);
cylinder(field, 0.7, 0.7, 0.45, [0, 0.3, 0], dirtMat, 32);

// Foul lines and batter boxes.
line([[0, 0.08, 22], [-9, 0.08, 22], [-34, 0.08, -4], [-62, 0.08, -35]], chalkMat, 0.07);
line([[0, 0.08, 22], [9, 0.08, 22], [34, 0.08, -4], [62, 0.08, -35]], chalkMat, 0.07);
for (const x of [-2.2, 2.2]) {
  const batterBox = box(field, 'batter-box', [1.8, 0.025, 3.8], [x, 0.07, 20.5], chalkMat, false);
  batterBox.material = new THREE.MeshStandardMaterial({ color: 0xe6d9bc, transparent: true, opacity: 0.42 });
}

// Outfield wall.
const wallCurve = [];
for (let i = 0; i <= 70; i++) {
  const a = Math.PI + (Math.PI * i / 70);
  wallCurve.push([Math.cos(a) * 80, 2.2, 22 + Math.sin(a) * 80]);
}
line(wallCurve, mat(0x244a63), 0.48);
for (let i = 0; i < 70; i += 2) {
  const a = Math.PI + (Math.PI * i / 70);
  box(field, 'wall-panel', [0.22, 2.1, 6.5], [Math.cos(a) * 80, 1.05, 22 + Math.sin(a) * 80], mat(i % 4 ? 0x164c70 : 0x1b5d80), false);
}

// Stadium seating bowl.
const seatingMat = [mat(0x263f59), mat(0x314f6b), mat(0x20364f)];
for (let tier = 0; tier < 3; tier++) {
  const radius = 91 + tier * 5;
  const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 2.2, 5, 120, Math.PI), seatingMat[tier]);
  arc.rotation.x = Math.PI / 2; arc.position.set(0, 4 + tier * 2.8, 16); scene.add(arc);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(radius + 2, 0.16, 4, 120, Math.PI), mat(0x9db4c8));
  rail.rotation.x = Math.PI / 2; rail.position.set(0, 6 + tier * 2.8, 16); scene.add(rail);
}
for (let i = 0; i < 46; i++) {
  const angle = Math.PI + Math.PI * i / 45;
  const x = Math.cos(angle) * 95, z = 16 + Math.sin(angle) * 95;
  for (let j = 0; j < 3; j++) {
    const crowd = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 1.05), mat([0x4b7592,0xb85e52,0xd2b36d,0x719d80,0xd7e0e7][(i * 3 + j) % 5]));
    crowd.position.set(x, 4.4 + j * 2.8, z); crowd.rotation.y = -angle; scene.add(crowd);
  }
}

// Floodlight towers.
for (const x of [-72, 72]) for (const z of [-48, 30]) {
  cylinder(scene, 0.38, 0.65, 22, [x, 11, z], mat(0x8195a5), 10);
  box(scene, 'light-bank', [8, 1.1, 1.4], [x, 22, z], mat(0xf4f1d7));
  const glow = new THREE.PointLight(0xe8f4ff, 35, 45, 2);
  glow.position.set(x, 21.5, z); scene.add(glow);
}

// Dugouts and score board.
for (const x of [-27, 27]) {
  box(scene, 'dugout', [20, 2.6, 5], [x, 1.3, 28], mat(0x18344d));
  box(scene, 'dugout-roof', [21, 0.5, 6], [x, 2.9, 28], mat(0x294d69));
}
box(scene, 'scoreboard-frame', [28, 10, 1.2], [0, 17, -79], mat(0x152c40));
box(scene, 'scoreboard-screen', [25, 7, 0.25], [0, 17, -78.3], mat(0x071522));

// Simple procedural player models.
function makePlayer(teamMaterial, position, role = 'fielder') {
  const root = new THREE.Group(); root.position.set(...position); scene.add(root);
  const torso = cylinder(root, 0.48, 0.58, 1.25, [0, 1.55, 0], teamMaterial, 12);
  torso.rotation.z = -0.05;
  cylinder(root, 0.32, 0.34, 0.28, [0, 2.32, 0], skinMat, 16);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamMaterial);
  helmet.position.set(0, 2.58, 0); root.add(helmet);
  for (const side of [-1, 1]) {
    const leg = box(root, 'leg', [0.28, 0.88, 0.34], [side * 0.24, 0.47, 0], mat(0xe4e8eb));
    leg.rotation.z = side * -0.08;
    const arm = cylinder(root, 0.16, 0.19, 0.92, [side * 0.62, 1.65, 0], teamMaterial, 10);
    arm.rotation.z = side * -0.32;
  }
  const glove = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), gloveMat);
  glove.position.set(0.83, 1.25, -0.05); root.add(glove);
  root.userData.role = role;
  return root;
}

const pitcher = makePlayer(redMat, [0, 0, 0], 'pitcher');
const batter = makePlayer(blueMat, [-2.2, 0, 21.2], 'batter');
const catcher = makePlayer(redMat, [0, 0, 25.5], 'catcher');
const fielderPositions = [[-15,0,7],[15,0,7],[-27,0,-10],[27,0,-10],[0,0,-25],[-42,0,-38],[0,0,-48],[42,0,-38]];
const fielders = fielderPositions.map((p,i)=>makePlayer(i<2?blueMat:redMat,p,'fielder'));
batter.rotation.y = -0.2; catcher.rotation.y = Math.PI;

// Bat model, parented to the batter.
const bat = cylinder(batter, 0.075, 0.12, 2.2, [0.65, 1.55, -0.3], mat(0xd2a36b), 12);
bat.rotation.z = -0.85;
bat.visible = false;

// Baseball and seam approximation.
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), ballMat);
ball.castShadow = true; scene.add(ball); ball.visible = false;
const seamMat = new THREE.MeshBasicMaterial({color:0xc84d4d});
const seam = new THREE.Mesh(new THREE.TorusGeometry(0.19,0.012,5,32),seamMat);
seam.rotation.set(0.6,0.4,0.2); ball.add(seam);

const cameraViews = {
  broadcast: { position: [54, 48, 65], target: [0, 0, -5], label: '全場視角' },
  batter: { position: [-8, 4.8, 30], target: [0, 2, 0], label: '打擊視角' },
  pitcher: { position: [0, 4.5, -12], target: [0, 1.5, 22], label: '投球視角' },
  field: { position: [34, 25, -35], target: [0, 0, 4], label: '守備視角' },
  runner: { position: [22, 12, 29], target: [0, 0, 7], label: '跑壘視角' }
};
let currentView = 'broadcast';
let cameraFrom = new THREE.Vector3(...cameraViews.broadcast.position);
let cameraTargetFrom = new THREE.Vector3(...cameraViews.broadcast.target);
let cameraTween = 1;
let ballMode = 'idle';
let ballVelocity = new THREE.Vector3();
let ballAge = 0;
let pitchNumber = 0;
let balls = 0, strikes = 0, outs = 0;
let swingUntil = 0;
let hitMessageTimer = 0;
const clock = new THREE.Clock();

function setView(name) {
  if (!cameraViews[name]) return;
  currentView = name;
  cameraFrom.copy(camera.position);
  cameraTargetFrom.copy(controlsTarget);
  cameraTween = 0;
  viewName.textContent = cameraViews[name].label;
  document.querySelectorAll('.camera-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
}
const controlsTarget = new THREE.Vector3(0,0,-5);
function setHint(text) { hint.textContent = text; }
function updateCount() {
  document.querySelector('#balls').textContent = balls;
  document.querySelector('#strikes').textContent = strikes;
  document.querySelector('#outs').textContent = outs;
}
function resetCount() {
  balls = 0; strikes = 0; updateCount();
}
function nextPitch() {
  if (ballMode === 'pitch' || ballMode === 'hit') return;
  pitchNumber++;
  const targetX = (Math.random() - 0.5) * 1.8;
  const targetY = 1.2 + Math.random() * 0.9;
  ball.position.set(0, 2.4, -0.3);
  ball.visible = true;
  ballMode = 'pitch'; ballAge = 0;
  const destination = new THREE.Vector3(targetX, targetY, 19.7);
  ballVelocity.copy(destination.sub(ball.position)).multiplyScalar(1 / 1.05);
  setHint('球已投出！抓準時機揮棒');
  actionTitle.textContent = '投球進行中';
  actionDescription.textContent = '球正朝本壘飛來，按空白鍵或「揮棒」擊球。';
}
function swing() {
  const now = performance.now() / 1000;
  swingUntil = now + 0.42;
  bat.visible = true;
  bat.rotation.z = -0.85;
  if (ballMode === 'pitch' && ball.position.z > 9 && ball.position.z < 23 && ballAge > 0.48 && ballAge < 1.35) {
    const timing = Math.abs(ball.position.z - 17.2);
    const quality = Math.max(0, 1 - timing / 6);
    ballMode = 'hit';
    ballVelocity.set((Math.random() - 0.5) * 9, 10 + quality * 6, -27 - quality * 13);
    ballAge = 0;
    setHint(quality > 0.62 ? '漂亮擊球！球飛向外野！' : '擊球！球飛向場內！');
    actionTitle.textContent = quality > 0.62 ? '強勁擊球！' : '擊球成功';
    actionDescription.textContent = '觀察球的飛行方向與落點；目前為第一階段物理原型。';
    hitMessageTimer = 2.8;
  } else {
    if (ballMode === 'pitch') {
      strikes = Math.min(2, strikes + 1); updateCount();
      setHint('揮棒落空！好球 ' + strikes);
      actionTitle.textContent = '揮棒落空';
      actionDescription.textContent = '留意投球抵達本壘的時機，再試一次。';
    } else {
      setHint('揮棒完成，請先投球');
      actionTitle.textContent = '揮棒完成';
      actionDescription.textContent = '按「投球」開始下一球。';
    }
  }
}
function finishPitch() {
  if (ballMode === 'pitch') {
    balls = Math.min(3, balls + 1);
    if (balls === 4) { resetCount(); setHint('四壞球（練習計數）'); }
    else setHint('球未進入好球帶，壞球 ' + balls);
    updateCount();
  }
  ball.visible = false; ballMode = 'idle';
  if (bat.visible) bat.visible = false;
}
function resize() {
  const w = mount.clientWidth, h = mount.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(mount);
resize();

document.querySelectorAll('.camera-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
document.querySelector('#pitchBtn').addEventListener('click', nextPitch);
document.querySelector('#swingBtn').addEventListener('click', swing);
document.querySelector('#fullscreenBtn').addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.querySelector('.app-shell').requestFullscreen?.();
  else await document.exitFullscreen?.();
});
window.addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); swing(); }
  if (event.key.toLowerCase() === 'p') nextPitch();
  const views = ['broadcast','batter','pitcher','field','runner'];
  if ('12345'.includes(event.key)) setView(views[Number(event.key)-1]);
});

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  const now = performance.now() / 1000;

  const view = cameraViews[currentView];
  if (cameraTween < 1) {
    cameraTween = Math.min(1, cameraTween + dt * 1.8);
    const t = cameraTween * cameraTween * (3 - 2 * cameraTween);
    camera.position.lerpVectors(cameraFrom, new THREE.Vector3(...view.position), t);
    controlsTarget.lerpVectors(cameraTargetFrom, new THREE.Vector3(...view.target), t);
  } else {
    camera.position.set(...view.position);
    controlsTarget.set(...view.target);
  }
  camera.lookAt(controlsTarget);

  if (ballMode === 'pitch' || ballMode === 'hit') {
    ballAge += dt;
    ball.position.addScaledVector(ballVelocity, dt);
    if (ballMode === 'hit') {
      ballVelocity.y -= 17 * dt;
      if (ball.position.y < 0.28) {
        ball.position.y = 0.28;
        ballVelocity.y *= -0.38;
        ballVelocity.x *= 0.72;
        ballVelocity.z *= 0.72;
        if (Math.abs(ballVelocity.y) < 1.2) ballVelocity.y = 0;
      }
      ball.rotation.x += dt * 8; ball.rotation.z += dt * 5;
      if (ballAge > 4.5 || Math.abs(ball.position.x) > 75 || ball.position.z < -90) {
        ball.visible = false; ballMode = 'idle';
        setHint('球已停止，按「投球」繼續練習');
      }
    } else if (ball.position.z > 23 || ballAge > 1.8) finishPitch();
  }
  if (bat.visible) {
    const progress = Math.max(0, Math.min(1, (swingUntil - now) / 0.42));
    bat.rotation.z = -0.85 + Math.sin((1-progress) * Math.PI) * 1.65;
    if (now > swingUntil) bat.visible = false;
  }
  if (hitMessageTimer > 0) hitMessageTimer -= dt;
  renderer.render(scene, camera);
}
animate();
setTimeout(() => loading.classList.add('hidden'), 650);
