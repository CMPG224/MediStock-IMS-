"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeCarton, makeStreaks, makeShelf, makeHand, applyHandPose, solveGrip } from "./props";

gsap.registerPlugin(ScrollTrigger);

// each palette drives the shell, the seam, the granules, the backdrop and the HUD accent
const PALETTES = [
  { name: "Cobalt", a: 0x2a5ccc, b: 0xdde6f4, ring: 0x07102c, grain: 0x8ec6ff, glow: 0x2c74d6, bg: 0x0a1734, jar: 0x7fa8e8, cap: 0xe8edf6, hud: "#6aa4ff" },
];

const DEFAULT_PALETTE = 0; // Cobalt
const DEFAULT_GLOSS = 0.26;

export const GRANULE_COUNT = 34;
export const PILL_COUNT = 38; // loose pills filling the container

const COPY = [
  {
    tag: "Intake",
    a: "One unit.",
    b: "Every one accounted for.",
    body: "Stock enters sealed, serialised and batch-stamped. From the moment it is scanned in, MediStock knows what it is, where it came from and when it expires.",
  },
  {
    tag: "Breakdown",
    a: "One pack.",
    b: "Everything inside it.",
    body: "Cases break to packs, packs break to units. Composition, batch and expiry are carried down every level of the hierarchy - nothing is inferred.",
  },
  {
    tag: "Visibility",
    a: "One catalogue.",
    b: "Every line in orbit.",
    body: "On hand, in transit, quarantined, expiring. Thousands of lines across every site resolve into a single live position you can act on.",
  },
  {
    tag: "Reconciliation",
    a: "It closes.",
    b: "Nothing unaccounted for.",
    body: "Counts reconcile against movements. Every adjustment is reversible and written to an audit trail with a user, a reason and a timestamp.",
  },
  {
    tag: "Dispatch",
    a: "One unit.",
    b: "Now one of thirty-nine.",
    body: "Picked, packed, labelled and released. The unit leaves as traceable inventory, and the count on the shelf updates before the door closes.",
  },
  {
    tag: "Transit",
    a: "It leaves.",
    b: "It stays visible.",
    body: "Cased, sealed and manifested. In transit is a state MediStock holds a position for - not a gap between the last scan and the next one.",
  },
];

// The bottle's radius at a given height, used to stop the fingers on contact.
// Mirrors the geometry built below: body and label, the tapered shoulder, the
// neck, then the cap.
function bottleRadiusAt(y) {
  if (y > 1.93 || y < -2.15) return 0;
  if (y > 1.31) return 0.84; // cap
  if (y > 1.3) return 0.72;
  if (y > 0.9) return 0.72 + ((1.3 - y) / 0.4) * (1.25 - 0.72); // shoulder taper
  return 1.28; // body, plus the label band
}

// Where the bottle is held once it is off the shelf. The opening hand's pivot
// sits on this point so its unscrew orbit shares the bottle's axis.
const HELD = { x: 0, y: 0.25, z: 2.2 };

// Every keyframe either hand hits, in one place - these are the values worth
// nudging first once you can see them on screen.
const HAND = {
  // HOLD - left hand, a child of the bottle so it tracks every move and the tip.
  // Rolled a quarter turn so the palm faces the bottle and the curl axis is
  // vertical, letting the fingers wrap the body. Sat behind and left of the
  // bottle: the body then hides the palm and the forearm runs away from the
  // camera, leaving just the fingers curling into view around the near edge.
  hold: { x: -1.95, y: -0.5, z: -2.4, rx: 0.12, ry: 0, rz: Math.PI / 2 },
  holdPark: { x: -1.95, y: -40, z: -2.4 },
  holdCurl: 1.15, // ceiling for the solver; contact decides where it stops

  // OPEN - right hand, gripping the cap from above and behind. The hand is
  // longer than the cap is wide, so the palm sits behind it and the fingers
  // reach forward before curling down onto the knurl.
  openPark: { x: 9.5, y: 4.2, z: -2.1, rx: 0.1, ry: -0.22, rz: 0.12 },
  onCap: { x: 0.05, y: 2.95, z: -2.05, rx: 0.1, ry: -0.22, rz: 0.12 },
  openCurl: 1.3, // ceiling for the solver; contact decides where it stops
  lift: 1.6, // how far hand and lid rise together once unscrewed
  catch: { x: 1.5, y: -2.5, z: -0.4, rx: 0.32, ry: 0, rz: Math.PI }, // rolled palm-up
};

// soft round sprite, used for dust motes and the core halo
function makeDotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// MediStock label, drawn at runtime. One panel, repeated twice around the wrap,
// so the wordmark is readable from either side as the bottle turns.
function makeLabelTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 348;
  const x = c.getContext("2d");

  x.fillStyle = "#f2f4f8";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#0b0e16";
  x.fillRect(0, 0, c.width, 10);

  x.fillStyle = "#6b7486";
  x.font = "500 21px Inter, system-ui, sans-serif";
  x.letterSpacing = "3px";
  x.fillText("PHARMACEUTICAL GRADE", 54, 66);
  x.letterSpacing = "0px";

  // wordmark + the (IMS) suffix, measured so they always sit flush
  x.fillStyle = "#0b0e16";
  x.font = "600 92px Inter, system-ui, sans-serif";
  x.fillText("MediStock", 50, 168);
  const wm = x.measureText("MediStock").width;
  x.fillStyle = "#2c74d6";
  x.font = "500 40px Inter, system-ui, sans-serif";
  x.fillText("(IMS)", 62 + wm, 168);

  x.fillStyle = "#c9ced8";
  x.fillRect(54, 196, c.width - 108, 2);

  x.fillStyle = "#5b6478";
  x.font = "400 27px Inter, system-ui, sans-serif";
  x.fillText(`Capsules  ·  ${PILL_COUNT + 1} ct  ·  Batch A-2241`, 54, 240);

  x.fillStyle = "#8b93a3";
  x.font = "400 20px ui-monospace, Consolas, monospace";
  x.fillText("LOT 0001 · CMPG 224 (SE)", 54, 296);

  for (let i = 0, px = 700; i < 34 && px < c.width - 60; i++) {
    const w = 2 + Math.round(Math.random() * 5);
    x.fillStyle = "#0b0e16";
    x.fillRect(px, 232, w, 74);
    px += w + 2 + Math.round(Math.random() * 4);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = 2;
  t.anisotropy = 8;
  return t;
}

// one half of a pill (hemisphere cap + open cylinder) merged into a single geometry,
// so a loose two-tone pill costs two draw calls instead of four
function makeHalfPill(r, halfLen, up) {
  const cap = new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2);
  cap.translate(0, up ? halfLen : -halfLen, 0);
  const cyl = new THREE.CylinderGeometry(r, r, halfLen, 28, 1, true);
  cyl.translate(0, up ? halfLen / 2 : -halfLen / 2, 0);
  return mergeGeometries([cap, cyl]);
}

export default function PillCapsuleScroll() {
  const mountRef = useRef(null);
  const containerRef = useRef(null); // tall scroll container
  const pinRef = useRef(null); // pinned viewport
  const panelsRef = useRef([]);
  const progressRef = useRef(null);
  const stateRef = useRef({});
  // Fixed finish: Cobalt at 26% gloss.
  const paletteIdx = DEFAULT_PALETTE;
  const gloss = DEFAULT_GLOSS;

  // ---- three.js scene setup (runs once) ----
  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const P = PALETTES[0];

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05070d, 10, 24);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);
    const camBase = { x: 0, y: 0.35, z: 8.4, tx: 0, ty: 0, tz: 0 };
    const lookAt = new THREE.Vector3(0, 0, 0);
    camera.position.set(camBase.x, camBase.y, camBase.z);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    mount.appendChild(renderer.domElement);

    // image-based lighting - this is what makes the clearcoat read as real plastic
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.3;
    pmrem.dispose();

    // ----- backdrop: vertical gradient plus a soft glow behind the subject -----
    const backdropMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        cTop: { value: new THREE.Color(P.bg) },
        cBot: { value: new THREE.Color(0x04050a) },
        cGlow: { value: new THREE.Color(P.glow) },
      },
      vertexShader: [
        "varying vec3 vDir;",
        "void main() {",
        "  vDir = normalize(position);",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 cTop; uniform vec3 cBot; uniform vec3 cGlow;",
        "varying vec3 vDir;",
        "void main() {",
        "  float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);",
        "  vec3 col = mix(cBot, cTop, smoothstep(0.12, 0.92, h));",
        "  float d = clamp(length(vDir.xy), 0.0, 1.0);",
        "  col += cGlow * 0.14 * pow(1.0 - d, 4.0);",
        "  gl_FragColor = vec4(col, 1.0);",
        "}",
      ].join("\n"),
    });
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 24), backdropMat);
    scene.add(backdrop);

    // ----- drifting dust, for depth -----
    const dustCount = 700;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 5 + Math.random() * 13;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      dustPos[i * 3 + 1] = r * Math.cos(ph) * 0.55;
      dustPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.075,
      map: makeDotTexture(),
      color: new THREE.Color(P.grain),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ----- contact shadow on the floor -----
    const groundCanvas = document.createElement("canvas");
    groundCanvas.width = groundCanvas.height = 256;
    const gctx = groundCanvas.getContext("2d");
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0.62)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.18)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 256, 256);
    const groundMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(groundCanvas),
      transparent: true,
      depthWrite: false,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.75;
    scene.add(ground);

    // ----- lighting (the env map does the heavy lifting; these shape it) -----
    const key = new THREE.DirectionalLight(0xe8f0ff, 1.15);
    key.position.set(4, 5, 4);
    const fill = new THREE.DirectionalLight(0x6f93d8, 0.35);
    fill.position.set(-5, 2, -3);
    const rim = new THREE.DirectionalLight(0xc9dcff, 1.3);
    rim.position.set(-2.5, -2, -5);
    scene.add(key, fill, rim, new THREE.AmbientLight(0x2a3146, 0.4));

    // ----- capsule -----
    const radius = 0.62;
    const bodyHalfLen = 1.05;
    const radialSeg = 64;
    const capSeg = 32;

    const outerGroup = new THREE.Group(); // scroll-driven rotation and tilt
    const capsuleGroup = new THREE.Group(); // drag-driven tilt
    outerGroup.add(capsuleGroup);
    capsuleGroup.rotation.z = Math.PI / 2.6;
    capsuleGroup.rotation.x = 0.15;

    const shellDefaults = {
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 0.6,
      sheenRoughness: 0.5,
      iridescence: 0.25,
      iridescenceIOR: 1.3,
      envMapIntensity: 0.8,
      transparent: true,
    };
    const matA = new THREE.MeshPhysicalMaterial({ color: P.a, ...shellDefaults });
    const matB = new THREE.MeshPhysicalMaterial({ color: P.b, ...shellDefaults });
    const seamMat = new THREE.MeshStandardMaterial({
      color: P.ring,
      emissive: new THREE.Color(P.glow),
      emissiveIntensity: 0,
      roughness: 0.35,
      metalness: 0.2,
      transparent: true,
      opacity: 1,
    });

    // top half (cap + open cylinder)
    const topPart = new THREE.Group();
    const topCap = new THREE.Mesh(
      new THREE.SphereGeometry(radius, radialSeg, capSeg, 0, Math.PI * 2, 0, Math.PI / 2),
      matA
    );
    topCap.position.y = bodyHalfLen;
    const topCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, bodyHalfLen, radialSeg, 1, true),
      matA
    );
    topCyl.position.y = bodyHalfLen / 2;
    topPart.add(topCap, topCyl);

    // bottom half
    const botPart = new THREE.Group();
    const botCap = new THREE.Mesh(
      new THREE.SphereGeometry(radius, radialSeg, capSeg, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      matB
    );
    botCap.position.y = -bodyHalfLen;
    const botCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, bodyHalfLen, radialSeg, 1, true),
      matB
    );
    botCyl.position.y = -bodyHalfLen / 2;
    botPart.add(botCap, botCyl);

    const seam = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 10, radialSeg), seamMat);
    seam.rotation.x = Math.PI / 2;

    // the shell as one rigid body - act 5 shrinks and drops this whole group into the container
    const shellGroup = new THREE.Group();
    shellGroup.add(topPart, botPart, seam);
    shellGroup.traverse((o) => {
      if (o.isMesh) o.renderOrder = 1; // stay behind the container glass
    });

    // shockwave that leaves the joint the instant the shell parts
    const waveMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(P.glow),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wave = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.7, 96), waveMat);
    wave.rotation.x = -Math.PI / 2;

    // ----- granules: perfect spheres, one shared geometry, emissive so bloom catches them -----
    const granuleGroup = new THREE.Group();
    granuleGroup.scale.setScalar(0.001);
    const granules = [];
    const granuleMat = new THREE.MeshStandardMaterial({
      color: P.grain,
      emissive: new THREE.Color(P.glow),
      emissiveIntensity: 0.28,
      roughness: 0.3,
      metalness: 0.05,
    });
    const granuleGeo = new THREE.SphereGeometry(1, 24, 16);
    for (let i = 0; i < GRANULE_COUNT; i++) {
      const g = new THREE.Mesh(granuleGeo, granuleMat);
      const size = 0.05 + Math.random() * 0.04;
      g.scale.setScalar(size);
      const a = Math.random() * Math.PI * 2;
      const r = 0.15 + Math.random() * 0.25;
      g.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 1.6, Math.sin(a) * r);

      // act 2 - burst outward
      const scatter = {
        x: g.position.x * (3.4 + Math.random() * 2),
        y: g.position.y * (2.2 + Math.random() * 1.6) + (Math.random() - 0.5) * 1.6,
        z: g.position.z * (3.4 + Math.random() * 2),
      };
      // act 3 - settle onto a ring around the core
      const ang = (i / GRANULE_COUNT) * Math.PI * 2 + Math.random() * 0.12;
      const rr = 2.15 + (Math.random() - 0.5) * 0.3;
      const halo = { x: Math.cos(ang) * rr, y: (Math.random() - 0.5) * 0.34, z: Math.sin(ang) * rr };

      g.userData = { size, home: g.position.clone(), scatter, halo };
      granuleGroup.add(g);
      granules.push(g);
    }

    // ----- the core the granules end up orbiting -----
    const coreGroup = new THREE.Group();
    coreGroup.scale.setScalar(0.001);
    const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.glow) });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 3), coreMat);
    const haloMat = new THREE.SpriteMaterial({
      map: makeDotTexture(),
      color: new THREE.Color(P.glow),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreHalo = new THREE.Sprite(haloMat);
    coreHalo.scale.setScalar(3.2);
    coreGroup.add(core, coreHalo);


    // ================= act 5: the container =================
    // Parked well below frame; act 5 raises it, drops the capsule through the
    // neck, and screws the lid down onto the thread.
    const bottleGroup = new THREE.Group();
    bottleGroup.position.y = -9;

    const bodyR = 1.25;
    const neckR = 0.72;

    // tinted wall - plain transparency rather than transmission, so there is no
    // extra render target per frame and the pills inside stay legible
    const jarMat = new THREE.MeshPhysicalMaterial({
      color: P.jar,
      transparent: true,
      opacity: 0.26,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const capMat = new THREE.MeshPhysicalMaterial({
      color: P.cap,
      roughness: 0.34,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.7,
    });

    const jarBody = new THREE.Mesh(new THREE.CylinderGeometry(bodyR, bodyR, 3, 64, 1, true), jarMat);
    jarBody.position.y = -0.6; // spans -2.1 .. 0.9
    const jarBase = new THREE.Mesh(new THREE.CircleGeometry(bodyR, 64), jarMat);
    jarBase.rotation.x = Math.PI / 2;
    jarBase.position.y = -2.1;
    const jarShoulder = new THREE.Mesh(new THREE.CylinderGeometry(neckR, bodyR, 0.4, 64, 1, true), jarMat);
    jarShoulder.position.y = 1.1;
    const jarNeck = new THREE.Mesh(new THREE.CylinderGeometry(neckR, neckR, 0.5, 48, 1, true), jarMat);
    jarNeck.position.y = 1.55;
    bottleGroup.add(jarBody, jarBase, jarShoulder, jarNeck);

    // screw thread on the neck - this is what makes the lid's rotation read as real
    const threadGeo = new THREE.TorusGeometry(neckR, 0.03, 8, 48);
    for (let i = 0; i < 3; i++) {
      const th = new THREE.Mesh(threadGeo, jarMat);
      th.rotation.x = Math.PI / 2;
      th.position.y = 1.38 + i * 0.14;
      bottleGroup.add(th);
    }

    const labelMat = new THREE.MeshStandardMaterial({
      map: makeLabelTexture(),
      roughness: 0.85,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(new THREE.CylinderGeometry(bodyR * 1.01, bodyR * 1.01, 1.35, 64, 1, true), labelMat);
    label.position.y = -0.75;
    bottleGroup.add(label);

    // glass draws last so the contents read through it
    [jarBody, jarBase, jarShoulder, jarNeck].forEach((m) => (m.renderOrder = 3));

    // ----- loose pills already in the container -----
    const pillR = 0.21;
    const pillHalf = 0.34;
    const pillTopGeo = makeHalfPill(pillR, pillHalf, true);
    const pillBotGeo = makeHalfPill(pillR, pillHalf, false);
    const pillMatA = new THREE.MeshPhysicalMaterial({
      color: P.a,
      roughness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      envMapIntensity: 0.7,
    });
    const pillMatB = new THREE.MeshPhysicalMaterial({
      color: P.b,
      roughness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      envMapIntensity: 0.7,
    });
    // Two instanced meshes (top halves, bottom halves) share one transform per pill,
    // so a bottle full of two-tone capsules costs two draw calls instead of seventy-six.
    const pillTops = new THREE.InstancedMesh(pillTopGeo, pillMatA, PILL_COUNT);
    const pillBots = new THREE.InstancedMesh(pillBotGeo, pillMatB, PILL_COUNT);
    const slot = new THREE.Object3D();
    const placed = [];
    for (let i = 0; i < PILL_COUNT; i++) {
      // Mitchell best-candidate sampling: of 24 tries, keep whichever sits
      // furthest from every pill already placed. Spreads the pile evenly
      // instead of degrading into overlaps once the bottle gets full.
      let px = 0;
      let py = 0;
      let pz = 0;
      let best = -1;
      for (let tries = 0; tries < 24; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.66; // uniform over the disc
        const cx = Math.cos(a) * r;
        const cz = Math.sin(a) * r;
        const cy = -1.65 + Math.random() * 1.7; // fills -1.65 .. 0.05, clear of the base
        let near = Infinity;
        for (const q of placed) {
          const d = (q.x - cx) ** 2 + (q.y - cy) ** 2 + (q.z - cz) ** 2;
          if (d < near) near = d;
        }
        if (near > best) {
          best = near;
          px = cx;
          py = cy;
          pz = cz;
        }
      }
      placed.push({ x: px, y: py, z: pz });

      slot.position.set(px, py, pz);
      // biased toward lying on their side, the way loose capsules settle
      slot.rotation.set(
        (Math.random() - 0.5) * 0.6,
        Math.random() * Math.PI * 2,
        Math.PI / 2 + (Math.random() - 0.5) * 0.7
      );
      slot.updateMatrix();
      pillTops.setMatrixAt(i, slot.matrix);
      pillBots.setMatrixAt(i, slot.matrix);
    }
    pillTops.instanceMatrix.needsUpdate = true;
    pillBots.instanceMatrix.needsUpdate = true;
    pillTops.computeBoundingSphere();
    pillBots.computeBoundingSphere();
    bottleGroup.add(pillTops, pillBots);

    // ----- lid, parked above the neck until act 5 -----
    const lidGroup = new THREE.Group();
    lidGroup.position.y = 4.2;
    const lidR = 0.84;
    const lidH = 0.62;
    const lidSide = new THREE.Mesh(new THREE.CylinderGeometry(lidR, lidR, lidH, 64, 1, true), capMat);
    const lidTop = new THREE.Mesh(new THREE.CircleGeometry(lidR, 64), capMat);
    lidTop.rotation.x = -Math.PI / 2;
    lidTop.position.y = lidH / 2;
    lidGroup.add(lidSide, lidTop);
    // knurled grip - 44 ribs sharing one geometry, so the spin is legible
    const knurlGeo = new THREE.BoxGeometry(0.05, lidH * 0.88, 0.055);
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      const k = new THREE.Mesh(knurlGeo, capMat);
      k.position.set(Math.cos(a) * lidR, 0, Math.sin(a) * lidR);
      k.rotation.y = -a;
      lidGroup.add(k);
    }
    bottleGroup.add(lidGroup);

    // ================= acts 6-8: case, shelf, hand =================
    // All parked far below frame; each act lifts its own prop into place.
    const carton = makeCarton();
    carton.group.position.y = -34;

    const streaks = makeStreaks();
    streaks.mesh.position.z = 16; // start of the act 6 fly-past

    const shelf = makeShelf(jarMat, capMat, labelMat.map, [-6.5, -4.6, -2.7, 2.7, 4.6, 6.5, -8.4, 8.4]);
    shelf.group.position.y = -34;

    // The opening hand unscrews by orbiting the bottle's axis, so it hangs off a
    // pivot parked on that axis.
    const handOpen = makeHand();
    const handPivot = new THREE.Group();
    handPivot.add(handOpen.group);
    handOpen.group.position.set(HAND.openPark.x, HAND.openPark.y, HAND.openPark.z);
    handOpen.group.rotation.set(HAND.openPark.rx, HAND.openPark.ry, HAND.openPark.rz);
    handPivot.position.set(HELD.x, HELD.y - 34, HELD.z);
    applyHandPose(handOpen, 0);

    // The holding hand is a child of the bottle, so it inherits every move and
    // the tip at the end rather than having to be kept in sync with it.
    const handHold = makeHand(true); // left
    handHold.group.position.set(HAND.holdPark.x, HAND.holdPark.y, HAND.holdPark.z);
    handHold.group.rotation.set(HAND.hold.rx, HAND.hold.ry, HAND.hold.rz);
    applyHandPose(handHold, 1);
    bottleGroup.add(handHold.group);

    // ----- bake both grips against the bottle's actual surface -----
    // Pose the rig exactly as it will be at the grip moment, close each finger
    // until it contacts, then put everything back where it was parked.
    {
      const parkedBottle = bottleGroup.position.clone();
      bottleGroup.position.set(HELD.x, HELD.y, HELD.z);
      handPivot.position.set(HELD.x, HELD.y, HELD.z);
      handHold.group.position.set(HAND.hold.x, HAND.hold.y, HAND.hold.z);
      handOpen.group.position.set(HAND.onCap.x, HAND.onCap.y, HAND.onCap.z);
      handOpen.group.rotation.set(HAND.onCap.rx, HAND.onCap.ry, HAND.onCap.rz);
      outerGroup.updateMatrixWorld(true);

      const toBottle = bottleGroup.matrixWorld.clone().invert();
      const intoBottleSpace = (v) => v.applyMatrix4(toBottle);
      solveGrip(handHold, { maxCurl: HAND.holdCurl, toTarget: intoBottleSpace, radiusAt: bottleRadiusAt });
      solveGrip(handOpen, { maxCurl: HAND.openCurl, toTarget: intoBottleSpace, radiusAt: bottleRadiusAt });

      bottleGroup.position.copy(parkedBottle);
      handPivot.position.set(HELD.x, HELD.y - 34, HELD.z);
      handHold.group.position.set(HAND.holdPark.x, HAND.holdPark.y, HAND.holdPark.z);
      handOpen.group.position.set(HAND.openPark.x, HAND.openPark.y, HAND.openPark.z);
      handOpen.group.rotation.set(HAND.openPark.rx, HAND.openPark.ry, HAND.openPark.rz);
      applyHandPose(handOpen, 0);
      applyHandPose(handHold, 1);
    }

    capsuleGroup.add(shellGroup, wave, granuleGroup, coreGroup);
    outerGroup.add(bottleGroup, carton.group, streaks.mesh, shelf.group, handPivot);
    scene.add(outerGroup);

    // ----- post-processing -----
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.34, 0.8, 0.88);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    stateRef.current = {
      scene, camera, renderer, composer, bloom, camBase,
      outerGroup, capsuleGroup, shellGroup, topPart, botPart, seamMat, wave, waveMat,
      bottleGroup, lidGroup, jarMat, capMat, labelMat, pillMatA, pillMatB, ground,
      carton, streaks, shelf, handOpen, handHold, handPivot,
      handRig: { open: 0, hold: 1 },
      granuleGroup, granules, granuleMat, coreGroup, coreMat, haloMat,
      matA, matB, backdropMat, dustMat, groundMat,
      dragging: false, locked: false, prevX: 0, prevY: 0, velX: 0, velY: 0,
      pointerX: 0, pointerY: 0,
    };

    // dev-only handle so the scene can be inspected from the console
    if (process.env.NODE_ENV !== "production") window.__ms = stateRef.current;

    // ----- drag to tilt, with release momentum -----
    const dom = renderer.domElement;
    const S = stateRef.current;
    const onDown = (e) => {
      S.dragging = true;
      const p = e.touches ? e.touches[0] : e;
      S.prevX = p.clientX;
      S.prevY = p.clientY;
      S.velX = 0;
      S.velY = 0;
    };
    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      const rect = mount.getBoundingClientRect();
      S.pointerX = ((p.clientX - rect.left) / rect.width) * 2 - 1;
      S.pointerY = ((p.clientY - rect.top) / rect.height) * 2 - 1;
      if (!S.dragging || S.locked) return;
      const dx = p.clientX - S.prevX;
      const dy = p.clientY - S.prevY;
      S.prevX = p.clientX;
      S.prevY = p.clientY;
      S.velX = dx * 0.008;
      S.velY = dy * 0.008;
      capsuleGroup.rotation.y += S.velX;
      capsuleGroup.rotation.x += S.velY;
    };
    const onUp = () => {
      S.dragging = false;
    };

    dom.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    dom.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    // ----- render loop -----
    const t0 = performance.now();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;

      // idle float, plus momentum carried over from a drag release
      outerGroup.position.y = Math.sin(t * 0.8) * 0.055;
      if (!S.dragging && !S.locked) {
        capsuleGroup.rotation.y += S.velX;
        capsuleGroup.rotation.x += S.velY;
        S.velX *= 0.94;
        S.velY *= 0.94;
      }

      // the granule field keeps turning, so the act-3 ring reads as a live orbit
      granuleGroup.rotation.y += 0.0022;
      coreGroup.rotation.y -= 0.004;
      dust.rotation.y = t * 0.012;

      // pointer parallax layered on top of the scroll-driven camera dolly
      camera.position.x += (camBase.x + S.pointerX * 0.55 - camera.position.x) * 0.045;
      camera.position.y += (camBase.y - S.pointerY * 0.35 - camera.position.y) * 0.045;
      camera.position.z += (camBase.z - camera.position.z) * 0.12;
      lookAt.x += (camBase.tx - lookAt.x) * 0.08;
      lookAt.y += (camBase.ty - lookAt.y) * 0.08;
      lookAt.z += (camBase.tz - lookAt.z) * 0.08;
      camera.lookAt(lookAt);

      // both hands run off plain numbers so they cannot fight the scrub
      applyHandPose(handOpen, S.handRig.open);
      applyHandPose(handHold, S.handRig.hold);

      composer.render();
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dom.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      envRT.dispose();
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // ---- GSAP ScrollTrigger choreography ----
  useEffect(() => {
    const s = stateRef.current;
    const panels = panelsRef.current;
    const setProgress = gsap.quickSetter(progressRef.current, "scaleX");

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: pinRef.current,
        pinSpacing: false,
      });

      // one master timeline scrubbed to scroll, laid out on a 0..3 clock - one unit per act
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
          onUpdate: (self) => {
            setProgress(self.progress);
            s.locked = self.progress > 0.53; // act 5 onward, the timeline owns the capsule
          },
        },
      });

      if (process.env.NODE_ENV !== "production") window.__tl = tl;

      // continuous rotation across the whole scroll
      tl.to(s.outerGroup.rotation, { y: Math.PI * 2.1, ease: "none", duration: 3 }, 0);
      tl.to(s.outerGroup.rotation, { y: Math.PI * 2.75, ease: "none", duration: 3.2 }, 3);
      tl.to(s.outerGroup.rotation, { y: Math.PI * 4, ease: "power1.inOut", duration: 1.7 }, 6.2);
      tl.to(s.outerGroup.rotation, { x: 0.04, ease: "power2.inOut", duration: 1.4 }, 6.2);

      // ACT 1 - push in on the sealed capsule
      tl.to(s.camBase, { z: 5.3, duration: 1, ease: "power1.inOut" }, 0);

      // ACT 2 - the seam flares, the shell parts, the granules burst
      tl.to(s.seamMat, { emissiveIntensity: 4.5, duration: 0.22, ease: "power2.in" }, 0.9);
      tl.to(s.waveMat, { opacity: 0.5, duration: 0.15 }, 1.0);
      tl.to(s.wave.scale, { x: 8, y: 8, z: 8, duration: 0.9, ease: "power2.out" }, 1.0);
      tl.to(s.waveMat, { opacity: 0, duration: 0.6, ease: "power1.out" }, 1.15);
      tl.to(s.seamMat, { emissiveIntensity: 0, opacity: 0, duration: 0.5 }, 1.12);

      tl.to(s.topPart.position, { y: 1.05, duration: 1, ease: "power2.out" }, 1);
      tl.to(s.botPart.position, { y: -1.05, duration: 1, ease: "power2.out" }, 1);
      tl.to(s.granuleGroup.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.9)" }, 1.05);
      s.granules.forEach((g, i) => {
        const t = g.userData.scatter;
        tl.to(g.position, { x: t.x, y: t.y, z: t.z, duration: 1.1, ease: "power2.out" }, 1.08 + i * 0.008);
      });
      tl.to(s.camBase, { z: 8.6, duration: 1, ease: "power1.inOut" }, 1.6);

      // ACT 3 - shells tumble away and dissolve, granules gather into an orbit
      tl.to(s.topPart.position, { y: 4.2, duration: 1, ease: "power2.in" }, 2);
      tl.to(s.botPart.position, { y: -4.2, duration: 1, ease: "power2.in" }, 2);
      tl.to(s.topPart.rotation, { x: 1.1, z: 0.8, duration: 1, ease: "power1.inOut" }, 2);
      tl.to(s.botPart.rotation, { x: -1.1, z: -0.8, duration: 1, ease: "power1.inOut" }, 2);
      tl.to([s.matA, s.matB], { opacity: 0, duration: 0.65, ease: "power2.in" }, 2.1);
      tl.to(s.groundMat, { opacity: 0, duration: 0.5 }, 2.0);

      s.granules.forEach((g, i) => {
        const t = g.userData.halo;
        const big = g.userData.size * 1.35;
        tl.to(g.position, { x: t.x, y: t.y, z: t.z, duration: 0.95, ease: "power3.inOut" }, 2.05 + i * 0.006);
        tl.to(g.scale, { x: big, y: big, z: big, duration: 0.8 }, 2.1);
      });
      tl.to(s.granuleMat, { emissiveIntensity: 1.35, duration: 0.9, ease: "power2.out" }, 2.15);
      tl.to(s.coreGroup.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "back.out(2)" }, 2.25);
      tl.to(s.bloom, { strength: 0.62, duration: 0.9, ease: "power2.out" }, 2.2);

      // settle into the hero pose: tilt the orbit into an ellipse and pull back
      tl.to(s.outerGroup.rotation, { x: 0.42, duration: 1, ease: "power2.inOut" }, 2);
      tl.to(s.camBase, { z: 9.4, y: 0.9, duration: 1, ease: "power1.inOut" }, 2.1);

      // ACT 4 - everything runs back: the capsule reseals
      tl.to(s.bloom, { strength: 0.34, duration: 0.8, ease: "power2.inOut" }, 3);
      tl.to(s.granuleMat, { emissiveIntensity: 0.28, duration: 0.7 }, 3);
      tl.to(s.coreGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.5, ease: "power2.in" }, 3);
      tl.to(s.outerGroup.rotation, { x: 0.12, duration: 1, ease: "power2.inOut" }, 3);
      tl.to(s.camBase, { z: 8.2, y: 0.3, duration: 1, ease: "power1.inOut" }, 3.05);
      tl.to(s.groundMat, { opacity: 1, duration: 0.6 }, 3.2);
      tl.to([s.matA, s.matB], { opacity: 1, duration: 0.5 }, 3.15);

      s.granules.forEach((g, i) => {
        const h = g.userData.home;
        const sz = g.userData.size;
        tl.to(g.position, { x: h.x, y: h.y, z: h.z, duration: 0.9, ease: "power2.inOut" }, 3.05 + i * 0.006);
        tl.to(g.scale, { x: sz, y: sz, z: sz, duration: 0.7 }, 3.1);
      });

      tl.to(s.topPart.rotation, { x: 0, z: 0, duration: 0.8, ease: "power2.inOut" }, 3.1);
      tl.to(s.botPart.rotation, { x: 0, z: 0, duration: 0.8, ease: "power2.inOut" }, 3.1);
      tl.to(s.topPart.position, { y: 0, duration: 0.9, ease: "power2.inOut" }, 3.3);
      tl.to(s.botPart.position, { y: 0, duration: 0.9, ease: "power2.inOut" }, 3.3);
      tl.to(s.granuleGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35, ease: "power2.in" }, 3.8);
      tl.to(s.seamMat, { opacity: 1, duration: 0.3 }, 3.85);
      // the click of it shutting
      tl.to(s.seamMat, { emissiveIntensity: 3.2, duration: 0.14 }, 4.05);
      tl.to(s.seamMat, { emissiveIntensity: 0, duration: 0.45 }, 4.19);

      // ACT 5 - the container arrives and the capsule is packed
      tl.to(s.bottleGroup.position, { y: 0, duration: 1, ease: "power2.out" }, 4.3);
      tl.to(s.camBase, { z: 11.6, y: 0.05, duration: 1.2, ease: "power1.inOut" }, 4.3);
      tl.to(s.ground.position, { y: -2.2, duration: 1, ease: "power2.out" }, 4.3);
      tl.to(s.ground.scale, { x: 1.35, y: 1.35, duration: 1, ease: "power2.out" }, 4.3);

      // stand the capsule upright over the neck and shrink it to pill scale
      tl.to(s.capsuleGroup.rotation, { x: 0, y: 0, z: 0, duration: 0.9, ease: "power2.inOut" }, 4.35);
      tl.to(s.shellGroup.scale, { x: 0.34, y: 0.34, z: 0.34, duration: 0.85, ease: "power2.inOut" }, 4.45);
      tl.to(s.shellGroup.position, { y: 2.95, duration: 0.85, ease: "power2.inOut" }, 4.45);

      // then drop it through the neck into the pile
      tl.to(s.shellGroup.position, { y: 0.38, duration: 0.75, ease: "power2.in" }, 4.95);
      tl.to(s.shellGroup.rotation, { x: 0.85, z: 1.3, duration: 0.85, ease: "power1.out" }, 5);

      // lid comes down and screws on - three full turns, then a quarter to seat it
      tl.to(s.lidGroup.position, { y: 1.62, duration: 0.55, ease: "power2.inOut" }, 5.5);
      tl.to(s.lidGroup.rotation, { y: Math.PI * 6, duration: 0.55, ease: "none" }, 5.5);
      tl.to(s.lidGroup.rotation, { y: Math.PI * 6.5, duration: 0.15, ease: "back.out(2.4)" }, 6.05);

      // ACT 6 - cased and shipped
      tl.to(s.bottleGroup.position, { y: 3.4, duration: 0.5, ease: "power2.inOut" }, 6.2);
      tl.to(s.shellGroup.position, { y: 3.78, duration: 0.5, ease: "power2.inOut" }, 6.2);
      tl.to(s.carton.group.position, { y: 0, duration: 0.6, ease: "power2.out" }, 6.25);
      tl.to(s.camBase, { z: 13, y: 0.4, ty: 0.2, duration: 0.9, ease: "power1.inOut" }, 6.2);
      tl.to(s.groundMat, { opacity: 0, duration: 0.4 }, 6.3);

      // lower it into the case
      tl.to(s.bottleGroup.position, { y: -0.15, duration: 0.5, ease: "power2.in" }, 6.75);
      tl.to(s.shellGroup.position, { y: 0.23, duration: 0.5, ease: "power2.in" }, 6.75);

      // side flaps first, long flaps folded over the top of them
      tl.to(s.carton.flaps.flapL.rotation, { z: 0, duration: 0.28, ease: "power2.inOut" }, 7.15);
      tl.to(s.carton.flaps.flapR.rotation, { z: 0, duration: 0.28, ease: "power2.inOut" }, 7.15);
      tl.to(s.carton.flaps.flapF.rotation, { x: 0, duration: 0.3, ease: "power2.inOut" }, 7.35);
      tl.to(s.carton.flaps.flapB.rotation, { x: 0, duration: 0.3, ease: "power2.inOut" }, 7.35);

      // in transit - streaks rush past a case that is now sealed
      tl.to(s.streaks.mat, { opacity: 0.5, duration: 0.2 }, 7.35);
      tl.to(s.streaks.mesh.position, { z: -16, duration: 0.55, ease: "none" }, 7.35);
      tl.to(s.streaks.mat, { opacity: 0, duration: 0.2 }, 7.7);

      // hold on the sealed case for a beat before the page continues
      tl.to({}, { duration: 0.3 }, 7.9);

      // ----- copy panels, cross-faded against the acts -----
      // timeline runs 0..8.2; act boundaries land at roughly
      // 13 / 24 / 37 / 53 / 75 / 100 percent of the scroll
      const marks = [
        { in: null, out: ["5.6% top", "10.5% top"] },
        { in: ["13.7% top", "18.5% top"], out: ["20.9% top", "24.1% top"] },
        { in: ["27.4% top", "31.4% top"], out: ["33.8% top", "37% top"] },
        { in: ["40.2% top", "45.9% top"], out: ["49.1% top", "52.3% top"] },
        { in: ["57.1% top", "62.8% top"], out: ["70.8% top", "74.9% top"] },
        { in: ["79.7% top", "85.3% top"], out: null },
      ];
      panels.forEach((el, i) => {
        const m = marks[i];
        if (m.in) {
          gsap.fromTo(
            el,
            { opacity: 0, y: 34, filter: "blur(6px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              scrollTrigger: { trigger: containerRef.current, start: m.in[0], end: m.in[1], scrub: true },
            }
          );
        }
        if (m.out) {
          gsap.to(el, {
            opacity: 0,
            y: -34,
            filter: "blur(6px)",
            scrollTrigger: { trigger: containerRef.current, start: m.out[0], end: m.out[1], scrub: true },
          });
        }
      });
    });

    return () => ctx.revert();
  }, []);

  // ---- palette: tween every material carrying the colour ----
  useEffect(() => {
    const s = stateRef.current;
    if (!s.matA) return;
    const p = PALETTES[paletteIdx];
    const to = (target, hex, duration = 0.55) => {
      const c = new THREE.Color(hex);
      gsap.to(target, { r: c.r, g: c.g, b: c.b, duration, ease: "power2.out", overwrite: true });
    };
    to(s.matA.color, p.a);
    to(s.matB.color, p.b);
    to(s.seamMat.color, p.ring);
    to(s.seamMat.emissive, p.glow);
    to(s.granuleMat.color, p.grain);
    to(s.granuleMat.emissive, p.glow);
    to(s.coreMat.color, p.glow);
    to(s.haloMat.color, p.glow);
    to(s.waveMat.color, p.glow);
    to(s.dustMat.color, p.grain);
    to(s.jarMat.color, p.jar);
    to(s.capMat.color, p.cap);
    to(s.pillMatA.color, p.a);
    to(s.pillMatB.color, p.b);
    to(s.backdropMat.uniforms.cTop.value, p.bg, 0.8);
    to(s.backdropMat.uniforms.cGlow.value, p.glow, 0.8);
  }, [paletteIdx]);

  // ---- gloss ----
  useEffect(() => {
    const s = stateRef.current;
    if (!s.matA) return;
    [s.matA, s.matB].forEach((m) => {
      gsap.to(m, {
        roughness: 0.42 - gloss * 0.36,
        clearcoat: gloss,
        clearcoatRoughness: 0.32 - gloss * 0.28,
        envMapIntensity: 0.35 + gloss * 0.6,
        duration: 0.3,
        overwrite: true,
      });
    });
  }, [gloss]);

  const palette = PALETTES[paletteIdx];

  return (
    <div style={{ "--accent": palette.hud }}>
      <div ref={containerRef} className="stage" style={{ height: "980vh" }}>
        <div ref={pinRef} className="pin">
          <div ref={mountRef} className="canvas-mount" />

          <div className="progress">
            <i ref={progressRef} />
          </div>

          <div className="panels">
            {COPY.map((c, i) => (
              <div key={c.tag} ref={(el) => (panelsRef.current[i] = el)} className="panel" style={i === 0 ? undefined : { opacity: 0 }}>
                <div className="eyebrow">{c.tag}</div>
                <h2>
                  {c.a}
                  <br />
                  <span className="soft">{c.b}</span>
                </h2>
                <p>{c.body}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
