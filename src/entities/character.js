// Basit, animasyonlu low-poly insan iskeleti (oyuncu + NPC)
import * as THREE from 'three';
import { mat } from '../world/models.js';

function part(geo, material, pivotY = 0) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, material);
  m.position.y = pivotY;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return g;
}

export function createCharacter(look = {}) {
  const {
    coat = '#2b3a55', pants = '#2a2a30', skin = '#e0b090', hair = '#3a2a1a', hat = 'none', hatColor = '#7a2a2a',
    beard = null, apron = null, vest = null, mustache = null, bald = false, scale = 1, glasses = false, goggles = false, cane = false, boots = '#2a2018',
  } = look;
  const root = new THREE.Group();
  const body = new THREE.Group(); // dönme + zıplama
  root.add(body);

  const coatM = mat(coat), pantsM = mat(pants), skinM = mat(skin), hairM = mat(hair);

  // Bacaklar (kalçadan pivot)
  const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.22);
  const legL = part(legGeo, pantsM, -0.36); legL.position.set(0, 0.74, 0.13);
  const legR = part(legGeo, pantsM, -0.36); legR.position.set(0, 0.74, -0.13);
  for (const L of [legL, legR]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.24), mat(boots));
    b.position.set(0.04, -0.69, 0); b.castShadow = true; L.add(b);
  }
  body.add(legL, legR);

  // Gövde
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.78, 0.56), coatM);
  torso.position.y = 1.12; torso.castShadow = true; body.add(torso);
  const coatTail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.58), coatM);
  coatTail.position.y = 0.68; coatTail.castShadow = true; body.add(coatTail);
  if (apron) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.42), mat(apron)); a.position.set(0.2, 0.92, 0); body.add(a); }
  if (vest) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.5), mat(vest)); v.position.set(0.01, 1.22, 0); body.add(v); }

  // Kollar (omuzdan pivot)
  const armGeo = new THREE.BoxGeometry(0.17, 0.66, 0.17);
  const armL = part(armGeo, coatM, -0.31); armL.position.set(0, 1.46, 0.37);
  const armR = part(armGeo, coatM, -0.31); armR.position.set(0, 1.46, -0.37);
  for (const A of [armL, armR]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.15), skinM);
    h.position.y = -0.68; A.add(h);
  }
  body.add(armL, armR);

  // Baş
  const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.36), skinM); skull.castShadow = true; head.add(skull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), skinM); nose.position.set(0.2, -0.02, 0); head.add(nose);
  const eyeM = mat('#141414');
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.05), eyeM); e.position.set(0.185, 0.05, s * 0.09); head.add(e); }
  if (!bald) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), hairM); h.position.set(-0.02, 0.18, 0); head.add(h);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.4), hairM); back.position.set(-0.15, 0.04, 0); head.add(back);
  } else {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.4), hairM); side.position.set(-0.1, -0.02, 0); head.add(side);
  }
  if (beard) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.34), mat(beard)); b.position.set(0.11, -0.17, 0); head.add(b); }
  if (mustache) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.24), mat(mustache)); m.position.set(0.2, -0.09, 0); head.add(m); }
  if (glasses || goggles) {
    const gm = mat(goggles ? '#8a6a3a' : '#222');
    for (const s of [-1, 1]) { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.11), gm); gl.position.set(goggles ? 0.0 : 0.19, goggles ? 0.2 : 0.05, s * 0.09); head.add(gl); }
  }
  if (hat === 'beanie') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.42), mat(hatColor)); b.position.y = 0.24; head.add(b);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), mat(hatColor)); f.position.y = 0.14; head.add(f);
  } else if (hat === 'cap') {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), mat(hatColor)); c.position.y = 0.23; head.add(c);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.38), mat(hatColor)); v.position.set(0.26, 0.17, 0); head.add(v);
  } else if (hat === 'shawl') {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), mat(hatColor)); s.position.set(-0.04, 0.06, 0); head.add(s);
    skull.position.x = 0.03; nose.position.x = 0.23;
  } else if (hat === 'bun') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), hairM); b.position.set(-0.18, 0.22, 0); head.add(b);
  } else if (hat === 'raincoat') {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.46), mat(hatColor)); s.position.y = 0.2; head.add(s);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.56), mat(hatColor)); brim.position.set(-0.04, 0.12, 0); head.add(brim);
  }

  let caneMesh = null;
  if (cane) {
    caneMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 5), mat('#4a3020'));
    caneMesh.position.set(0.2, -0.85, 0); armL.add(caneMesh);
  }

  // Elde tutulan eşya yuvası (sağ el)
  const handSlot = new THREE.Group(); handSlot.position.set(0, -0.7, 0); armR.add(handSlot);
  const hipSlot = new THREE.Group(); hipSlot.position.set(0.05, 0.85, 0.32); body.add(hipSlot);

  root.scale.setScalar(scale);

  const rig = { root, body, legL, legR, armL, armR, head, torso, handSlot, hipSlot, phase: Math.random() * 6, facing: 1, faceTarget: 1, yaw: 0 };
  return rig;
}

// pose: 'idle' | 'walk' | 'run' | 'sit' | 'fish' | 'work' | 'look' | 'jump'
export function animateCharacter(rig, dt, speed, pose = 'idle', t = 0) {
  const { body, legL, legR, armL, armR, head } = rig;
  // yön: 3/4 açıyla kameraya doğru hafif dönük
  let targetYaw;
  if (pose === 'fish' || pose === 'look') targetYaw = Math.PI / 2 + (rig.facing > 0 ? -0.6 : 0.6); // denize (arka) bak
  else if (pose === 'sit') targetYaw = -Math.PI / 2;
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

  let lL = 0, lR = 0, aL = 0, aR = 0, bob = 0, lean = 0, headX = 0;
  if (moving) {
    lL = s * amp; lR = -s * amp; aL = -s * amp * 0.8; aR = s * amp * 0.8;
    bob = Math.abs(Math.cos(rig.phase)) * 0.07;
    lean = pose === 'run' ? -0.12 : -0.03;
  } else if (pose === 'sit') {
    lL = lR = 1.45; aL = aR = 0.3; bob = -0.38;
  } else if (pose === 'fish') {
    aR = 1.1; aL = 0.9; lL = 0.1; lR = -0.1; bob = Math.sin(t * 1.5) * 0.01;
  } else if (pose === 'work') {
    const w = Math.sin(t * 10);
    aR = 1.2 + w * 0.8; aL = 0.5; lean = -0.15 + w * 0.05;
  } else if (pose === 'jump') {
    lL = 0.5; lR = -0.3; aL = 2.4; aR = 2.2;
  } else {
    // nefes
    bob = Math.sin(t * 2 + rig.phase) * 0.012;
    aL = Math.sin(t * 2) * 0.03; aR = -aL;
    headX = Math.sin(t * 0.5 + rig.phase) * 0.08;
  }
  const k = Math.min(1, dt * 14);
  legL.rotation.z += (lL - legL.rotation.z) * k;
  legR.rotation.z += (lR - legR.rotation.z) * k;
  armL.rotation.z += (aL - armL.rotation.z) * k;
  armR.rotation.z += (aR - armR.rotation.z) * k;
  body.position.y += (bob - body.position.y) * k;
  body.rotation.z += (lean - body.rotation.z) * k;
  head.rotation.y += (headX - head.rotation.y) * k;
}
