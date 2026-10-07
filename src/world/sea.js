import * as THREE from 'three';
import { SEA_LEVEL } from './terrain.js';

let waveScale = 1;
export function setWaveScale(s) { waveScale = s; }

export function waveHeight(x, z, t) {
  const far = Math.min(1, Math.max(0, -z / 40));
  const a = (0.12 + far * 0.2) * Math.min(waveScale, z > -3 ? 1.6 : 9);
  return SEA_LEVEL
    + Math.sin(x * 0.17 + t * 0.9 + z * 0.05) * a
    + Math.sin(z * 0.23 - t * 1.25 + x * 0.04) * a * 0.75
    + Math.sin((x + z) * 0.37 + t * 1.8) * a * 0.32;
}

export class Sea {
  constructor(scene) {
    this.W = 640; this.D = 330;
    this.cell = 4;
    const geo = new THREE.PlaneGeometry(this.W, this.D, this.W / this.cell, 66);
    geo.rotateX(-Math.PI / 2);
    // z: +14 .. -316
    geo.translate(0, 0, 14 - this.D / 2);
    // Yakın sıraları sıklaştır (z uzaklığını üstel dağıt)
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      const t = (14 - z) / this.D; // 0..1
      p.setZ(i, 14 - Math.pow(t, 1.7) * this.D);
    }
    this.base = Float32Array.from(p.array);
    this.mat = new THREE.MeshStandardMaterial({ color: '#2a5a6a', flatShading: true, roughness: 0.42, metalness: 0.05, transparent: true, opacity: 0.94 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.t = 0;
  }

  update(dt, camX, color) {
    this.t += dt;
    const snap = Math.round(camX / this.cell) * this.cell;
    this.mesh.position.x = snap;
    const p = this.mesh.geometry.attributes.position, b = this.base;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3] + snap, z = b[i * 3 + 2];
      p.array[i * 3 + 1] = waveHeight(x, z, this.t);
    }
    p.needsUpdate = true;
    if (color) this.mat.color.copy(color);
  }
}
