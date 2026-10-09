import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* ============================================================
   Props for acts 6–8: the shipping case, the pharmacy shelf,
   and the hand that finally opens the bottle.

   Everything here is procedural — no model files, no textures
   fetched. Each builder returns its group plus the handles the
   timeline needs to animate.
   ============================================================ */

// ---------------------------------------------------------------- act 6: shipping case

function makeCartonLabelTexture() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 400;
  const x = c.getContext("2d");

  x.fillStyle = "#d8c9a8";
  x.fillRect(0, 0, c.width, c.height);

  x.strokeStyle = "#4a3f2c";
  x.lineWidth = 3;
  x.strokeRect(28, 28, c.width - 56, c.height - 56);

  x.fillStyle = "#2b2418";
  x.font = "600 54px Inter, system-ui, sans-serif";
  x.fillText("MediStock", 54, 108);
  x.fillStyle = "#6b5c3e";
  x.font = "500 26px Inter, system-ui, sans-serif";
  x.fillText("(IMS)", 300, 108);

  x.fillStyle = "#4a3f2c";
  x.fillRect(54, 130, c.width - 108, 2);

  x.fillStyle = "#2b2418";
  x.font = "600 34px Inter, system-ui, sans-serif";
  x.fillText("CASE OF 12", 54, 186);

  x.fillStyle = "#5c4f38";
  x.font = "400 22px ui-monospace, Consolas, monospace";
  x.fillText("KEEP COOL  2–8 °C", 54, 228);
  x.fillText("LOT 0001 · CMPG 224 (SE)", 54, 262);
  x.fillText("THIS WAY UP  ↑↑", 54, 296);

  for (let i = 0, px = 54; i < 30 && px < c.width - 70; i++) {
    const w = 3 + Math.round(Math.random() * 6);
    x.fillStyle = "#2b2418";
    x.fillRect(px, 318, w, 46);
    px += w + 3 + Math.round(Math.random() * 5);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function makeCarton() {
  const group = new THREE.Group();
  const W = 3.1; // inner width
  const H = 4.6; // wall height
  const T = 0.07; // wall thickness
  const half = W / 2;
  const top = H / 2;

  const kraft = new THREE.MeshStandardMaterial({
    color: 0x8a7657,
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const wallGeo = new THREE.BoxGeometry(W, H, T);
  const front = new THREE.Mesh(wallGeo, kraft);
  front.position.z = half;
  const back = new THREE.Mesh(wallGeo, kraft);
  back.position.z = -half;
  const sideGeo = new THREE.BoxGeometry(T, H, W);
  const left = new THREE.Mesh(sideGeo, kraft);
  left.position.x = -half;
  const right = new THREE.Mesh(sideGeo, kraft);
  right.position.x = half;
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, T, W), kraft);
  base.position.y = -top;
  group.add(front, back, left, right, base);

  // shipping label, sitting just proud of the front wall
  const labelMat = new THREE.MeshStandardMaterial({
    map: makeCartonLabelTexture(),
    roughness: 0.9,
    metalness: 0,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.32), labelMat);
  label.position.set(0, 0.2, half + T);
  group.add(label);

  // Four flaps, each hinged on its top edge. The mesh hangs inward from the
  // hinge, so rotating the hinge group from ±π/2 (upright) to 0 folds it shut.
  const flapDepth = W / 2;
  const flapGeoZ = new THREE.BoxGeometry(W, T, flapDepth);
  const flapGeoX = new THREE.BoxGeometry(flapDepth, T, W);
  const mkFlap = (hinge, offset, geo, lift) => {
    const g = new THREE.Group();
    g.position.copy(hinge);
    const m = new THREE.Mesh(geo, kraft);
    m.position.copy(offset);
    m.position.y = lift;
    g.add(m);
    group.add(g);
    return g;
  };

  // side pair folds first, long pair folds over the top of it
  const flapL = mkFlap(new THREE.Vector3(-half, top, 0), new THREE.Vector3(flapDepth / 2, 0, 0), flapGeoX, 0);
  const flapR = mkFlap(new THREE.Vector3(half, top, 0), new THREE.Vector3(-flapDepth / 2, 0, 0), flapGeoX, 0);
  const flapF = mkFlap(new THREE.Vector3(0, top, half), new THREE.Vector3(0, 0, -flapDepth / 2), flapGeoZ, T * 1.6);
  const flapB = mkFlap(new THREE.Vector3(0, top, -half), new THREE.Vector3(0, 0, flapDepth / 2), flapGeoZ, T * 1.6);

  flapL.rotation.z = Math.PI / 2;
  flapR.rotation.z = -Math.PI / 2;
  flapF.rotation.x = Math.PI / 2;
  flapB.rotation.x = -Math.PI / 2;

  return { group, kraft, labelMat, flaps: { flapL, flapR, flapF, flapB }, top };
}

// ---------------------------------------------------------------- act 6: motion streaks

export function makeStreaks(count = 46) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x9fc2ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const geo = new THREE.BoxGeometry(0.018, 0.018, 4.5);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const slot = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3.4 + Math.random() * 7;
    slot.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 9, Math.sin(a) * r);
    slot.scale.z = 0.6 + Math.random() * 1.8;
    slot.updateMatrix();
    mesh.setMatrixAt(i, slot.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return { mesh, mat };
}

// ---------------------------------------------------------------- act 7: pharmacy shelf

// A cheap stand-in bottle for the neighbours on the shelf: body, shoulder and
// neck merged into one geometry so the whole row is a single instanced draw.
function makeShelfBottleGeo() {
  const bodyR = 1.25;
  const neckR = 0.72;
  const body = new THREE.CylinderGeometry(bodyR, bodyR, 3, 40, 1, true);
  body.translate(0, -0.6, 0);
  const shoulder = new THREE.CylinderGeometry(neckR, bodyR, 0.4, 40, 1, true);
  shoulder.translate(0, 1.1, 0);
  const neck = new THREE.CylinderGeometry(neckR, neckR, 0.5, 32, 1, true);
  neck.translate(0, 1.55, 0);
  const base = new THREE.CircleGeometry(bodyR, 40);
  base.rotateX(Math.PI / 2);
  base.translate(0, -2.1, 0);
  return mergeGeometries([body, shoulder, neck, base]);
}

export function makeShelf(jarMat, capMat, labelTex, slots) {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x232a3a, roughness: 0.8, metalness: 0.05 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x131828, roughness: 0.95, metalness: 0 });

  const SHELF_Y = -2.25;
  const back = new THREE.Mesh(new THREE.BoxGeometry(19, 8.4, 0.2), backMat);
  back.position.set(0, 0.9, -1.75);
  const board = new THREE.Mesh(new THREE.BoxGeometry(19, 0.2, 2.8), woodMat);
  board.position.set(0, SHELF_Y, -0.3);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(19, 0.2, 2.8), woodMat);
  upper.position.set(0, 3.1, -0.3);
  group.add(back, board, upper);

  // neighbours — the gap at x = 0 is where the hero bottle lands
  const bottleGeo = makeShelfBottleGeo();
  const capGeo = new THREE.CylinderGeometry(0.84, 0.84, 0.62, 40);
  const bandGeo = new THREE.CylinderGeometry(1.2625, 1.2625, 1.35, 40, 1, true);
  const bandMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.85, metalness: 0 });

  const n = slots.length;
  const bottles = new THREE.InstancedMesh(bottleGeo, jarMat, n);
  const caps = new THREE.InstancedMesh(capGeo, capMat, n);
  const bands = new THREE.InstancedMesh(bandGeo, bandMat, n);
  bottles.renderOrder = 3; // glass draws after its contents, same as the hero bottle

  const slot = new THREE.Object3D();
  const yOnBoard = SHELF_Y + 0.1 + 2.1; // board top + bottle's own base offset
  slots.forEach((x, i) => {
    slot.position.set(x, yOnBoard, -0.3);
    slot.rotation.set(0, Math.random() * Math.PI * 2, 0);
    slot.updateMatrix();
    bottles.setMatrixAt(i, slot.matrix);
    bands.setMatrixAt(i, slot.matrix);

    slot.position.y = yOnBoard + 1.62;
    slot.updateMatrix();
    caps.setMatrixAt(i, slot.matrix);
  });
  [bottles, caps, bands].forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    group.add(m);
  });

  return { group, woodMat, backMat, bandMat, yOnBoard, SHELF_Y };
}

// ---------------------------------------------------------------- act 8: the hand

/* The hand is built from overlapping capsules and squashed spheres. Bones run
   along +Z and the palm faces -Y, so a positive rotation about X folds a finger
   into the palm.

   Anatomy that actually sells it, in rough order of payoff:
     - the knuckle line is an arc, not a row, and the pinky sits lower
     - nothing is ever straight; every joint carries a resting curl
     - fingers taper along their length and are wider than they are deep
     - the palm is three overlapping masses (palm, thumb pad, pinky pad)
     - fingernails, which cost almost nothing and read immediately
     - sheen on the skin fakes the soft rim you get from subsurface scattering
*/

function boneGeo(radius, len) {
  const g = new THREE.CapsuleGeometry(radius, len, 8, 24);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, len / 2);
  return g;
}

const FINGERS = [
  // base sits on the knuckle arc; rest is the curl each joint carries when relaxed
  { name: "index", pos: [-0.62, 0.03, 1.16], len: [0.82, 0.52, 0.38], rad: [0.145, 0.125, 0.105], splay: -0.1, curl: 0.95, rest: [0.1, 0.17, 0.12] },
  { name: "middle", pos: [-0.21, 0.05, 1.26], len: [0.92, 0.58, 0.4], rad: [0.15, 0.13, 0.11], splay: -0.025, curl: 1.0, rest: [0.12, 0.2, 0.14] },
  { name: "ring", pos: [0.2, 0.03, 1.21], len: [0.85, 0.55, 0.38], rad: [0.142, 0.123, 0.104], splay: 0.045, curl: 1.02, rest: [0.14, 0.23, 0.16] },
  { name: "pinky", pos: [0.58, -0.02, 1.04], len: [0.68, 0.44, 0.33], rad: [0.125, 0.108, 0.092], splay: 0.13, curl: 1.1, rest: [0.17, 0.27, 0.19] },
];

const CURL_RANGE = [0.95, 1.2, 0.72];

// Strict realism would put this at 2.2 (the cap is 1.68 units across, a real
// 3.4 cm pill-bottle cap, so 1 unit is ~2 cm and an adult hand is ~9.5 units).
// That is correct but crowds the frame once two hands are in shot, so it sits
// a little under life size — close enough to read as a real hand.
export const HAND_SCALE = 1.45;
const THUMB_REST = [0.1, 0.14, 0.1];

export function makeHand(mirror = false) {
  const mir = mirror ? -1 : 1; // never call this `m`: the loops below declare a local mesh `m`
  const group = new THREE.Group();

  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xc08a6d,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.38,
    sheenColor: new THREE.Color(0xe08f74),
    sheenRoughness: 0.7,
    clearcoat: 0.12,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.6,
  });
  const nailMat = new THREE.MeshPhysicalMaterial({
    color: 0xe3b4a0,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.8,
  });

  const blob = (sx, sy, sz, x, y, z, mat = skin) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 22), mat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x * mir, y, z);
    group.add(mesh);
    return mesh;
  };

  // palm as three overlapping masses rather than one ball
  blob(0.94, 0.3, 1.14, 0, 0, 0.12); // palm proper
  blob(0.4, 0.28, 0.56, -0.55, -0.03, -0.04); // thenar — the thumb muscle
  blob(0.28, 0.24, 0.52, 0.65, -0.02, 0.05); // hypothenar — the pinky pad
  blob(0.85, 0.23, 0.34, -0.02, 0.04, 0.9); // knuckle ridge

  // a knuckle at the base of each finger, so the back of the hand has landmarks
  FINGERS.forEach((f) => blob(0.155, 0.105, 0.17, f.pos[0], f.pos[1] + 0.11, f.pos[2] - 0.09));

  const fingers = [];
  FINGERS.forEach((f) => {
    const joints = [];
    let parent = group;
    f.len.forEach((len, i) => {
      const j = new THREE.Group();
      if (i === 0) {
        j.position.set(f.pos[0] * mir, f.pos[1], f.pos[2]);
        j.rotation.z = f.splay * mir;
      } else {
        j.position.set(0, 0, f.len[i - 1]);
      }
      const m = new THREE.Mesh(boneGeo(f.rad[i], len), skin);
      m.scale.set(1.06, 0.9, 1); // fingers are wider than they are deep
      j.add(m);

      if (i === 2) {
        // fingernail, on the back of the distal segment
        const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), nailMat);
        nail.scale.set(f.rad[i] * 0.62, f.rad[i] * 0.3, len * 0.42);
        nail.position.set(0, f.rad[i] * 0.72, len * 0.52);
        j.add(nail);
      }

      parent.add(j);
      parent = j;
      joints.push(j);
    });
    fingers.push({
      joints,
      curl: f.curl,
      rest: f.rest,
      rad: f.rad,
      len: f.len,
      grip: f.rest.map((r, i) => r + f.curl * CURL_RANGE[i]),
    });
  });

  // Thumb: metacarpal, proximal, distal. The base rotation swings it out of the
  // palm plane so the pad ends up facing the fingers.
  const tLen = [0.6, 0.5, 0.36];
  const tRad = [0.185, 0.16, 0.135];
  const tJoints = [];
  let tParent = group;
  tLen.forEach((len, i) => {
    const j = new THREE.Group();
    if (i === 0) {
      j.position.set(-0.86 * mir, -0.04, 0.08);
      j.rotation.set(0.22, 0.78 * mir, 0.52 * mir);
    } else {
      j.position.set(0, 0, tLen[i - 1]);
    }
    const m = new THREE.Mesh(boneGeo(tRad[i], len), skin);
    m.scale.set(1.08, 0.92, 1);
    j.add(m);
    if (i === 2) {
      const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), nailMat);
      nail.scale.set(tRad[i] * 0.66, tRad[i] * 0.3, len * 0.44);
      nail.position.set(0, tRad[i] * 0.74, len * 0.5);
      j.add(nail);
    }
    tParent.add(j);
    tParent = j;
    tJoints.push(j);
  });
  const thumb = {
    joints: tJoints,
    baseY: 0.78 * mir,
    mirror: mir,
    rest: THUMB_REST,
    rad: tRad,
    len: tLen,
    grip: [THUMB_REST[0] + 0.3, THUMB_REST[1] + 0.5, THUMB_REST[2] + 0.6],
  };

  // wrist and a length of forearm, so the hand does not end in mid-air
  // The wrist has to pinch in, or the forearm reads as a club. Two overlapping
  // masses bridge palm to forearm so there is no seam at the join.
  blob(0.6, 0.29, 0.42, -0.02, -0.01, -0.66);
  blob(0.5, 0.28, 0.45, -0.02, -0.01, -0.9);

  // capped, and sized so its near end matches the wrist rather than stepping out of it
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.46, 1.6, 28, 1, false), skin);
  forearm.rotation.x = Math.PI / 2;
  forearm.position.set(-0.02, -0.01, -1.72);
  forearm.scale.set(1.15, 1, 0.85);
  group.add(forearm);

  group.scale.setScalar(HAND_SCALE);

  return { group, skin, nailMat, fingers, thumb };
}

// Drive the whole hand from one 0..1 value: 0 is the relaxed pose, 1 is the
// grip pose. Called every frame so it stays in sync with a scrubbed timeline.
export function applyHandPose(hand, t) {
  hand.fingers.forEach((f) => {
    f.joints.forEach((j, i) => {
      j.rotation.x = f.rest[i] + t * (f.grip[i] - f.rest[i]);
    });
  });
  const th = hand.thumb;
  th.joints.forEach((j, i) => {
    j.rotation.x = th.rest[i] + t * (th.grip[i] - th.rest[i]);
  });
  th.joints[0].rotation.y = th.baseY - t * 0.46 * th.mirror;
}

/* Close each finger until it touches the thing being gripped, then stop.

   Joints are solved from the knuckle outward, but each one is tested against
   every bone from itself to the fingertip — otherwise a tip already pushed
   inside by its parents can never be pulled back out, since bending its own
   joint cannot undo where the parent put it. The search also starts below the
   resting angle, so a finger that begins intersecting can straighten out of it.

   Baked once at setup rather than solved per frame.

   `toTarget` maps a world point into the target's local space, and
   `radiusAt(y)` gives the target's radius at that height (0 = no surface). */
export function solveGrip(hand, { maxCurl, toTarget, radiusAt, clearance = 0.02 }) {
  // Solve in the pose the hand will actually be in at full grip. The thumb's
  // base also swings sideways at t=1; solving against the un-swung thumb gives
  // angles that stop being collision-free the moment the pose is applied.
  applyHandPose(hand, 1);

  const p = new THREE.Vector3();
  const scale = hand.group.scale.x;

  // deepest intersection across bones `from`..tip, in target-local units
  const worstFrom = (part, from) => {
    let worst = -Infinity;
    for (let i = from; i < part.joints.length; i++) {
      const j = part.joints[i];
      for (let k = 0; k <= 5; k++) {
        p.set(0, 0, (part.len[i] * k) / 5).applyMatrix4(j.matrixWorld);
        toTarget(p);
        const r = radiusAt(p.y);
        if (r <= 0) continue;
        const d = r + part.rad[i] * scale + clearance - Math.hypot(p.x, p.z);
        if (d > worst) worst = d;
      }
    }
    return worst;
  };

  const close = (part, ranges) => {
    part.joints.forEach((j, i) => {
      const lo = part.rest[i] - 0.9; // room to straighten out of a collision
      const hi = part.rest[i] + maxCurl * ranges[i];
      const steps = 30;
      let best = lo;
      let bestDepth = Infinity;
      for (let step = 0; step <= steps; step++) {
        j.rotation.x = lo + ((hi - lo) * step) / steps;
        hand.group.updateMatrixWorld(true);
        const depth = worstFrom(part, i);
        if (depth < bestDepth) {
          bestDepth = depth;
          if (depth > 0) best = j.rotation.x; // nothing clear yet — keep the least bad
        }
        if (depth <= 0) best = j.rotation.x; // clear: take the most closed one so far
        else if (bestDepth <= 0) break; // we already had clearance and have now lost it
      }
      j.rotation.x = best;
      part.grip[i] = best;
    });
  };

  hand.fingers.forEach((f) => close(f, CURL_RANGE.map((r) => r * f.curl)));
  close(hand.thumb, [0.3, 0.5, 0.6]);
  hand.group.updateMatrixWorld(true);
}
