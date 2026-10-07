// Yuvarlatılmış, yumuşak gölgeli, yüz detaylı karakter iskeleti (oyuncu + NPC)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const geoCache = new Map();
function rbox(w, h, d, r = 0.05, seg = 2) {
  const k = `${w}|${h}|${d}|${r}|${seg}`;
  let g = geoCache.get(k);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)); geoCache.set(k, g); }
  return g;
}
function sphere(r, ws = 10, hs = 8) {
  const k = `s${r}|${ws}|${hs}`;
  let g = geoCache.get(k);
  if (!g) { g = new THREE.SphereGeometry(r, ws, hs); geoCache.set(k, g); }
  return g;
}
const matCache = new Map();
function cm(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  let m = matCache.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...opts }); matCache.set(k, m); }
  return m;
}
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = shadow;
  return m;
}
function pivot(child, y) {
  const g = new THREE.Group();
  child.position.y = y;
  g.add(child);
  return g;
}

export function createCharacter(look = {}) {
  const {
    coat = '#2b3a55', pants = '#2a2a30', skin = '#e0b090', hair = '#3a2a1a', hat = 'none', hatColor = '#7a2a2a',
    beard = null, apron = null, vest = null, mustache = null, bald = false, scale = 1, glasses = false, goggles = false, cane = false,
    boots = '#2a2018', scarf = null, hairStyle = 'short', eye = '#1e1a18', lips = '#a8584e',
  } = look;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const coatM = cm(coat), pantsM = cm(pants), skinM = cm(skin), hairM = cm(hair, { roughness: 0.9 }), bootM = cm(boots, { roughness: 0.6 });

  // --- Bacaklar (kalçadan pivot)
  const mkLeg = (z) => {
    const g = pivot(mesh(rbox(0.2, 0.66, 0.21, 0.08), pantsM), -0.33);
    g.position.set(0, 0.76, z);
    g.add(mesh(rbox(0.3, 0.14, 0.22, 0.06), bootM, 0.04, -0.69, 0));
    return g;
  };
  const legL = mkLeg(0.12), legR = mkLeg(-0.12);
  body.add(legL, legR);
  body.add(mesh(rbox(0.36, 0.2, 0.44, 0.08), pantsM, 0, 0.8, 0));

  // --- Gövde
  const torso = mesh(rbox(0.36, 0.64, 0.52, 0.13), coatM, 0, 1.14, 0);
  body.add(torso);
  body.add(mesh(rbox(0.39, 0.3, 0.55, 0.1), coatM, -0.005, 0.8, 0)); // palto eteği
  body.add(mesh(rbox(0.37, 0.06, 0.53, 0.025), cm('#1e1812', { roughness: 0.5 }), 0, 0.92, 0)); // kemer
  body.add(mesh(rbox(0.04, 0.07, 0.09, 0.015), cm('#c8a050', { metalness: 0.6, roughness: 0.35 }), 0.19, 0.92, 0));
  const btnM = cm('#1a1410', { roughness: 0.4 });
  for (const y of [1.05, 1.2, 1.35]) body.add(mesh(sphere(0.022, 6, 5), btnM, 0.185, y, 0.04, false));
  if (apron) body.add(mesh(rbox(0.05, 0.72, 0.42, 0.02), cm(apron), 0.19, 0.95, 0));
  if (vest) body.add(mesh(rbox(0.39, 0.46, 0.5, 0.1), cm(vest), 0.01, 1.2, 0));
  // yaka / atkı
  if (scarf) {
    body.add(mesh(rbox(0.28, 0.1, 0.36, 0.05), cm(scarf, { roughness: 0.95 }), 0.01, 1.5, 0));
    body.add(mesh(rbox(0.05, 0.26, 0.09, 0.025), cm(scarf, { roughness: 0.95 }), 0.18, 1.34, 0.1));
  } else {
    body.add(mesh(rbox(0.38, 0.08, 0.46, 0.04), coatM, 0, 1.45, 0));
  }
  body.add(mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.12, 10), skinM, 0, 1.52, 0));

  // --- Kollar (omuzdan pivot)
  const mkArm = (z) => {
    const g = pivot(mesh(rbox(0.15, 0.6, 0.15, 0.065), coatM), -0.28);
    g.position.set(0, 1.42, z);
    g.add(mesh(rbox(0.16, 0.07, 0.16, 0.03), coatM, 0, -0.56, 0)); // manşet
    g.add(mesh(sphere(0.075), skinM, 0, -0.65, 0));
    return g;
  };
  const armL = mkArm(0.34), armR = mkArm(-0.34);
  body.add(armL, armR);

  // --- Baş
  const head = new THREE.Group(); head.position.y = 1.78; body.add(head);
  const skull = mesh(rbox(0.4, 0.42, 0.4, 0.14, 3), skinM); head.add(skull);
  head.add(mesh(sphere(0.055, 8, 6), skinM, 0.0, -0.02, 0.205)); // kulaklar
  head.add(mesh(sphere(0.055, 8, 6), skinM, 0.0, -0.02, -0.205));
  head.add(mesh(rbox(0.07, 0.08, 0.07, 0.03), skinM, 0.215, -0.03, 0, false)); // burun
  // gözler
  const eyeM = cm(eye, { roughness: 0.3 }), whiteM = cm('#ffffff', { roughness: 0.3 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(0.195, 0.045, s * 0.088);
    e.add(mesh(sphere(0.034, 8, 6), eyeM, 0, 0, 0, false));
    e.add(mesh(sphere(0.011, 5, 4), whiteM, 0.026, 0.012, -s * 0.008, false));
    e.scale.set(0.6, 1.25, 1);
    head.add(e); eyes.push(e);
  }
  // kaşlar, ağız, yanaklar
  const browM = cm(bald ? '#5a4a40' : hair, { roughness: 0.9 });
  const brows = [];
  for (const s of [-1, 1]) { const b = mesh(rbox(0.02, 0.025, 0.08, 0.008), browM, 0.2, 0.11, s * 0.09, false); b.rotation.x = s * 0.12; head.add(b); brows.push(b); }
  const mouth = mesh(rbox(0.015, 0.022, 0.08, 0.008), cm(lips, { roughness: 0.6 }), 0.202, -0.105, 0, false);
  head.add(mouth);
  const blushM = cm('#e8907e', { transparent: true, opacity: 0.38, roughness: 1 });
  for (const s of [-1, 1]) { const c = mesh(sphere(0.04, 8, 6), blushM, 0.18, -0.05, s * 0.125, false); c.scale.set(0.3, 0.6, 1); head.add(c); }

  // saç
  if (!bald && hat !== 'shawl') {
    head.add(mesh(rbox(0.44, 0.17, 0.44, 0.08), hairM, -0.01, 0.17, 0));
    head.add(mesh(rbox(0.16, hairStyle === 'long' ? 0.62 : 0.34, 0.44, 0.07), hairM, -0.15, hairStyle === 'long' ? -0.1 : 0.04, 0));
    head.add(mesh(rbox(0.1, 0.1, 0.3, 0.04), hairM, 0.16, 0.18, 0.04)); // perçem
    for (const s of [-1, 1]) head.add(mesh(rbox(0.16, 0.18, 0.05, 0.02), hairM, -0.02, 0.08, s * 0.2)); // favori
    if (hairStyle === 'long') for (const s of [-1, 1]) head.add(mesh(rbox(0.12, 0.44, 0.07, 0.03), hairM, -0.06, -0.12, s * 0.21));
  } else if (bald) {
    for (const s of [-1, 1]) head.add(mesh(rbox(0.22, 0.12, 0.05, 0.03), hairM, -0.08, -0.02, s * 0.2));
    head.add(mesh(rbox(0.06, 0.12, 0.36, 0.03), hairM, -0.2, -0.02, 0));
  }
  if (beard) head.add(mesh(rbox(0.2, 0.2, 0.36, 0.08), cm(beard, { roughness: 0.95 }), 0.12, -0.17, 0));
  if (mustache) head.add(mesh(rbox(0.06, 0.05, 0.22, 0.02), cm(mustache, { roughness: 0.95 }), 0.215, -0.075, 0));
  if (glasses || goggles) {
    const gm = cm(goggles ? '#8a6a3a' : '#1e1e22', { roughness: 0.4, metalness: 0.3 });
    const lens = cm(goggles ? '#9fc8d0' : '#cfe3ec', { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 });
    const gy = goggles ? 0.21 : 0.05, gx = goggles ? 0.12 : 0.215;
    for (const s of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), gm, gx, gy, s * 0.088, false);
      ring.rotation.y = Math.PI / 2; head.add(ring);
      const glass = mesh(new THREE.CircleGeometry(0.045, 12), lens, gx + 0.005, gy, s * 0.088, false);
      glass.rotation.y = Math.PI / 2; head.add(glass);
    }
    if (goggles) head.add(mesh(rbox(0.3, 0.04, 0.46, 0.02), gm, -0.03, 0.21, 0));
  }
  if (hat === 'beanie') {
    head.add(mesh(rbox(0.46, 0.22, 0.46, 0.11), cm(hatColor, { roughness: 0.95 }), -0.01, 0.25, 0));
    head.add(mesh(rbox(0.48, 0.09, 0.48, 0.04), cm(hatColor, { roughness: 0.95 }), -0.01, 0.15, 0));
    head.add(mesh(sphere(0.06, 8, 6), cm(hatColor, { roughness: 1 }), -0.02, 0.38, 0));
  } else if (hat === 'cap') {
    head.add(mesh(rbox(0.45, 0.15, 0.45, 0.07), cm(hatColor), -0.01, 0.24, 0));
    head.add(mesh(rbox(0.22, 0.035, 0.38, 0.015), cm(hatColor), 0.25, 0.18, 0));
  } else if (hat === 'shawl') {
    const sm = cm(hatColor, { roughness: 1 });
    head.add(mesh(rbox(0.44, 0.5, 0.5, 0.16), sm, -0.05, 0.05, 0));
    head.add(mesh(rbox(0.12, 0.18, 0.36, 0.05), cm(hair, { roughness: 0.9 }), 0.15, 0.17, 0)); // önden görünen beyaz saç
    head.add(mesh(rbox(0.2, 0.3, 0.6, 0.08), sm, -0.02, -0.28, 0));
    skull.scale.set(1, 1, 0.96);
  } else if (hat === 'bun') {
    head.add(mesh(sphere(0.12, 10, 8), hairM, -0.2, 0.2, 0));
  }
  let caneMesh = null;
  if (cane) {
    caneMesh = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.95, 6), cm('#4a3020'), 0.2, -0.85, 0);
    armL.add(caneMesh);
  }

  const handSlot = new THREE.Group(); handSlot.position.set(0, -0.68, 0); armR.add(handSlot);
  const hipSlot = new THREE.Group(); hipSlot.position.set(0.05, 0.86, 0.3); body.add(hipSlot);

  root.scale.setScalar(scale);
  return {
    root, body, legL, legR, armL, armR, head, torso, handSlot, hipSlot, eyes, brows, mouth,
    phase: Math.random() * 6, facing: 1, yaw: 0, blinkT: 1 + Math.random() * 4,
  };
}

// pose: 'idle' | 'walk' | 'run' | 'sit' | 'fish' | 'work' | 'look' | 'jump' | 'drive'
export function animateCharacter(rig, dt, speed, pose = 'idle', t = 0) {
  const { body, legL, legR, armL, armR, head } = rig;
  let targetYaw;
  if (pose === 'fish' || pose === 'look') targetYaw = Math.PI / 2 + (rig.facing > 0 ? -0.6 : 0.6); // denize bak
  else if (pose === 'sit') targetYaw = -Math.PI / 2;
  else if (pose === 'drive') targetYaw = rig.facing > 0 ? -0.2 : Math.PI + 0.2;
  else targetYaw = rig.facing > 0 ? -0.35 : Math.PI + 0.35;
  let d = targetYaw - rig.yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  rig.yaw += d * Math.min(1, dt * 12);
  body.rotation.y = rig.yaw;

  const moving = pose === 'walk' || pose === 'run';
  const amp = pose === 'run' ? 0.95 : 0.6;
  if (moving) rig.phase += dt * speed * (pose === 'run' ? 1.5 : 2.2);
  const s = Math.sin(rig.phase);

  let lL = 0, lR = 0, aL = 0, aR = 0, bob = 0, lean = 0, headY = 0, headZ = 0;
  if (moving) {
    lL = s * amp; lR = -s * amp; aL = -s * amp * 0.8; aR = s * amp * 0.8;
    bob = Math.abs(Math.cos(rig.phase)) * 0.07;
    lean = pose === 'run' ? -0.12 : -0.03;
    headZ = Math.sin(rig.phase * 2) * 0.02;
  } else if (pose === 'sit') {
    lL = lR = 1.45; aL = aR = 0.3; bob = -0.38;
  } else if (pose === 'drive') {
    lL = lR = 1.35; aL = 0.35; aR = -0.55; bob = -0.38; lean = -0.05;
    headZ = Math.sin(t * 1.3) * 0.03;
  } else if (pose === 'fish') {
    aR = 1.1; aL = 0.9; lL = 0.1; lR = -0.1; bob = Math.sin(t * 1.5) * 0.01;
  } else if (pose === 'work') {
    const w = Math.sin(t * 10);
    aR = 1.2 + w * 0.8; aL = 0.5; lean = -0.15 + w * 0.05;
  } else if (pose === 'jump') {
    lL = 0.5; lR = -0.3; aL = 2.4; aR = 2.2;
  } else {
    bob = Math.sin(t * 2 + rig.phase) * 0.012;
    aL = Math.sin(t * 2) * 0.03; aR = -aL;
    headY = Math.sin(t * 0.5 + rig.phase) * 0.12;
    headZ = Math.sin(t * 0.7 + rig.phase * 2) * 0.03;
  }
  const k = Math.min(1, dt * 14);
  legL.rotation.z += (lL - legL.rotation.z) * k;
  legR.rotation.z += (lR - legR.rotation.z) * k;
  armL.rotation.z += (aL - armL.rotation.z) * k;
  armR.rotation.z += (aR - armR.rotation.z) * k;
  body.position.y += (bob - body.position.y) * k;
  body.rotation.z += (lean - body.rotation.z) * k;
  head.rotation.y += (headY - head.rotation.y) * k * 0.5;
  head.rotation.z += (headZ - head.rotation.z) * k * 0.5;

  // göz kırpma
  rig.blinkT -= dt;
  let open = 1;
  if (rig.blinkT < 0) { open = Math.max(0.1, Math.abs(rig.blinkT + 0.07) / 0.07); if (rig.blinkT < -0.14) rig.blinkT = 2 + Math.random() * 4; }
  for (const e of rig.eyes) e.scale.y = 1.25 * open;
}
