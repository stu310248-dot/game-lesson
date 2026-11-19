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
renderer.toneMappingExposure = 1.05;
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

const warningTrack = new THREE.Mesh(
  new THREE.RingGeometry(79.2, 84.5, 96, 1, Math.PI, Math.PI),
  mat(0x9a6846, 0.95)
);
warningTrack.rotation.x = -Math.PI / 2;
warningTrack.position.set(0, 0.018, 22);
warningTrack.receiveShadow = true;
field.add(warningTrack);

// Alternating mowing stripes.
for (let i = 0; i < 8; i++) {
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 52), darkGrassMat);
  stripe.rotation.x = -Math.PI / 2;
  stripe.rotation.z = (i - 3.5) * 0.018;
  stripe.position.set((i - 3.5) * 9.2, 0.012, -34);
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
box(field, 'pitching-rubber', [1.2, 0.12, 0.18], [0, 0.58, -0.18], chalkMat, false);

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
for (const x of [-80, 80]) {
  const foulPole = cylinder(field, 0.14, 0.2, 12, [x, 6, 22], mat(0xf2d36b, 0.45), 12);
  foulPole.castShadow = true;
  box(field, 'foul-pole-cap', [1.4, 0.22, 0.22], [x, 11.6, 22], mat(0xf2d36b, 0.45), false);
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
const backstopMat = new THREE.MeshBasicMaterial({
  color: 0x9ab3bf,
  transparent: true,
  opacity: 0.22,
  wireframe: true
});
const backstop = new THREE.Mesh(new THREE.PlaneGeometry(34, 9, 17, 5), backstopMat);
backstop.position.set(0, 4.5, 31.5);
scene.add(backstop);
for (const x of [-17, 17]) cylinder(scene, 0.08, 0.08, 9, [x, 4.5, 31.5], mat(0x8da2ad), 10);
box(scene, 'scoreboard-frame', [28, 10, 1.2], [0, 17, -79], mat(0x152c40));
box(scene, 'scoreboard-screen', [25, 7, 0.25], [0, 17, -78.3], mat(0x071522));

// Detailed procedural player models: layered uniform, helmet, gloves, cleats and catcher protection.
function makePlayer(teamMaterial, position, role = 'fielder') {
  const root = new THREE.Group();
  root.position.set(...position);
  scene.add(root);
  const pantsMat = mat(0xe8edf2);
  const trimMat = mat(0xf4f7fb, 0.55);
  const shoeMat = mat(0x17212d, 0.62);
  const darkTeamMat = mat(role === 'batter' ? 0x103d68 : 0x641f2b);
  const torso = new THREE.Group();
  torso.position.set(0, 1.62, 0);
  root.add(torso);
  const jersey = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.72, 5, 12), teamMaterial);
  jersey.scale.set(1.05, 1, 0.72); jersey.castShadow = true; torso.add(jersey);
  const chestStripe = box(torso, 'jersey-trim', [0.64, 0.055, 0.035], [0, 0.14, 0.29], trimMat, false);
  box(torso, 'jersey-piping-left', [0.035, 0.62, 0.04], [-0.24, 0.02, 0.3], trimMat, false);
  box(torso, 'jersey-piping-right', [0.035, 0.62, 0.04], [0.24, 0.02, 0.3], trimMat, false);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 24), trimMat);
  collar.position.set(0, 0.43, 0); collar.rotation.x = Math.PI / 2; torso.add(collar);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 8, 24), shoeMat);
  belt.scale.set(1.05, 0.72, 1); belt.position.set(0, -0.32, 0); belt.rotation.x = Math.PI / 2; torso.add(belt);
  const neck = cylinder(root, 0.13, 0.15, 0.24, [0, 2.25, 0], skinMat, 16);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.255, 20, 16), skinMat);
  head.scale.set(0.94, 1.05, 0.92);
  head.position.set(0, 2.51, 0.025); head.castShadow = true; root.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.295, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.57), teamMaterial);
  helmet.position.set(0, 2.59, 0.015); helmet.castShadow = true; root.add(helmet);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.045, 24, 1, false, 0, Math.PI), teamMaterial);
  brim.rotation.x = Math.PI / 2; brim.position.set(0, 2.54, 0.22); root.add(brim);
  const earGuard = box(root, 'helmet-ear-guard', [0.11, 0.28, 0.19], [0.255, 2.4, 0.12], teamMaterial);
  earGuard.rotation.z = -0.12;
  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.19, 0.96, 0);
    root.add(legGroup);
    const pants = cylinder(legGroup, 0.15, 0.12, 0.94, [0, -0.42, 0], pantsMat, 12);
    pants.rotation.z = side * -0.035;
    const sock = cylinder(legGroup, 0.12, 0.115, 0.24, [0, -0.82, 0], teamMaterial, 12);
    const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.13, 0.44), shoeMat);
    cleat.position.set(0, -0.97, 0.11); cleat.castShadow = true; legGroup.add(cleat);
    box(legGroup, 'cleat-sole', [0.3, 0.04, 0.45], [0, -1.04, 0.11], trimMat, false);
    legs.push(legGroup);
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.43, 0.28, 0);
    torso.add(armPivot);
    const sleeve = cylinder(armPivot, 0.17, 0.145, 0.38, [0, -0.12, 0], teamMaterial, 12);
    const forearm = cylinder(armPivot, 0.125, 0.105, 0.48, [0, -0.49, 0.035], skinMat, 12);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), skinMat);
    hand.position.set(0, -0.75, 0.05); armPivot.add(hand);
    arms.push(armPivot);
  }
  const glove = new THREE.Group();
  glove.position.set(0.67, 1.05, 0.12); root.add(glove);
  const glovePalm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), gloveMat);
  glovePalm.scale.set(1.05, 1.2, 0.62); glove.add(glovePalm);
  for (let i = -1; i <= 1; i++) {
    const finger = cylinder(glove, 0.045, 0.035, 0.2, [i * 0.09, 0.22, 0.02], gloveMat, 8);
    finger.rotation.z = i * -0.2;
  }
  if (role === 'catcher') {
    const protector = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.48, 4, 10), mat(0x172b42));
    protector.scale.set(1, 1, 0.28);
    protector.position.set(0, 1.57, 0.36); protector.castShadow = true; root.add(protector);
    for (const side of [-1, 1]) {
      const shin = box(root, 'catcher-shin-guard', [0.24, 0.58, 0.2], [side * 0.22, 0.42, 0.18], mat(0x263d57));
      shin.rotation.z = side * -0.08;
    }
    const mask = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 8, 20), trimMat);
    mask.position.set(0, 2.48, 0.28); root.add(mask);
    for (const y of [2.36,2.49,2.62]) box(root, 'catcher-mask-bar', [0.55,0.035,0.045], [0,y,0.3], trimMat, false);
  }
  root.userData = {
    role, torso, arms, legs, baseY: position[1],
    homePosition: new THREE.Vector3(...position),
    fieldingSpeed: role === 'fielder' ? 12.5 : 6.4,
    reactionDelay: role === 'fielder' ? 0.18 : 0.25
  };
  return root;
}
const pitcher = makePlayer(redMat, [0, 0, 0], 'pitcher');
const batter = makePlayer(blueMat, [-2.2, 0, 21.2], 'batter');
const catcher = makePlayer(redMat, [0, 0, 25.5], 'catcher');
const fielderPositions = [
  { role: 'thirdBase', label: '三壘手', position: [-10.5, 0, 5.2] },
  { role: 'firstBase', label: '一壘手', position: [10.5, 0, 5.2] },
  { role: 'shortstop', label: '游擊手', position: [-5.5, 0, -1.5] },
  { role: 'secondBase', label: '二壘手', position: [5.5, 0, -1.5] },
  { role: 'leftField', label: '左外野手', position: [-30, 0, -23] },
  { role: 'centerField', label: '中外野手', position: [0, 0, -32] },
  { role: 'rightField', label: '右外野手', position: [30, 0, -23] }
];
const fielders = fielderPositions.map(({ role, label, position }) => {
  const player = makePlayer(redMat, position, 'fielder');
  player.userData.positionRole = role;
  player.userData.positionLabel = label;
  return player;
});

// Visible base runners and simple automatic outfield pursuit.
const runners = [0,1,2].map(() => makePlayer(blueMat, [0,-20,0], 'runner'));
runners.forEach(r => { r.visible = false; });
const runnerBasePositions = [[15.5,0,6.5],[0,0,-9],[-15.5,0,6.5]];
const homeRunnerPosition = [0,0,22];
let chasingFielder = null;
let catchResolved = false;
let catchAnimationUntil = 0;
let catcherReceiving = false;
let pendingHitKind = 'single';
let isGroundBall = false;
let throwStartedAt = 0;
let throwFielder = null;
let selectedThrowBase = 'first';
let selectedRunnerBase = 0;
let runnerAggressive = false;
let throwWasForceOut = true;
let fieldingTarget = new THREE.Vector3();
let fieldingStartedAt = 0;

function chooseFielderForBall() {
  const projected = ball.position.clone();
  const horizontalVelocity = new THREE.Vector3(ballVelocity.x, 0, ballVelocity.z);
  const projectionTime = isGroundBall ? 0.42 : 0.72;
  projected.addScaledVector(horizontalVelocity, projectionTime);
  projected.x = THREE.MathUtils.clamp(projected.x, -58, 58);
  projected.z = THREE.MathUtils.clamp(projected.z, -58, 15);
  fieldingTarget.copy(projected);
  const outfieldRoles = ['leftField', 'centerField', 'rightField'];
  // A normal fly ball can land well in front of the warning track. Keep the
  // outfield responsibility wide enough that shallow and medium flies do not
  // incorrectly select an infielder and leave the outfielder standing still.
  const projectedToOutfield = projected.z < 8 || Math.abs(projected.x) > 18;
  const candidates = fielders.filter(player => {
    const isOutfielder = outfieldRoles.includes(player.userData.positionRole);
    if (!isGroundBall && projectedToOutfield) return isOutfielder;
    if (isGroundBall && projected.z > -22) return !isOutfielder;
    return true;
  });
  const availableFielders = candidates.length ? candidates : fielders;
  return availableFielders.reduce((best, player) => {
    const home = player.userData.homePosition;
    const routeDistance = home.distanceTo(projected);
    const isOutfielder = outfieldRoles.includes(player.userData.positionRole);
    const rolePenalty = isGroundBall && isOutfielder ? 8 : !isGroundBall && !isOutfielder ? 6 : 0;
    const score = routeDistance + rolePenalty;
    return !best || score < best.score ? { player, score } : best;
  }, null)?.player || availableFielders[0];
}

function resetFieldersToHome() {
  fielders.forEach(player => {
    player.position.copy(player.userData.homePosition);
    player.rotation.y = 0;
    player.userData.fieldingState = 'ready';
    player.userData.legs.forEach(leg => { leg.rotation.x = 0; });
    player.userData.arms.forEach(arm => { arm.rotation.x = 0; arm.rotation.z = -0.32; });
    player.userData.torso.rotation.z = 0;
  });
}

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
const bat = cylinder(batPivot, 0.07, 0.105, 2.2, [0, 1.0, 0], mat(0xc99559), 16);
bat.rotation.z = -0.18;
const batGrip = cylinder(batPivot, 0.072, 0.072, 0.55, [0, 0.22, 0], mat(0x252b33), 12);
batGrip.rotation.z = -0.18;
const batKnob = new THREE.Mesh(new THREE.SphereGeometry(0.095,12,8),mat(0x252b33));
batKnob.position.set(0, -0.08, 0); batPivot.add(batKnob);
batPivot.rotation.z = -0.72;
// Baseball and seam approximation.
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), ballMat);
ball.castShadow = true; scene.add(ball); ball.visible = false;
const seamMat = new THREE.MeshBasicMaterial({color:0xc84d4d});
const seam = new THREE.Mesh(new THREE.TorusGeometry(0.19,0.012,5,32),seamMat);
seam.rotation.set(0.6,0.4,0.2); ball.add(seam);

// A short translucent motion trail makes pitch and hit direction easier to read.
const ballTrailHistory = [];
const ballTrail = Array.from({ length: 8 }, (_, index) => {
  const material = new THREE.MeshBasicMaterial({
    color: index < 3 ? 0xd9f4ff : 0x8fc9e8,
    transparent: true,
    opacity: 0.34 * (1 - index / 8),
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16 - index * 0.012, 10, 8), material);
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
});

const cameraViews = {
  broadcast: { position: [54, 48, 65], target: [0, 0, -5], label: '全場視角' },
  // Low over-the-shoulder framing keeps the batter in the foreground while
  // centering the pitcher, strike zone and incoming pitch like a mobile game.
  batter: { position: [-4.8, 2.72, 27.8], target: [-0.05, 1.55, 6.2], label: '打者視角' },
  pitcher: { position: [0, 4.5, -12], target: [0, 1.5, 22], label: '投球視角' },
  field: { position: [34, 25, -35], target: [0, 0, 4], label: '守備視角' },
  runner: { position: [22, 12, 29], target: [0, 0, 7], label: '跑壘視角' }
};
// Batter-facing strike zone: official-style rectangular frame with nine target cells.
const strikeZone = new THREE.Group();
const zoneLineMat = new THREE.MeshBasicMaterial({ color: 0x63dcff, transparent: true, opacity: 0.96 });
const zoneGridMat = new THREE.MeshBasicMaterial({ color: 0x9cecff, transparent: true, opacity: 0.52 });
const zonePanel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.35), new THREE.MeshBasicMaterial({ color: 0x3cbbe8, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false }));
zonePanel.position.set(0, 1.575, 19.62); strikeZone.add(zonePanel);
function zoneBar(w,h,x,y,z,material=zoneLineMat) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w,h,0.035), material);
  bar.position.set(x,y,z); strikeZone.add(bar);
}
const zx=0.92, zy0=0.9, zy1=2.25, zz=19.58, thick=0.045;
zoneBar(thick,zy1-zy0,-zx,(zy0+zy1)/2,zz);
zoneBar(thick,zy1-zy0,zx,(zy0+zy1)/2,zz);
zoneBar(zx*2,thick,0,zy0,zz);
zoneBar(zx*2,thick,0,zy1,zz);
for(const x of [-zx/3,zx/3]) zoneBar(0.025,zy1-zy0,x,(zy0+zy1)/2,zz+0.015,zoneGridMat);
for(const y of [zy0+(zy1-zy0)/3,zy0+2*(zy1-zy0)/3]) zoneBar(zx*2,0.025,0,y,zz+0.015,zoneGridMat);
scene.add(strikeZone);
strikeZone.visible = true;

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
const teamRoster = [
  { name: '統一獅', short: 'U', color: 0xf2a900 },
  { name: '富邦悍將', short: 'F', color: 0x1767a5 },
  { name: '樂天桃猿', short: 'R', color: 0xc8326b },
  { name: '中信兄弟', short: 'B', color: 0xf5c242 },
  { name: '味全龍', short: 'W', color: 0xd44b3d },
  { name: '台鋼雄鷹', short: 'T', color: 0x2d8e86 }
];
const awayTeamSelect = document.querySelector('#awayTeamSelect');
const homeTeamSelect = document.querySelector('#homeTeamSelect');
const gameModeSelect = document.querySelector('#gameMode');
let selectedTeams = { away: 0, home: 1 };
let selectedGameMode = 'quick';
let autoGameEnabled = false;
let autoGameTimer = 0;
let developmentRewarded = false;
const defaultDevelopmentPlayers = [
  { name: '陳曜廷', role: '先發投手', speed: 156, control: 82 },
  { name: '林奕辰', role: '先發投手', speed: 151, control: 86 },
  { name: '周柏翰', role: '先發投手', speed: 148, control: 79 },
  { name: '許承恩', role: '中繼投手', speed: 153, control: 81 },
  { name: '江子皓', role: '終結者', speed: 158, control: 77 }
];
function loadDevelopmentPlayers() {
  const saved = localStorage.getItem('diamond-baseball-development');
  if (!saved) return defaultDevelopmentPlayers.map(player => ({ ...player, level: 12, xp: 0, trainingPoints: 3 }));
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length !== defaultDevelopmentPlayers.length) throw new Error('invalid player save');
    return parsed.map((player, index) => {
      const savedPlayer = player && typeof player === 'object' ? player : {};
      const defaults = { ...defaultDevelopmentPlayers[index], level: 12, xp: 0, trainingPoints: 3 };
      return {
        ...defaults,
        level: Number.isFinite(savedPlayer.level) ? Math.max(1, Math.floor(savedPlayer.level)) : defaults.level,
        xp: Number.isFinite(savedPlayer.xp) ? Math.max(0, Math.floor(savedPlayer.xp)) : defaults.xp,
        trainingPoints: Number.isFinite(savedPlayer.trainingPoints)
          ? Math.max(0, Math.floor(savedPlayer.trainingPoints))
          : defaults.trainingPoints,
        speed: Number.isFinite(savedPlayer.speed)
          ? Math.min(170, Math.max(defaults.speed, savedPlayer.speed))
          : defaults.speed,
        control: Number.isFinite(savedPlayer.control)
          ? Math.min(99, Math.max(1, savedPlayer.control))
          : defaults.control
      };
    });
  } catch (error) {
    console.warn('球員培養資料無法讀取，已使用預設資料。', error);
    return defaultDevelopmentPlayers.map(player => ({ ...player, level: 12, xp: 0, trainingPoints: 3 }));
  }
}
const developmentPlayers = loadDevelopmentPlayers();
developmentPlayers.forEach((player, index) => {
  pitcherRoster[index].speed += (player.speed - defaultDevelopmentPlayers[index].speed) * 0.006;
});
function saveDevelopmentPlayers() {
  localStorage.setItem('diamond-baseball-development', JSON.stringify(developmentPlayers));
}
function populateTeamSelects() {
  [awayTeamSelect, homeTeamSelect].forEach(select => {
    if (!select) return;
    select.innerHTML = teamRoster.map((team, index) =>
      `<option value="${index}">${team.name}</option>`).join('');
  });
  if (awayTeamSelect) awayTeamSelect.value = selectedTeams.away;
  if (homeTeamSelect) homeTeamSelect.value = selectedTeams.home;
}
function updateTeamUI() {
  const away = teamRoster[selectedTeams.away];
  const home = teamRoster[selectedTeams.home];
  redMat.color.setHex(home.color);
  blueMat.color.setHex(away.color);
  document.querySelector('#awayTeamName').textContent = away.name;
  document.querySelector('#homeTeamName').textContent = home.name;
  document.querySelector('.team-symbol.red').textContent = away.short;
  document.querySelector('.team-symbol.red').style.background = `#${away.color.toString(16).padStart(6, '0')}`;
  document.querySelector('.team-block.away .team-symbol').textContent = home.short;
  document.querySelector('.team-block.away .team-symbol').style.background = `#${home.color.toString(16).padStart(6, '0')}`;
}
function updatePlayerCard() {
  const player = developmentPlayers[activePitcherIndex];
  document.querySelector('#activePlayerName').textContent = player.name;
  document.querySelector('#activePlayerRole').textContent =
    `${player.role}・LV ${player.level}`;
  document.querySelector('#playerSpeed').textContent = player.speed;
  document.querySelector('#playerControl').textContent = player.control;
  document.querySelector('#playerCondition').textContent = Math.round(pitcherStamina);
  document.querySelector('#playerXp').textContent = player.xp;
  document.querySelector('#trainingPoints').textContent = player.trainingPoints;
  document.querySelector('#speedTrainingBtn').disabled = player.trainingPoints < 1;
  document.querySelector('#controlTrainingBtn').disabled = player.trainingPoints < 1;
  document.querySelector('#recoveryTrainingBtn').disabled = player.trainingPoints < 1;
}
function trainPlayer(type) {
  const player = developmentPlayers[activePitcherIndex];
  if (player.trainingPoints < 1) {
    setHint('訓練點不足，請先完成比賽取得訓練點。');
    return;
  }
  if (type === 'speed') {
    player.speed = Math.min(170, player.speed + 1);
    pitcherRoster[activePitcherIndex].speed += 0.006;
  } else if (type === 'control') {
    player.control = Math.min(99, player.control + 2);
  } else {
    pitcherStamina = Math.min(100, pitcherStamina + 25);
  }
  player.trainingPoints -= 1;
  player.xp += 20;
  if (player.xp >= player.level * 100) {
    player.xp -= player.level * 100;
    player.level += 1;
    setHint(`${player.name} 升級至 LV ${player.level}！`);
  } else {
    setHint(`${player.name} 完成${type === 'speed' ? '球速' : type === 'control' ? '控球' : '體能'}訓練。`);
  }
  saveDevelopmentPlayers();
  updateStaminaUI();
}
populateTeamSelects();
updateTeamUI();
function updateStaminaUI() {
  pitcherRoster[activePitcherIndex].stamina = pitcherStamina;
  if (staminaFill) staminaFill.style.width = `${pitcherStamina}%`;
  if (staminaValue) staminaValue.textContent = `${Math.round(pitcherStamina)}%`;
  if (staminaFill) staminaFill.classList.toggle('low', pitcherStamina < 30);
  if (pitcherName) pitcherName.textContent = pitcherRoster[activePitcherIndex].name;
  updatePlayerCard();
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
let ballSpinRate = 18;
let homerResolved = false;
const fireworkParticles = [];
let fieldingCatchPlayer = null;
let fieldingCatchStartedAt = 0;
let fieldingCatchUntil = 0;
let pitchInZone = false;
let pitchTargetInZone = false;
let pitchZoneChecked = false;
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
const soundToggle = document.querySelector('#soundToggle');
let soundEnabled = localStorage.getItem('diamond-baseball-sound') !== 'off';
let audioContext = null;
let lastSoundCall = '';
function ensureAudio() {
  if (!soundEnabled) return null;
  audioContext ||= new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}
function playSound(type) {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  const presets = {
    pitch: { frequency: 180, duration: 0.08, gain: 0.035, wave: 'sine' },
    swing: { frequency: 110, duration: 0.12, gain: 0.055, wave: 'triangle' },
    catch: { frequency: 440, duration: 0.08, gain: 0.05, wave: 'square' },
    out: { frequency: 230, duration: 0.2, gain: 0.05, wave: 'sawtooth' },
    hit: { frequency: 95, duration: 0.16, gain: 0.08, wave: 'triangle' },
    homer: { frequency: 520, duration: 0.5, gain: 0.07, wave: 'sine' }
  };
  const preset = presets[type] || presets.hit;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = preset.wave;
  oscillator.frequency.setValueAtTime(preset.frequency, now);
  if (type === 'homer') oscillator.frequency.exponentialRampToValueAtTime(900, now + preset.duration);
  gain.gain.setValueAtTime(preset.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + preset.duration);
}
function playSoundForCall(call) {
  if (!call || call === lastSoundCall) return;
  lastSoundCall = call;
  if (/全壘打/.test(call)) playSound('homer');
  else if (/出局|三振|接殺|封殺|觸殺/.test(call)) playSound('out');
  else if (/安打|保送|得分|盜/.test(call)) playSound('hit');
  else if (/好球|壞球/.test(call)) playSound('catch');
}
function updateSoundButton() {
  if (!soundToggle) return;
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggle.classList.toggle('muted', !soundEnabled);
  soundToggle.setAttribute('aria-label', soundEnabled ? '關閉音效' : '開啟音效');
}
soundToggle?.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('diamond-baseball-sound', soundEnabled ? 'on' : 'off');
  updateSoundButton();
  if (soundEnabled) playSound('catch');
});
updateSoundButton();
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
function updateRunnerControls(state) {
  const buttons = [...document.querySelectorAll('.runner-select')];
  buttons.forEach(button => {
    const index = Number(button.dataset.runnerBase);
    button.classList.toggle('active', index === selectedRunnerBase);
    button.disabled = !state.bases[index] || state.half !== '上' || state.gameOver;
  });
  const stealButton = document.querySelector('#stealBtn');
  const canSteal = state.half === '上' && !state.gameOver && ballMode === 'idle' &&
    !!state.bases[selectedRunnerBase] &&
    (selectedRunnerBase === 2 || !state.bases[selectedRunnerBase + 1]);
  if (stealButton) stealButton.disabled = !canSteal;
  const status = document.querySelector('#runnerStatus');
  if (!status) return;
  if (state.half !== '上') status.textContent = '目前是守備局，玩家無法控制跑壘';
  else if (ballMode !== 'idle') status.textContent = '球正在比賽中，等待球停下後再發動盜壘';
  else if (!state.bases[selectedRunnerBase]) status.textContent = '所選壘包目前沒有跑者';
  else if (selectedRunnerBase < 2 && state.bases[selectedRunnerBase + 1]) status.textContent = '前方壘包已有跑者，不能盜壘';
  else status.textContent = '可嘗試盜向下一個壘包；盜壘有失敗出局風險';
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
  updateRunnerControls(state);
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
  playSoundForCall(state.lastCall);
  if (state.gameOver) {
    if (!developmentRewarded) {
      developmentPlayers[activePitcherIndex].trainingPoints += 1;
      saveDevelopmentPlayers();
      developmentRewarded = true;
      updatePlayerCard();
    }
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
  strikeZone.visible = name === 'batter';
  document.querySelectorAll('.camera-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
}
const controlsTarget = new THREE.Vector3(0,0,-5);
function setHint(text) { hint.textContent = text; }
function isStrikeAtPlate(x, y) {
  return Math.abs(x) <= zx && y >= zy0 && y <= zy1;
}
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
  resetFieldersToHome();
  lastSoundCall = '';
  aiPitchCooldown = 3.2 + Math.random() * 1.2;
  if (aiOpponentEnabled) {
    const aiPitches = ['fastball', 'twoseam', 'slider', 'curve', 'changeup', 'splitter', 'sinker'];
    activePitchType = aiPitches[Math.floor(Math.random() * aiPitches.length)];
    const pitchTypeSelect = document.querySelector('#pitchType');
    if (pitchTypeSelect) pitchTypeSelect.value = activePitchType;
  }
  pitchNumber++;
  pitchWasSwungAt = false;
  catcherReceiving = false;
  pitchResolved = false;
  pitchZoneChecked = false;
  pitchInZone = false;
  pendingSwing = false;
  pitcherThrowStartedAt = performance.now() / 1000;
  const profiles = {
    fastball: { speed: 39, curve: 0.0, label: '四縫線快速球' },
    sinker: { speed: 34, curve: 1.4, label: '伸卡球' },
    slider: { speed: 32, curve: 2.8, label: '滑球' },
    curve: { speed: 27, curve: 3.8, label: '曲球' },
    changeup: { speed: 28, curve: 0.9, label: '變速球' },
    splitter: { speed: 31, curve: 1.5, label: '指叉球' },
    twoseam: { speed: 36, curve: 1.2, label: '二縫線快速球' }
  };
  const profile = profiles[activePitchType] || profiles.fastball;
  const spinProfiles = { fastball: 24, twoseam: 20, sinker: 17, slider: 29, curve: 34, changeup: 13, splitter: 22 };
  ballSpinRate = spinProfiles[activePitchType] || 20;
  pitcherStamina = Math.max(8, pitcherStamina - 1.8);
  updateStaminaUI();
  const fatigue = 1 - (100 - pitcherStamina) * 0.0028;
  const effectiveSpeed = profile.speed * fatigue * pitcherRoster[activePitcherIndex].speed;
  const controlRating = developmentPlayers[activePitcherIndex].control;
  const controlSpread = Math.max(1.1, 3.2 - controlRating * 0.012 + (100 - pitcherStamina) * 0.025);
  const targetX = (Math.random() - 0.5) * controlSpread;
  const targetY = 0.75 + Math.random() * (1.9 + (100 - pitcherStamina) * 0.006);
  // The final strike/ball call is made from the ball's actual position at the plate.
  pitchInZone = false;
  pitchTargetInZone = false;
  ball.position.set(0, 2.4, -0.3);
  ball.visible = true;
  ballMode = 'pitch'; ballAge = 0;
  updateRunnerControls(match.snapshot());
  activePitchCurve = profile.curve * (Math.random() < 0.5 ? -1 : 1);
  const destination = new THREE.Vector3(targetX, targetY, 19.7);
  const duration = 34 / effectiveSpeed;
  ballVelocity.copy(destination.sub(ball.position)).multiplyScalar(1 / duration);
  const predictedTime = Math.max(0, (zz - ball.position.z) / Math.max(0.001, ballVelocity.z));
  const predictedBreak = activePitchCurve * 0.72;
  const predictedDrop = activePitchType === 'curve'
    ? 4.0
    : activePitchType === 'splitter'
      ? 2.6
      : activePitchType === 'sinker'
        ? 1.6
        : 0.8;
  const predictedX = ball.position.x + ballVelocity.x * predictedTime +
    0.5 * predictedBreak * predictedTime * predictedTime;
  const predictedY = ball.position.y + ballVelocity.y * predictedTime -
    0.5 * predictedDrop * predictedTime * predictedTime;
  pitchTargetInZone = isStrikeAtPlate(predictedX, predictedY);
  setView('batter');
  const speedKmh = Math.round(effectiveSpeed * 3.6);
  setHint(profile.label + ' ' + speedKmh + ' km/h，球已投出！');
  playSound('pitch');
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

  // Contact physics: swing timing and bat sweet-spot alignment determine exit speed and launch angle.
  const verticalAim = aimPoint.y - ball.position.y;
  const launchAngle = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(
    12 + verticalAim * 17 + (timingScore - 0.5) * 8, 4, 48
  ));
  const exitSpeed = 25 + quality * 17;
  const sprayAngle = THREE.MathUtils.clamp(
    (aimPoint.x - ball.position.x) * 0.13 + (Math.random() - 0.5) * (0.22 - quality * 0.12),
    -0.62, 0.62
  );
  const horizontalSpeed = exitSpeed * Math.cos(launchAngle);
  const verticalSpeed = exitSpeed * Math.sin(launchAngle);
  const estimatedCarry = horizontalSpeed * (2 * verticalSpeed / 17);
  const kind = estimatedCarry > 78 && launchAngle > THREE.MathUtils.degToRad(23) && launchAngle < THREE.MathUtils.degToRad(36) && quality > 0.78
    ? 'homer'
    : estimatedCarry > 58 && quality > 0.55 ? 'triple'
    : estimatedCarry > 38 ? 'double'
    : 'single';
  pendingHitKind = kind;
  isGroundBall = launchAngle < THREE.MathUtils.degToRad(12);
  ballMode = 'hit';
  updateRunnerControls(match.snapshot());
  catchResolved = false;
  homerResolved = false;
  ballVelocity.set(
    Math.sin(sprayAngle) * horizontalSpeed,
    verticalSpeed,
    -Math.cos(sprayAngle) * horizontalSpeed
  );
  ballSpinRate = 38 + quality * 18;
  chasingFielder = chooseFielderForBall();
  fieldingStartedAt = performance.now() / 1000 + chasingFielder.userData.reactionDelay;
  chasingFielder.userData.fieldingState = 'reacting';
  ballAge = 0;
  setView('field');
  setHint(isGroundBall
    ? `${chasingFielder.userData.positionLabel} 正追處理滾地球！`
    : kind === 'homer'
      ? '全壘打！球飛越外野！'
      : `${chasingFielder.userData.positionLabel} 正追球！`);
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
  playSound('swing');
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
    if (!pitchZoneChecked) {
      pitchInZone = isStrikeAtPlate(ball.position.x, ball.position.y);
      pitchZoneChecked = true;
    }
    pitchResolved = true;
    match.pitch({ inZone: pitchInZone, swung: false });
    actionTitle.textContent = pitchInZone ? '好球' : '壞球';
    actionDescription.textContent = pitchInZone
      ? '球在本壘板前實際穿越好球帶。'
      : '球在本壘板前實際偏離好球帶。';
  }
  ball.visible = false; ballMode = 'idle'; activePitchCurve = 0;
  updateRunnerControls(match.snapshot());
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
document.querySelector('#speedTrainingBtn')?.addEventListener('click', () => trainPlayer('speed'));
document.querySelector('#controlTrainingBtn')?.addEventListener('click', () => trainPlayer('control'));
document.querySelector('#recoveryTrainingBtn')?.addEventListener('click', () => trainPlayer('recovery'));
function restartMatch() {
  match.reset();
  developmentRewarded = false;
  pitcherRoster.forEach(p => { p.stamina = 100; });
  activePitcherIndex = 0;
  pitcherStamina = 100;
  if (pitcherSelect) pitcherSelect.value = '0';
  updateStaminaUI();
  document.querySelector('#pitchBtn').disabled = false;
  ball.visible = false;
  ballMode = 'idle';
  aiPitchCooldown = aiOpponentEnabled ? 1.2 : 999;
  selectedRunnerBase = 0;
  updateRunnerControls(match.snapshot());
  chasingFielder = null;
  throwFielder = null;
  catchResolved = false;
  pendingSwing = false;
  pendingHitKind = 'single';
  actionTitle.textContent = `${teamRoster[selectedTeams.away].name} vs ${teamRoster[selectedTeams.home].name}`;
  actionDescription.textContent = `${selectedGameMode === 'quick' ? '快速比賽' : gameModeSelect?.selectedOptions[0]?.textContent || '比賽'} 已開始。`;
}
document.querySelector('#restartBtn')?.addEventListener('click', restartMatch);
document.querySelector('#applyMatchSetup')?.addEventListener('click', () => {
  const away = Number(awayTeamSelect?.value);
  const home = Number(homeTeamSelect?.value);
  if (!Number.isInteger(away) || !Number.isInteger(home) || away === home) {
    setHint('客場與主場必須選擇不同球隊。');
    return;
  }
  selectedTeams = { away, home };
  selectedGameMode = gameModeSelect?.value || 'quick';
  updateTeamUI();
  restartMatch();
  setHint(`${teamRoster[away].name} 對 ${teamRoster[home].name}，${gameModeSelect?.selectedOptions[0]?.textContent || '快速比賽'}開始！`);
});
document.querySelector('#autoGameBtn')?.addEventListener('click', event => {
  autoGameEnabled = !autoGameEnabled;
  event.currentTarget.classList.toggle('active', autoGameEnabled);
  event.currentTarget.textContent = autoGameEnabled ? '停止自動比賽' : '自動比賽';
  aiOpponentEnabled = true;
  aiToggle?.classList.add('active');
  if (aiToggle) aiToggle.textContent = 'AI 對手：開';
  aiPitchCooldown = 0.4;
  setHint(autoGameEnabled ? '自動比賽已啟用：雙方 AI 將完成九局規則流程。' : '自動比賽已停止，恢復手動操作。');
});
document.querySelector('#swingBtn').addEventListener('click', swing);
document.querySelector('#runnerNormalBtn')?.addEventListener('click', () => {
  runnerAggressive = false;
  document.querySelector('#runnerNormalBtn').classList.add('active');
  document.querySelector('#runnerAggressiveBtn')?.classList.remove('active');
  setHint('跑壘策略：穩健推進。');
});
document.querySelector('#runnerAggressiveBtn')?.addEventListener('click', () => {
  runnerAggressive = true;
  document.querySelector('#runnerAggressiveBtn').classList.add('active');
  document.querySelector('#runnerNormalBtn')?.classList.remove('active');
  setHint('跑壘策略：積極推進，長打時可能多得一個壘包，但也有風險。');
});
document.querySelectorAll('.runner-select').forEach(btn => btn.addEventListener('click', () => {
  selectedRunnerBase = Number(btn.dataset.runnerBase);
  document.querySelectorAll('.runner-select').forEach(item => item.classList.toggle('active', item === btn));
  updateRunnerControls(match.snapshot());
  setHint('已選擇' + ['一壘','二壘','三壘'][selectedRunnerBase] + '跑者。');
}));
document.querySelector('#stealBtn')?.addEventListener('click', () => {
  if (ballMode !== 'idle' || match.half !== '上' || match.gameOver) return;
  const chanceByBase = [0.68, 0.62, 0.52];
  const success = Math.random() < chanceByBase[selectedRunnerBase];
  const completed = match.steal(selectedRunnerBase, success);
  if (completed) {
    setView('runner');
    setHint(match.lastCall);
    actionTitle.textContent = '盜壘成功！';
    actionDescription.textContent = '指定跑者已實際推進壘包，壘包與比分同步更新。';
  } else if (!success) {
    setHint('盜壘失敗，跑者出局！');
    actionTitle.textContent = '盜壘失敗';
    actionDescription.textContent = '守備完成觸殺，出局數已更新。';
  } else {
    setHint(match.lastCall);
  }
});
document.querySelectorAll('.throw-target').forEach(btn => btn.addEventListener('click', () => {
  selectedThrowBase = btn.dataset.base;
  document.querySelectorAll('.throw-target').forEach(item => item.classList.toggle('active', item === btn));
  setHint('守備傳球目標：' + ({first:'一壘',second:'二壘',third:'三壘',home:'本壘'}[selectedThrowBase]));
}));
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
  if (event.key === '1') document.querySelector('#runnerNormalBtn')?.click();
  if (event.key === '2') document.querySelector('#runnerAggressiveBtn')?.click();
  if (event.key.toLowerCase() === 'q') document.querySelector('.throw-target[data-base="first"]')?.click();
  if (event.key.toLowerCase() === 'w') document.querySelector('.throw-target[data-base="second"]')?.click();
  if (event.key.toLowerCase() === 'e') document.querySelector('.throw-target[data-base="third"]')?.click();
  if (event.key.toLowerCase() === 'r') document.querySelector('.throw-target[data-base="home"]')?.click();
  if (event.key.toLowerCase() === 's') document.querySelector('#stealBtn')?.click();
  const views = ['broadcast','batter','pitcher','field','runner'];
  if ('12345'.includes(event.key)) setView(views[Number(event.key)-1]);
});

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  const now = performance.now() / 1000;

  // AI automatically pitches in the top half; auto mode also lets AI pitch the bottom half.
  if (aiOpponentEnabled && ballMode === 'idle' && !match.gameOver &&
      (match.half === '上' || autoGameEnabled && match.half === '下')) {
    aiPitchCooldown -= dt;
    if (aiPitchCooldown <= 0) nextPitch();
  }
  if (autoGameEnabled && match.gameOver) {
    autoGameEnabled = false;
    const autoButton = document.querySelector('#autoGameBtn');
    autoButton?.classList.remove('active');
    if (autoButton) autoButton.textContent = '自動比賽';
  }

  runners.forEach(runner => {
    if (runner.visible && runner.userData.runProgress < 1) {
      runner.userData.runProgress = Math.min(1, runner.userData.runProgress + dt * 1.15);
      const t = runner.userData.runProgress;
      const eased = t * t * (3 - 2 * t);
      runner.position.lerpVectors(runner.userData.runFrom, runner.userData.runTo, eased);
      runner.position.y = Math.sin(t * Math.PI) * 0.16;
      const stride = Math.sin(now * 13) * (1 - t) * 0.55;
      // Coordinate the runner's arms and torso with the leg cycle for a more natural sprint.
      runner.userData.legs[0].rotation.x = stride;
      runner.userData.legs[1].rotation.x = -stride;
      runner.userData.arms[0].rotation.x = -stride * 0.72;
      runner.userData.arms[1].rotation.x = stride * 0.72;
      runner.userData.torso.rotation.z = -0.06 - Math.abs(stride) * 0.16;
      runner.rotation.y = Math.atan2(runner.userData.runTo.x - runner.position.x, runner.userData.runTo.z - runner.position.z);
      if (t >= 1) {
        runner.userData.legs.forEach(leg => { leg.rotation.x = 0; });
        runner.userData.arms.forEach(arm => { arm.rotation.x = 0; });
        runner.userData.torso.rotation.z = 0;
      }
    }
  });

  const view = cameraViews[currentView];
  if (ballMode !== 'hit') {
    if (cameraTween < 1) {
      cameraTween = Math.min(1, cameraTween + dt * 1.8);
      const t = cameraTween * cameraTween * (3 - 2 * cameraTween);
      camera.position.lerpVectors(cameraFrom, new THREE.Vector3(...view.position), t);
      controlsTarget.lerpVectors(cameraTargetFrom, new THREE.Vector3(...view.target), t);
    } else {
      camera.position.set(...view.position);
      controlsTarget.set(...view.target);
    }
  }
  camera.lookAt(controlsTarget);

  if (ballMode === 'throw') {
    const progress = Math.min(1, (now - throwStartedAt) / 0.48);
    // Animate the fielder's wind-up, release and follow-through with the ball flight.
    const release = THREE.MathUtils.clamp(progress / 0.42, 0, 1);
    const follow = THREE.MathUtils.clamp((progress - 0.42) / 0.58, 0, 1);
    throwFielder.userData.arms[0].rotation.z = THREE.MathUtils.lerp(0.95, -0.78, release);
    throwFielder.userData.arms[1].rotation.z = THREE.MathUtils.lerp(-0.2, 0.38, release) * (1 - follow * 0.65);
    throwFielder.userData.torso.rotation.z = -0.12 * (1 - follow) + 0.04 * follow;
    const start = new THREE.Vector3(throwFielder.position.x, 1.65, throwFielder.position.z);
    const throwTargets = {
      first: new THREE.Vector3(15.5, 1.25, 6.5),
      second: new THREE.Vector3(0, 1.25, -9),
      third: new THREE.Vector3(-15.5, 1.25, 6.5),
      home: new THREE.Vector3(0, 1.25, 22)
    };
    const end = throwTargets[selectedThrowBase] || throwTargets.first;
    ball.position.lerpVectors(start, end, progress);
    ball.rotation.x += dt * 14;
    if (progress >= 1) {
      ball.visible = false; ballMode = 'idle';
      throwFielder.userData.arms.forEach(arm => { arm.rotation.z = -0.32; });
      throwFielder.userData.torso.rotation.z = 0;
      throwFielder = null;
      const bases = match.snapshot().bases;
      const forceAvailable = selectedThrowBase === 'first' ||
        (selectedThrowBase === 'second' && bases[0]) ||
        (selectedThrowBase === 'third' && bases[1]) ||
        (selectedThrowBase === 'home' && bases[2]);
      if (forceAvailable) {
        match.batterNumber++;
        match.addOut('守備傳向' + ({first:'一壘',second:'二壘',third:'三壘',home:'本壘'}[selectedThrowBase]) + '完成封殺！');
        setHint('傳球封殺成功！');
        actionTitle.textContent = '封殺成功！';
        actionDescription.textContent = '你選擇的壘包有封殺機會，守備完成出局。';
      } else {
        match.pitch({ contact: true, result: pendingHitKind, aggressive: false });
        setHint('傳球目標沒有封殺機會，打者安全上壘！');
        actionTitle.textContent = '安全上壘';
        actionDescription.textContent = '傳球沒有形成封殺，打者與跑者推進。';
      }
    }
  }

  if (ballMode === 'pitch' || ballMode === 'hit') {
    ballAge += dt;
    const previousBallPosition = ball.position.clone();
    ball.position.addScaledVector(ballVelocity, dt);
    if (ballMode === 'pitch' && !pitchZoneChecked && previousBallPosition.z < 19.58 && ball.position.z >= 19.58) {
      const crossingT = THREE.MathUtils.clamp((19.58 - previousBallPosition.z) / Math.max(0.0001, ball.position.z - previousBallPosition.z), 0, 1);
      const crossingX = THREE.MathUtils.lerp(previousBallPosition.x, ball.position.x, crossingT);
      const crossingY = THREE.MathUtils.lerp(previousBallPosition.y, ball.position.y, crossingT);
      pitchInZone = isStrikeAtPlate(crossingX, crossingY);
      pitchZoneChecked = true;
    }
    // Rotate the stitched baseball to suggest pitch-specific spin and post-contact rotation.
    const spinDirection = ballMode === 'hit' ? 1 : -1;
    ball.rotation.x += dt * ballSpinRate * 0.72 * spinDirection;
    ball.rotation.y += dt * ballSpinRate * 0.38;
    ball.rotation.z += dt * ballSpinRate * 0.16;
    if (ballMode === 'pitch') {
      // Apply lateral break as acceleration rather than a frame-dependent position offset.
      const breakAcceleration = activePitchCurve * 0.72;
      ballVelocity.x += breakAcceleration * dt;
      const dropAcceleration = activePitchType === 'curve' ? 4.0 : activePitchType === 'splitter' ? 2.6 : activePitchType === 'sinker' ? 1.6 : 0.8;
      ballVelocity.y -= dropAcceleration * dt;
      ballVelocity.multiplyScalar(Math.exp(-0.018 * dt));
    }
    // AI batter decision in the bottom half: swing at most pitches in-zone and sometimes chase.
    if (ballMode === 'pitch' && aiOpponentEnabled &&
        (match.half === '下' || autoGameEnabled && match.half === '上') &&
        !pendingSwing && !pitchResolved && ball.position.z >= 13.4 &&
        aiDecisionPitchNumber !== pitchNumber) {
      aiDecisionPitchNumber = pitchNumber;
      const shouldSwing = pitchTargetInZone ? Math.random() < 0.82 : Math.random() < 0.28;
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
      strikeZone.visible = false;
      // Keep the selected camera angle, but smoothly track the ball after contact.
      const followOffsets = {
        broadcast: new THREE.Vector3(24, 18, 32),
        batter: new THREE.Vector3(-15, 11, 25),
        pitcher: new THREE.Vector3(0, 15, 29),
        field: new THREE.Vector3(23, 16, 27),
        runner: new THREE.Vector3(18, 13, 26)
      };
      const followTarget = ball.position.clone();
      const followPosition = followTarget.clone().add(followOffsets[currentView] || followOffsets.field);
      camera.position.lerp(followPosition, Math.min(1, dt * 1.8));
      controlsTarget.lerp(followTarget, Math.min(1, dt * 2.8));
      camera.lookAt(controlsTarget);
      const fairTerritory = Math.abs(ball.position.x) <= Math.max(2.5, (22 - ball.position.z) * 1.02);
      if (pendingHitKind === 'homer' && !homerResolved && fairTerritory && Math.hypot(ball.position.x, ball.position.z - 22) >= 79.5 && ball.position.y > 2.2) {
        homerResolved = true;
        catchResolved = true;
        const burstOrigin = ball.position.clone();
        for (let n = 0; n < 24; n++) {
          const material = new THREE.MeshBasicMaterial({
            color: [0xffd166, 0xff6b6b, 0x75d5ff, 0xffffff][n % 4],
            transparent: true,
            opacity: 1
          });
          const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.09, 7, 6), material);
          spark.position.copy(burstOrigin);
          scene.add(spark);
          const direction = new THREE.Vector3(Math.random() - 0.5, Math.random() * 1.1 + 0.25, Math.random() - 0.5).normalize();
          fireworkParticles.push({ mesh: spark, velocity: direction.multiplyScalar(8 + Math.random() * 13), age: 0, life: 1.2 + Math.random() * 0.65 });
        }
        ball.visible = false;
        ballMode = 'idle';
        ballVelocity.set(0, 0, 0);
        match.pitch({ contact: true, result: 'homer', aggressive: false });
        setHint('全壘打！球飛越全壘打牆！');
        actionTitle.textContent = 'HOME RUN！全壘打';
        actionDescription.textContent = '球越過全壘打牆，煙火慶祝！';
        hitMessageTimer = 3.2;
        if (match.gameOver) document.querySelector('#pitchBtn').disabled = true;
      }
      // A home run resolves the play immediately; do not continue fielding or physics updates.
      if (ballMode === 'hit') {
      if (chasingFielder && ballAge < 2.8) {
        const hasReacted = now >= fieldingStartedAt;
        if (hasReacted) {
          if (isGroundBall) {
            fieldingTarget.set(ball.position.x, 0, ball.position.z);
          } else {
            const leadTime = THREE.MathUtils.clamp((ball.position.y - 0.3) / 12, 0.12, 0.55);
            fieldingTarget.copy(ball.position).addScaledVector(ballVelocity, leadTime);
            fieldingTarget.y = 0;
          }
          fieldingTarget.x = THREE.MathUtils.clamp(fieldingTarget.x, -58, 58);
          fieldingTarget.z = THREE.MathUtils.clamp(fieldingTarget.z, -58, 15);
        }
        const target = hasReacted ? fieldingTarget : chasingFielder.position;
        const distanceToTarget = Math.hypot(
          target.x - chasingFielder.position.x,
          target.z - chasingFielder.position.z
        );
        if (hasReacted) {
          chasingFielder.userData.fieldingState = distanceToTarget < 1.4 ? 'set' : 'running';
          const step = Math.min(distanceToTarget, chasingFielder.userData.fieldingSpeed * dt);
          if (distanceToTarget > 0.001) {
            chasingFielder.position.x += (target.x - chasingFielder.position.x) / distanceToTarget * step;
            chasingFielder.position.z += (target.z - chasingFielder.position.z) / distanceToTarget * step;
          }
        }
        const runSpeed = hasReacted && distanceToTarget > 1.4 ? 12 : 7;
        chasingFielder.rotation.y = Math.atan2(
          target.x - chasingFielder.position.x,
          target.z - chasingFielder.position.z
        );
        const chaseStride = hasReacted ? Math.sin(now * runSpeed) * 0.42 : 0;
        chasingFielder.userData.legs[0].rotation.x = chaseStride;
        chasingFielder.userData.legs[1].rotation.x = -chaseStride;
        chasingFielder.userData.arms[0].rotation.x = -chaseStride * 0.78;
        chasingFielder.userData.arms[1].rotation.x = chaseStride * 0.78;
        chasingFielder.userData.torso.rotation.z = -0.045 - Math.abs(chaseStride) * 0.12;
        if (!isGroundBall) {
          const outfieldRoles = ['leftField', 'centerField', 'rightField'];
          const backupTarget = new THREE.Vector3(
            fieldingTarget.x * 0.22 + chasingFielder.position.x * 0.78,
            0,
            fieldingTarget.z * 0.22 + chasingFielder.position.z * 0.78
          );
          fielders.forEach(player => {
            if (player === chasingFielder || !outfieldRoles.includes(player.userData.positionRole)) return;
            const home = player.userData.homePosition;
            const supportTarget = new THREE.Vector3(
              home.x * 0.72 + backupTarget.x * 0.28,
              0,
              home.z * 0.72 + backupTarget.z * 0.28
            );
            const supportDistance = Math.hypot(
              supportTarget.x - player.position.x,
              supportTarget.z - player.position.z
            );
            const supportStep = Math.min(supportDistance, 4.2 * dt);
            if (supportDistance > 0.001) {
              player.position.x += (supportTarget.x - player.position.x) / supportDistance * supportStep;
              player.position.z += (supportTarget.z - player.position.z) / supportDistance * supportStep;
              player.rotation.y = Math.atan2(
                supportTarget.x - player.position.x,
                supportTarget.z - player.position.z
              );
              const supportStride = Math.sin(now * 7) * 0.16;
              player.userData.legs[0].rotation.x = supportStride;
              player.userData.legs[1].rotation.x = -supportStride;
              player.userData.arms[0].rotation.x = -supportStride * 0.7;
              player.userData.arms[1].rotation.x = supportStride * 0.7;
            }
          });
        }
        const horizontalDistance = Math.hypot(ball.position.x - chasingFielder.position.x, ball.position.z - chasingFielder.position.z);
        if (!isGroundBall && pendingHitKind !== 'homer' && !catchResolved && hasReacted &&
            ballAge > 0.35 && ball.position.y > 1.25 && horizontalDistance < 2.2) {
          catchResolved = true;
          ball.visible = false; ballMode = 'idle';
          ballVelocity.set(0, 0, 0);
          fieldingCatchPlayer = chasingFielder;
          fieldingCatchStartedAt = now;
          fieldingCatchUntil = now + 0.9;
          catchAnimationUntil = now + 0.9;
          const catchState = match.snapshot();
          if (catchState.bases[2] && catchState.outs < 2) {
            match.sacrificeFly();
          } else {
            match.addOut('飛球接殺！打者出局');
          }
          setHint(`${fieldingCatchPlayer.userData.positionLabel} 接殺成功！打者出局`);
          actionTitle.textContent = catchState.bases[2] && catchState.outs < 2 ? '高飛犧牲打！' : '接殺出局！';
          actionDescription.textContent = catchState.bases[2] && catchState.outs < 2
            ? '三壘跑者在接殺後返本壘得分。'
            : '守備員成功接住飛球，出局數已更新。';
          chasingFielder = null;
        }
      }
      if (isGroundBall && !catchResolved && chasingFielder && now >= fieldingStartedAt &&
          ball.position.y <= 1.1 && ballAge > 0.6) {
        const distanceToBall = Math.hypot(ball.position.x - chasingFielder.position.x, ball.position.z - chasingFielder.position.z);
        if (distanceToBall < 3.2) {
          catchResolved = true;
          throwFielder = chasingFielder;
          throwStartedAt = now;
          const currentBases = match.snapshot().bases;
          const forceTargets = [
            { key: 'first', available: true },
            { key: 'second', available: currentBases[0] },
            { key: 'third', available: currentBases[1] },
            { key: 'home', available: currentBases[2] }
          ];
          if (match.half === '上' && aiOpponentEnabled) {
            const options = forceTargets.filter(target => target.available);
            selectedThrowBase = options.length ? options[Math.floor(Math.random() * options.length)].key : 'first';
          }
          document.querySelectorAll('.throw-target').forEach(btn => btn.classList.toggle('active', btn.dataset.base === selectedThrowBase));
          ball.position.set(throwFielder.position.x, 1.65, throwFielder.position.z);
          ball.visible = true;
          ballMode = 'throw';
          ballAge = 0;
          throwFielder.userData.legs.forEach(leg => { leg.rotation.x = 0; });
          throwFielder.userData.arms.forEach(arm => { arm.rotation.x = 0; });
          throwFielder.userData.torso.rotation.z = 0;
          throwFielder.userData.arms[0].rotation.z = 0.95;
          setHint(`${throwFielder.userData.positionLabel} 接到滾地球，傳向一壘！`);
          actionTitle.textContent = '守備傳球！';
          actionDescription.textContent = '守備員正將球傳往一壘。';
        }
      }
      // Gravity, air resistance and ground friction keep the ball from travelling at a constant speed.
      ballVelocity.y -= 17 * dt;
      ballVelocity.x *= Math.exp(-0.10 * dt);
      ballVelocity.z *= Math.exp(-0.075 * dt);
      if (ball.position.y < 0.28) {
        ball.position.y = 0.28;
        if (Math.abs(ballVelocity.y) > 1.8) ballVelocity.y *= -0.34;
        else ballVelocity.y = 0;
        ballVelocity.x *= Math.exp(-2.8 * dt);
        ballVelocity.z *= Math.exp(-2.8 * dt);
      }
      if (ballAge > 4.5 || Math.abs(ball.position.x) > 75 || ball.position.z < -90) {
        if (chasingFielder) {
          chasingFielder.userData.legs.forEach(leg => { leg.rotation.x = 0; });
          chasingFielder = null;
        }
        ball.visible = false; ballMode = 'idle';
        strikeZone.visible = currentView === 'batter';
        if (!catchResolved) {
          // A projected homer that never clears the fence is scored as an extra-base hit, not a homer.
          const finalHitKind = pendingHitKind === 'homer' ? 'triple' : pendingHitKind;
          const aiAggressive = match.half === '下' ? Math.random() < (finalHitKind === 'double' ? 0.42 : 0.18) : runnerAggressive;
          match.pitch({ contact: true, result: finalHitKind, aggressive: aiAggressive });
          setHint('球落地形成安打！');
          actionTitle.textContent = finalHitKind === 'double' ? '二壘安打！' : finalHitKind === 'triple' ? '三壘安打！' : '安打！';
          actionDescription.textContent = '球已落地，打者與跑者完成推進。';
        }
        chasingFielder = null;
        setHint('球已停止，按「投球」繼續比賽');
        if (match.gameOver) document.querySelector('#pitchBtn').disabled = true;
      }
      }
    } else {
      if (ball.position.z >= 22.65 && !catcherReceiving && !pendingSwing) {
        catcherReceiving = true;
        const gloveOffset = THREE.MathUtils.clamp(ball.position.x * 0.12, -0.28, 0.28);
        catcher.userData.arms[0].rotation.z = 0.36 - gloveOffset;
        catcher.userData.arms[1].rotation.z = -0.36 - gloveOffset;
        catchAnimationUntil = now + 0.3;
        ball.position.set(
          THREE.MathUtils.clamp(ball.position.x, -0.75, 0.75),
          THREE.MathUtils.clamp(ball.position.y, 0.9, 2.25),
          23.05
        );
        ball.visible = false;
        playSound('catch');
      }
      if (catcherReceiving || ball.position.z > 23 || ballAge > 1.8) finishPitch();
    }
  }
  if (fieldingCatchPlayer && now < fieldingCatchUntil) {
    const progress = THREE.MathUtils.clamp((now - fieldingCatchStartedAt) / 0.9, 0, 1);
    const gather = Math.sin(progress * Math.PI);
    fieldingCatchPlayer.userData.torso.rotation.z = -0.08 - gather * 0.2;
    fieldingCatchPlayer.userData.arms[0].rotation.z = 0.35 + gather * 0.9;
    fieldingCatchPlayer.userData.arms[1].rotation.z = -0.35 - gather * 0.9;
    fieldingCatchPlayer.userData.legs[0].rotation.x = -gather * 0.28;
    fieldingCatchPlayer.userData.legs[1].rotation.x = -gather * 0.28;
  } else if (fieldingCatchPlayer) {
    fieldingCatchPlayer.userData.torso.rotation.z = 0;
    fieldingCatchPlayer.userData.arms.forEach(arm => { arm.rotation.z = -0.32; });
    fieldingCatchPlayer.userData.legs.forEach(leg => { leg.rotation.x = 0; });
    fieldingCatchPlayer = null;
  }

  // Advance and fade the home-run fireworks independently of the baseball.
  for (let index = fireworkParticles.length - 1; index >= 0; index--) {
    const particle = fireworkParticles[index];
    particle.age += dt;
    particle.velocity.y -= 9.8 * dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.mesh.material.opacity = Math.max(0, 1 - particle.age / particle.life);
    if (particle.age >= particle.life) {
      scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
      fireworkParticles.splice(index, 1);
    }
  }

  if (catchAnimationUntil > 0 && now >= catchAnimationUntil) {
    fielders.forEach(player => {
      if (player.userData.arms) {
        player.userData.arms[0].rotation.z = -0.32;
        player.userData.arms[1].rotation.z = -0.32;
      }
    });
    catcher.userData.arms[0].rotation.z = -0.32;
    catcher.userData.arms[1].rotation.z = -0.32;
    catchAnimationUntil = 0;
  }

  // Pitcher animation: gather, leg lift, drive/release, then forward follow-through.
  const throwAge = now - pitcherThrowStartedAt;
  if (throwAge >= 0 && throwAge < 1.05) {
    const p = throwAge / 1.05;
    if (p < 0.42) {
      const lift = Math.sin((p / 0.42) * Math.PI * 0.5);
      pitcher.userData.torso.rotation.z = -0.05 - lift * 0.13;
      pitcher.userData.arms[1].rotation.z = -0.32 - lift * 0.92;
      pitcher.userData.arms[0].rotation.z = 0.32 + lift * 0.22;
      pitcher.userData.legs[0].rotation.x = lift * 0.78;
    } else if (p < 0.68) {
      const drive = (p - 0.42) / 0.26;
      pitcher.userData.torso.rotation.z = -0.18 + drive * 0.32;
      pitcher.userData.arms[1].rotation.z = -1.24 + drive * 1.75;
      pitcher.userData.arms[0].rotation.z = 0.54 - drive * 0.72;
      pitcher.userData.legs[0].rotation.x = 0.78 - drive * 0.9;
    } else {
      const follow = (p - 0.68) / 0.32;
      pitcher.userData.torso.rotation.z = 0.14 * (1 - follow);
      pitcher.userData.arms[1].rotation.z = 0.51 - follow * 0.78;
      pitcher.userData.arms[0].rotation.z = -0.18 + follow * 0.5;
      pitcher.userData.legs[0].rotation.x = -0.12 * (1 - follow);
    }
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
  if (ball.visible && ballMode !== 'idle') {
    ballTrailHistory.unshift(ball.position.clone());
    if (ballTrailHistory.length > 18) ballTrailHistory.length = 18;
    ballTrail.forEach((mesh, index) => {
      const point = ballTrailHistory[Math.min(ballTrailHistory.length - 1, (index + 1) * 2)];
      mesh.visible = Boolean(point);
      if (point) mesh.position.copy(point);
    });
  } else {
    ballTrailHistory.length = 0;
    ballTrail.forEach(mesh => { mesh.visible = false; });
  }

  renderer.render(scene, camera);
}
animate();
setTimeout(() => loading.classList.add('hidden'), 650);
