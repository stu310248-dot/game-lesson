import * as THREE from 'three';
import '../styles.css';
import { MatchEngine } from './match-engine.js';

const mount = document.querySelector('#gameViewport');
const loading = document.querySelector('#loading');
const hint = document.querySelector('#fieldHint');
const viewName = document.querySelector('#viewName');
const actionTitle = document.querySelector('#actionTitle');
const actionDescription = document.querySelector('#actionDescription');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91b8d2);
scene.fog = new THREE.Fog(0x91b8d2, 85, 190);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 260);
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
  const root = new THREE.Group();
  root.position.set(...position);
  scene.add(root);

  const torso = cylinder(root, 0.48, 0.58, 1.25, [0, 1.55, 0], teamMaterial, 12);
  cylinder(root, 0.32, 0.34, 0.28, [0, 2.32, 0], skinMat, 16);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamMaterial);
  helmet.position.set(0, 2.58, 0);
  root.add(helmet);

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = box(root, 'leg', [0.28, 0.88, 0.34], [side * 0.24, 0.47, 0], mat(0xe4e8eb));
    leg.rotation.z = side * -0.08;
    legs.push(leg);
    const arm = cylinder(root, 0.16, 0.19, 0.92, [side * 0.62, 1.65, 0], teamMaterial, 10);
    arm.rotation.z = side * -0.32;
    arms.push(arm);
  }
  const glove = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), gloveMat);
  glove.position.set(0.83, 1.25, -0.05);
  root.add(glove);
  root.userData = { role, torso, arms, legs, baseY: position[1] };
  return root;
}
const pitcher = makePlayer(redMat, [0, 0, 0], 'pitcher');
const batter = makePlayer(blueMat, [-2.2, 0, 21.2], 'batter');
const catcher = makePlayer(redMat, [0, 0, 25.5], 'catcher');
const fielderPositions = [[-15,0,7],[15,0,7],[-27,0,-10],[27,0,-10],[0,0,-25],[-42,0,-38],[0,0,-48],[42,0,-38]];
const fielders = fielderPositions.map((p,i)=>makePlayer(i<2?blueMat:redMat,p,'fielder'));

// Visible base runners and simple automatic outfield pursuit.
const runners = [0,1,2].map(() => makePlayer(blueMat, [0,-20,0], 'runner'));
runners.forEach(r => { r.visible = false; });
const runnerBasePositions = [[15.5,0,6.5],[0,0,-9],[-15.5,0,6.5]];
const homeRunnerPosition = [0,0,22];
let chasingFielder = null;
let catchResolved = false;
let catchAnimationUntil = 0;
let pendingHitKind = 'single';
let isGroundBall = false;
let throwStartedAt = 0;
let throwFielder = null;

function animateRunnersToBases(baseState) {
  const active = runners.filter(r => r.visible);
  const targets = baseState.map((occupied, index) => occupied ? index : -1).filter(index => index >= 0);
  const unused = [...active];
  const assignments = [];
  for (const targetIndex of targets) {
    const target = new THREE.Vector3(...runnerBasePositions[targetIndex]);
    let chosen = null;
    if (unused.length) {
      chosen = unused.reduce((best, runner) =>
        !best || runner.position.distanceTo(target) < best.position.distanceTo(target) ? runner : best, null);
      unused.splice(unused.indexOf(chosen), 1);
    } else {
      chosen = runners.find(r => !r.visible && !assignments.some(a => a.runner === r));
      if (chosen) chosen.position.set(...homeRunnerPosition);
    }
    if (!chosen) continue;
    chosen.visible = true;
    chosen.userData.runFrom = chosen.position.clone();
    chosen.userData.runTo = target;
    chosen.userData.runProgress = 0;
    assignments.push({ runner: chosen, targetIndex });
  }
  for (const runner of runners) {
    if (!assignments.some(a => a.runner === runner)) {
      runner.visible = false;
      runner.userData.runProgress = 1;
      runner.userData.legs.forEach(leg => { leg.rotation.x = 0; });
    }
  }
}
batter.rotation.y = -0.2; catcher.rotation.y = Math.PI;

// Bat is attached to a shoulder-height pivot so the swing rotates around the player's hands.
const batPivot = new THREE.Group();
batPivot.position.set(0.48, 1.72, -0.2);
batter.add(batPivot);
const bat = cylinder(batPivot, 0.075, 0.12, 2.2, [0, 1.0, 0], mat(0xd2a36b), 12);
bat.rotation.z = -0.18;
batPivot.rotation.z = -0.72;
// Baseball and seam approximation.
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), ballMat);
ball.castShadow = true; scene.add(ball); ball.visible = false;
const seamMat = new THREE.MeshBasicMaterial({color:0xc84d4d});
const seam = new THREE.Mesh(new THREE.TorusGeometry(0.19,0.012,5,32),seamMat);
seam.rotation.set(0.6,0.4,0.2); ball.add(seam);

const cameraViews = {
  broadcast: { position: [54, 48, 65], target: [0, 0, -5], label: '全場視角' },
  batter: { position: [-5.0, 3.45, 30.2], target: [-0.2, 1.65, 0.8], label: '打者視角' },
  pitcher: { position: [0, 4.5, -12], target: [0, 1.5, 22], label: '投球視角' },
  field: { position: [34, 25, -35], target: [0, 0, 4], label: '守備視角' },
  runner: { position: [22, 12, 29], target: [0, 0, 7], label: '跑壘視角' }
};
let currentView = 'batter';
let cameraFrom = new THREE.Vector3(...cameraViews.batter.position);
let cameraTargetFrom = new THREE.Vector3(...cameraViews.batter.target);
let cameraTween = 1;
let ballMode = 'idle';
let ballVelocity = new THREE.Vector3();
let ballAge = 0;
let pitchNumber = 0;
let pitchWasSwungAt = false;
let balls = 0, strikes = 0, outs = 0;
let activePitchType = 'fastball';
const pitcherRoster = [
  { name: '陳曜廷', role: '先發', speed: 1.03, stamina: 100 },
  { name: '林奕辰', role: '先發', speed: 1.00, stamina: 100 },
  { name: '周柏翰', role: '先發', speed: 0.98, stamina: 100 },
  { name: '許承恩', role: '中繼', speed: 1.01, stamina: 100 },
  { name: '江子皓', role: '終結者', speed: 1.06, stamina: 100 }
];
let activePitcherIndex = 0;
let pitcherStamina = pitcherRoster[0].stamina;
const staminaFill = document.querySelector('#staminaFill');
const staminaValue = document.querySelector('#staminaValue');
const pitcherName = document.querySelector('#pitcherName');
const pitcherSelect = document.querySelector('#pitcherSelect');
const changePitcherBtn = document.querySelector('#changePitcherBtn');
function updateStaminaUI() {
  pitcherRoster[activePitcherIndex].stamina = pitcherStamina;
  if (staminaFill) staminaFill.style.width = `${pitcherStamina}%`;
  if (staminaValue) staminaValue.textContent = `${Math.round(pitcherStamina)}%`;
  if (staminaFill) staminaFill.classList.toggle('low', pitcherStamina < 30);
  if (pitcherName) pitcherName.textContent = pitcherRoster[activePitcherIndex].name;
}
function changePitcher() {
  if (ballMode !== 'idle' || match.gameOver) {
    setHint('請等這一球結束後再更換投手。');
    return;
  }
  const nextIndex = Number(pitcherSelect?.value ?? activePitcherIndex);
  if (!Number.isInteger(nextIndex) || !pitcherRoster[nextIndex] || nextIndex === activePitcherIndex) return;
  pitcherRoster[activePitcherIndex].stamina = pitcherStamina;
  activePitcherIndex = nextIndex;
  pitcherStamina = pitcherRoster[activePitcherIndex].stamina;
  updateStaminaUI();
  const selected = pitcherRoster[activePitcherIndex];
  setHint(`更換投手：${selected.name}（${selected.role}）`);
  actionTitle.textContent = `登板投手：${selected.name}`;
  actionDescription.textContent = '新投手保留自己的體力；每位投手的體力分開計算。';
}
let activePitchCurve = 0;
let pitchInZone = true;
let pitchResolved = false;
let swingUntil = 0;
let swingStartedAt = 0;
let pitcherThrowStartedAt = -10;
let batterSwinging = false;
let hitMessageTimer = 0;
const AIM_CONTACT_Z = 18.8;
const aimRaycaster = new THREE.Raycaster();
const aimPointer = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -AIM_CONTACT_Z);
const aimHitPoint = new THREE.Vector3();
let aimPoint = new THREE.Vector2(0, 1.55);
let aimScreen = { x: 0.5, y: 0.5 };
let pendingSwing = false;
let swingImpactAt = 0;
let aiOpponentEnabled = true;
let aiPitchCooldown = 1.4;
let aiDecisionPitchNumber = -1;
let displayedHalf = '上';
const aimCursor = document.querySelector('#aimCursor');
const aiToggle = document.querySelector('#aiToggle');
const clock = new THREE.Clock();
const match = new MatchEngine(syncMatchUI);

function updateControlRole(state) {
  const userBatting = state.half === '上';
  const roleNode = document.querySelector('#controlRole');
  if (roleNode) roleNode.textContent = userBatting ? '玩家打擊 · AI 投球' : '玩家投球 · AI 打擊';
  const pitchButton = document.querySelector('#pitchBtn');
  if (pitchButton) {
    pitchButton.textContent = userBatting && aiOpponentEnabled ? 'AI 投球中' : '↗ 投球';
    pitchButton.disabled = !!state.gameOver || (userBatting && aiOpponentEnabled);
  }
  const swingButton = document.querySelector('#swingBtn');
  if (swingButton) swingButton.disabled = !!state.gameOver || !userBatting;
}
function syncMatchUI(state) {
  balls = state.balls; strikes = state.strikes; outs = state.outs;
  document.querySelector('#balls').textContent = balls;
  document.querySelector('#strikes').textContent = strikes;
  document.querySelector('#outs').textContent = outs;
  document.querySelector('#awayScore').textContent = state.score[0];
  document.querySelector('#homeScore').textContent = state.score[1];
  document.querySelector('#inningLabel').textContent = (state.half === '上' ? '▲ ' : '▼ ') + state.inning + ' 局' + state.half;
  const baseText = ['一壘','二壘','三壘'].map((name,i)=>state.bases[i] ? name+'●' : name+'○').join('　');
  const baseNode = document.querySelector('#baseStatus');
  if (baseNode) baseNode.textContent = baseText;
  animateRunnersToBases(state.bases);
  updateControlRole(state);
  if (state.half !== displayedHalf) {
    displayedHalf = state.half;
    if (!state.gameOver) {
      setView(state.half === '下' ? 'pitcher' : 'batter');
      setHint(state.half === '下'
        ? '攻守交換！現在由你投球，AI 負責打擊。'
        : '攻守交換！現在由你打擊，AI 負責投球。');
    }
  } else if (state.lastCall) setHint(state.lastCall);
  if (state.gameOver) {
    actionTitle.textContent = '比賽結束';
    actionDescription.textContent = state.lastCall + '。可重新開始一場比賽。';
    document.querySelector('#pitchBtn').disabled = true;
  }
}

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
  if (ballMode === 'pitch' || ballMode === 'hit' || ballMode === 'throw' || match.gameOver) return;
  aiPitchCooldown = 3.2 + Math.random() * 1.2;
  if (aiOpponentEnabled) {
    const aiPitches = ['fastball', 'twoseam', 'slider', 'curve', 'changeup', 'splitter', 'sinker'];
    activePitchType = aiPitches[Math.floor(Math.random() * aiPitches.length)];
    const pitchTypeSelect = document.querySelector('#pitchType');
    if (pitchTypeSelect) pitchTypeSelect.value = activePitchType;
  }
  pitchNumber++;
  pitchWasSwungAt = false;
  pitchResolved = false;
  pendingSwing = false;
  pitcherThrowStartedAt = performance.now() / 1000;
  const profiles = {
    fastball: { speed: 39, curve: 0.0, label: '四縫線快速球' },
    sinker: { speed: 34, curve: 3.0, label: '伸卡球' },
    slider: { speed: 32, curve: 5.2, label: '滑球' },
    curve: { speed: 27, curve: 6.5, label: '曲球' },
    changeup: { speed: 28, curve: 1.8, label: '變速球' },
    splitter: { speed: 31, curve: 2.7, label: '指叉球' },
    twoseam: { speed: 36, curve: 2.1, label: '二縫線快速球' }
  };
  const profile = profiles[activePitchType] || profiles.fastball;
  pitcherStamina = Math.max(8, pitcherStamina - 1.8);
  updateStaminaUI();
  const fatigue = 1 - (100 - pitcherStamina) * 0.0028;
  const effectiveSpeed = profile.speed * fatigue * pitcherRoster[activePitcherIndex].speed;
  const controlSpread = 2.4 + (100 - pitcherStamina) * 0.025;
  const targetX = (Math.random() - 0.5) * controlSpread;
  const targetY = 0.75 + Math.random() * (1.9 + (100 - pitcherStamina) * 0.006);
  pitchInZone = Math.abs(targetX) < 0.9 && targetY > 0.9 && targetY < 2.25;
  ball.position.set(0, 2.4, -0.3);
  ball.visible = true;
  ballMode = 'pitch'; ballAge = 0;
  activePitchCurve = profile.curve * (Math.random() < 0.5 ? -1 : 1);
  const destination = new THREE.Vector3(targetX, targetY, 19.7);
  const duration = 34 / effectiveSpeed;
  ballVelocity.copy(destination.sub(ball.position)).multiplyScalar(1 / duration);
  setView('batter');
  const speedKmh = Math.round(effectiveSpeed * 3.6);
  setHint(profile.label + ' ' + speedKmh + ' km/h，球已投出！');
  actionTitle.textContent = profile.label + ' · ' + speedKmh + ' km/h';
  actionDescription.textContent = pitcherStamina < 30 ? '投手體力偏低，球速與控球都會下降。' : '球路會隨球種產生變化，抓準進壘時機揮棒。';
}
function resolveSwingContact() {
  if (ballMode !== 'pitch' || pitchResolved) return;
  const timingError = Math.abs(ball.position.z - AIM_CONTACT_Z);
  const aimError = Math.hypot(ball.position.x - aimPoint.x, ball.position.y - aimPoint.y);
  const timingScore = THREE.MathUtils.clamp(1 - timingError / 4.0, 0, 1);
  const aimScore = THREE.MathUtils.clamp(1 - aimError / 1.65, 0, 1);
  const quality = timingScore * 0.58 + aimScore * 0.42;

  pitchResolved = true;
  if (timingScore < 0.04 || aimScore < 0.04 || Math.random() > (0.12 + quality * 0.84)) {
    if (quality > 0.48 && Math.random() < 0.28) {
      match.foul();
      setHint('擦棒界外球！');
      actionTitle.textContent = '界外球';
      actionDescription.textContent = '揮棒時機接近，但沒有把球打進界內。';
    } else {
      match.pitch({ swung: true });
      setHint('揮棒落空！');
      actionTitle.textContent = '揮棒落空';
      actionDescription.textContent = '讓準星靠近來球，並在球接近本壘時按左鍵。';
    }
    return;
  }

  // Contact quality shapes launch angle and spray direction.
  const verticalAim = aimPoint.y - ball.position.y;
  const launch = THREE.MathUtils.clamp(7.2 + verticalAim * 7.0 + (quality - 0.5) * 2.2, 1.4, 16);
  const direction = THREE.MathUtils.clamp((aimPoint.x - ball.position.x) * 6.0 + (Math.random() - 0.5) * (3.2 - quality * 1.8), -18, 18);
  const roll = Math.random();
  const kind = roll < 0.018 ? 'homer' : roll < 0.085 ? 'double' : roll < 0.10 ? 'triple' : 'single';
  pendingHitKind = kind;
  isGroundBall = kind !== 'homer' && launch < 5.6;
  ballMode = 'hit';
  catchResolved = false;
  ballVelocity.set(direction, launch, -17 - quality * 19);
  chasingFielder = fielders.reduce((best, player) =>
    !best || player.position.distanceTo(ball.position) < best.position.distanceTo(ball.position) ? player : best, null);
  ballAge = 0;
  setView('field');
  setHint(isGroundBall ? '擊球成功！滾地球！守備員正追球。' : kind === 'homer' ? '全壘打！球飛越外野！' : '擊球成功！球飛向場內！');
  actionTitle.textContent = kind === 'homer' ? 'HOME RUN！全壘打' : kind === 'double' ? '二壘安打！' : kind === 'triple' ? '三壘安打！' : isGroundBall ? '滾地球！' : '安打機會！';
  actionDescription.textContent = '擊球方向與高度依準星落點和揮棒時機計算。';
  hitMessageTimer = 2.8;
}

function swing() {
  if (match.gameOver) return;
  if (match.half !== '上') { setHint('現在是守備局，你是投手；按「投球」讓 AI 打擊。'); return; }
  const now = performance.now() / 1000;
  if (batterSwinging && now - swingStartedAt < 0.18) return;
  swingStartedAt = now;
  swingUntil = now + 0.42;
  batterSwinging = true;
  batPivot.rotation.z = -0.72;

  if (ballMode === 'pitch' && !pitchResolved && !pendingSwing) {
    // The bat reaches its contact point shortly after the click, not instantly.
    pendingSwing = true;
    swingImpactAt = now + 0.10;
    pitchWasSwungAt = true;
    setHint('揮棒中！');
    actionTitle.textContent = '揮棒！';
    actionDescription.textContent = '球棒接觸球的瞬間會依照準星與來球位置判定。';
  } else if (ballMode !== 'pitch') {
    setHint('等待投手投球，看到來球再按左鍵。');
  }
}
function finishPitch() {
  if (ballMode === 'pitch' && !pitchResolved) {
    pitchResolved = true;
    match.pitch({ inZone: pitchInZone, swung: false });
  }
  ball.visible = false; ballMode = 'idle'; activePitchCurve = 0;
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
updateStaminaUI();

document.querySelectorAll('.camera-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
document.querySelector('#pitchBtn').addEventListener('click', () => {
  if (match.half === '上' && aiOpponentEnabled) return;
  nextPitch();
});
changePitcherBtn?.addEventListener('click', changePitcher);
document.querySelector('#pitchType')?.addEventListener('change', e => { activePitchType = e.target.value; });
document.querySelector('#restartBtn')?.addEventListener('click', () => { match.reset(); pitcherRoster.forEach(p => { p.stamina = 100; }); activePitcherIndex = 0; pitcherStamina = 100; if (pitcherSelect) pitcherSelect.value = '0'; updateStaminaUI(); document.querySelector('#pitchBtn').disabled = false; ball.visible = false; ballMode = 'idle'; aiPitchCooldown = aiOpponentEnabled ? 1.2 : 999; chasingFielder = null; throwFielder = null; catchResolved = false; pendingSwing = false; pendingHitKind = 'single'; actionTitle.textContent = '新比賽開始'; actionDescription.textContent = '選擇球種，按投球開始對決。'; });
document.querySelector('#swingBtn').addEventListener('click', swing);
// Left-click directly on the 3D field to swing, like a baseball batting game.
mount.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.isPrimary === false) return;
  if (event.pointerType === 'mouse') {
    event.preventDefault();
    swing();
  }
});
mount.addEventListener('pointermove', event => {
  const rect = mount.getBoundingClientRect();
  const nx = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const ny = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0, 1);
  aimScreen = { x: nx, y: ny };
  aimPointer.set(nx * 2 - 1, 1 - ny * 2);
  aimRaycaster.setFromCamera(aimPointer, camera);
  if (aimRaycaster.ray.intersectPlane(aimPlane, aimHitPoint)) {
    aimPoint.set(
      THREE.MathUtils.clamp(aimHitPoint.x, -2.8, 2.8),
      THREE.MathUtils.clamp(aimHitPoint.y, 0.35, 2.75)
    );
  }
  if (aimCursor) { aimCursor.style.left = `${nx * 100}%`; aimCursor.style.top = `${ny * 100}%`; }
});
mount.addEventListener('pointerleave', () => { if (aimCursor) aimCursor.style.opacity = '0'; });
mount.addEventListener('pointerenter', () => { if (aimCursor) aimCursor.style.opacity = '1'; });
aiToggle?.addEventListener('click', () => {
  aiOpponentEnabled = !aiOpponentEnabled;
  aiPitchCooldown = aiOpponentEnabled ? 0.8 : 999;
  aiToggle.classList.toggle('active', aiOpponentEnabled);
  aiToggle.textContent = aiOpponentEnabled ? 'AI 對手：開' : 'AI 對手：關';
  updateControlRole(match.snapshot());
  setHint(aiOpponentEnabled ? 'AI 對手已啟用：自動投球與 AI 打擊。' : 'AI 對手已暫停：AI 打者將不揮棒，投球改為手動。');
});
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

  // AI automatically pitches in the top half; the player pitches in the bottom half.
  if (aiOpponentEnabled && match.half === '上' && ballMode === 'idle' && !match.gameOver) {
    aiPitchCooldown -= dt;
    if (aiPitchCooldown <= 0) nextPitch();
  }

  runners.forEach(runner => {
    if (runner.visible && runner.userData.runProgress < 1) {
      runner.userData.runProgress = Math.min(1, runner.userData.runProgress + dt * 1.15);
      const t = runner.userData.runProgress;
      const eased = t * t * (3 - 2 * t);
      runner.position.lerpVectors(runner.userData.runFrom, runner.userData.runTo, eased);
      runner.position.y = Math.sin(t * Math.PI) * 0.16;
      const stride = Math.sin(now * 13) * (1 - t) * 0.55;
      runner.userData.legs[0].rotation.x = stride;
      runner.userData.legs[1].rotation.x = -stride;
      runner.rotation.y = Math.atan2(runner.userData.runTo.x - runner.position.x, runner.userData.runTo.z - runner.position.z);
      if (t >= 1) runner.userData.legs.forEach(leg => { leg.rotation.x = 0; });
    }
  });

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

  if (ballMode === 'throw') {
    const progress = Math.min(1, (now - throwStartedAt) / 0.48);
    const start = new THREE.Vector3(throwFielder.position.x, 1.65, throwFielder.position.z);
    const end = new THREE.Vector3(15.5, 1.25, 6.5);
    ball.position.lerpVectors(start, end, progress);
    ball.rotation.x += dt * 14;
    if (progress >= 1) {
      ball.visible = false; ballMode = 'idle';
      throwFielder.userData.arms[0].rotation.z = -0.32;
      throwFielder = null;
      match.batterNumber++;
      match.addOut('滾地球傳一壘封殺！打者出局');
      setHint('一壘接球完成！打者出局');
      actionTitle.textContent = '傳一壘封殺！';
      actionDescription.textContent = '守備傳球成功，出局數已更新。';
    }
  }

  if (ballMode === 'pitch' || ballMode === 'hit') {
    ballAge += dt;
    ball.position.addScaledVector(ballVelocity, dt);
    if (ballMode === 'pitch' && activePitchCurve) {
      ball.position.x += activePitchCurve * dt * dt * 0.42;
      ball.position.y -= (activePitchType === 'curve' ? 5.5 : activePitchType === 'splitter' ? 3.8 : 0.8) * dt * dt;
    }
    // AI batter decision in the bottom half: swing at most pitches in-zone and sometimes chase.
    if (ballMode === 'pitch' && match.half === '下' && aiOpponentEnabled && !pendingSwing && !pitchResolved && ball.position.z >= 13.4 && aiDecisionPitchNumber !== pitchNumber) {
      aiDecisionPitchNumber = pitchNumber;
      const shouldSwing = pitchInZone ? Math.random() < 0.82 : Math.random() < 0.28;
      if (shouldSwing) {
        const travel = THREE.MathUtils.clamp((AIM_CONTACT_Z - ball.position.z) / Math.max(1, ballVelocity.z), 0, 0.18);
        aimPoint.set(
          ball.position.x + ballVelocity.x * travel,
          ball.position.y + ballVelocity.y * travel - 8.5 * travel * travel
        );
        pendingSwing = true;
        swingImpactAt = now + travel;
        swingStartedAt = now;
        batterSwinging = true;
        setHint('AI 打者準備揮棒！');
        actionTitle.textContent = 'AI 打者揮棒判斷';
        actionDescription.textContent = '你是投手，球種與控球將影響 AI 的擊球結果。';
      }
    }
    if (ballMode === 'pitch' && pendingSwing && now >= swingImpactAt) {
      pendingSwing = false;
      resolveSwingContact();
    }
    if (ballMode === 'hit') {
      if (chasingFielder && ballAge < 2.8) {
        const target = new THREE.Vector3(
          THREE.MathUtils.clamp(ball.position.x, -55, 55), 0,
          THREE.MathUtils.clamp(ball.position.z, -58, 16)
        );
        chasingFielder.position.lerp(target, Math.min(1, dt * 2.4));
        chasingFielder.rotation.y = Math.atan2(ball.position.x - chasingFielder.position.x, ball.position.z - chasingFielder.position.z);
        chasingFielder.userData.legs[0].rotation.x = Math.sin(now * 11) * 0.42;
        chasingFielder.userData.legs[1].rotation.x = -Math.sin(now * 11) * 0.42;
        const horizontalDistance = Math.hypot(ball.position.x - chasingFielder.position.x, ball.position.z - chasingFielder.position.z);
        if (!isGroundBall && pendingHitKind !== 'homer' && !catchResolved && ballAge > 0.35 && ball.position.y > 1.25 && horizontalDistance < 1.65) {
          catchResolved = true;
          ball.visible = false; ballMode = 'idle';
          ballVelocity.set(0, 0, 0);
          chasingFielder.userData.legs.forEach(leg => { leg.rotation.x = 0; });
          chasingFielder.userData.arms[0].rotation.z = 1.15;
          chasingFielder.userData.arms[1].rotation.z = -1.05;
          catchAnimationUntil = now + 0.75;
          match.batterNumber++;
          match.addOut('飛球接殺！打者出局');
          setHint('守備員接殺成功！打者出局');
          actionTitle.textContent = '接殺出局！';
          actionDescription.textContent = '守備員成功接住飛球，出局數已更新。';
          chasingFielder = null;
        }
      }
      if (isGroundBall && !catchResolved && chasingFielder && ball.position.y <= 0.3 && ballAge > 0.45) {
        const distanceToBall = Math.hypot(ball.position.x - chasingFielder.position.x, ball.position.z - chasingFielder.position.z);
        if (distanceToBall < 2.1) {
          catchResolved = true;
          throwFielder = chasingFielder;
          throwStartedAt = now;
          ball.position.set(throwFielder.position.x, 1.65, throwFielder.position.z);
          ball.visible = true;
          ballMode = 'throw';
          ballAge = 0;
          throwFielder.userData.legs.forEach(leg => { leg.rotation.x = 0; });
          throwFielder.userData.arms[0].rotation.z = 0.95;
          setHint('守備員接到滾地球，傳向一壘！');
          actionTitle.textContent = '守備傳球！';
          actionDescription.textContent = '守備員正將球傳往一壘。';
        }
      }
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
        if (chasingFielder) {
          chasingFielder.userData.legs.forEach(leg => { leg.rotation.x = 0; });
          chasingFielder = null;
        }
        ball.visible = false; ballMode = 'idle';
        if (!catchResolved) {
          match.pitch({ contact: true, result: pendingHitKind });
          setHint('球落地形成安打！');
          actionTitle.textContent = pendingHitKind === 'homer' ? 'HOME RUN！全壘打' : pendingHitKind === 'double' ? '二壘安打！' : pendingHitKind === 'triple' ? '三壘安打！' : '安打！';
          actionDescription.textContent = '球已落地，打者與跑者完成推進。';
        }
        chasingFielder = null;
        setHint('球已停止，按「投球」繼續比賽');
        if (match.gameOver) document.querySelector('#pitchBtn').disabled = true;
      }
    } else if (ball.position.z > 23 || ballAge > 1.8) finishPitch();
  }
  if (catchAnimationUntil > 0 && now >= catchAnimationUntil) {
    fielders.forEach(player => {
      if (player.userData.arms) {
        player.userData.arms[0].rotation.z = -0.32;
        player.userData.arms[1].rotation.z = -0.32;
      }
    });
    catchAnimationUntil = 0;
  }

  // Pitcher wind-up and release: body turns, lead leg lifts, then the throwing arm drives forward.
  const throwAge = now - pitcherThrowStartedAt;
  if (throwAge >= 0 && throwAge < 0.9) {
    const wind = Math.sin(Math.min(1, throwAge / 0.9) * Math.PI);
    pitcher.userData.torso.rotation.z = -0.05 + wind * 0.16;
    pitcher.userData.arms[1].rotation.z = -0.32 - wind * 1.05;
    pitcher.userData.arms[0].rotation.z = 0.32 + wind * 0.28;
    pitcher.userData.legs[0].rotation.x = wind * 0.32;
  } else {
    pitcher.userData.torso.rotation.z = -0.05;
    pitcher.userData.arms[1].rotation.z = -0.32;
    pitcher.userData.arms[0].rotation.z = 0.32;
    pitcher.userData.legs[0].rotation.x = 0;
  }

  // Batter weight shift and bat arc are driven by a short eased swing animation.
  if (batterSwinging) {
    const progress = Math.min(1, (now - swingStartedAt) / 0.42);
    const eased = progress * progress * (3 - 2 * progress);
    batPivot.rotation.z = -0.72 + Math.sin(eased * Math.PI) * 1.42;
    batter.rotation.y = -0.2 - Math.sin(eased * Math.PI) * 0.42;
    batter.userData.torso.rotation.z = -0.05 - Math.sin(eased * Math.PI) * 0.18;
    if (progress >= 1) {
      batterSwinging = false;
      batPivot.rotation.z = -0.72;
      batter.rotation.y = -0.2;
      batter.userData.torso.rotation.z = -0.05;
    }
  }
  if (hitMessageTimer > 0) hitMessageTimer -= dt;
  renderer.render(scene, camera);
}
animate();
setTimeout(() => loading.classList.add('hidden'), 650);
