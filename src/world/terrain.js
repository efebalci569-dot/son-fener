import * as THREE from 'three';
import { clamp, lerp, smoothstep, noise1, hash2 } from '../core/utils.js';

export const SEA_LEVEL = -0.6;

export const ZONES = [
  { id: 'tersane', name: 'Eski Tersane', from: -205, to: -138, surface: 'stone' },
  { id: 'orman', name: 'Orman', from: -138, to: -68, surface: 'grass' },
  { id: 'kasaba', name: 'Kasaba', from: -68, to: 9, surface: 'stone' },
  { id: 'iskele', name: 'Balıkçı İskelesi', from: 9, to: 43, surface: 'wood' },
  { id: 'sahil', name: 'Sahil', from: 43, to: 123, surface: 'sand' },
  { id: 'bogaz', name: 'Fener Boğazı', from: 123, to: 153, surface: 'wood' },
  { id: 'fener', name: 'Fener Adası', from: 153, to: 206, surface: 'rock' },
];

// Fener adası ve boğaz
export const PIER_A = { from: 116.5, to: 123.0 };   // sahildeki sandal iskelesi
export const PIER_B = { from: 151.0, to: 155.5 };   // adadaki iskele
export const SANDAL_DOCK = { beach: 124.4, island: 149.7 };
export const STRAIT = { from: 122.7, to: 151.3 };   // yürüyerek geçilemez
export const WORLD_MAX_X = 203;

export function zoneAt(x) {
  for (const z of ZONES) if (x >= z.from && x < z.to) return z;
  return x < 0 ? ZONES[0] : ZONES[ZONES.length - 1];
}

// Yürüme hattı yüksekliği (z = 0)
const PROFILE = [
  [-215, 1.2], [-203, 0.5], [-142, 0.45], [-132, 1.0], [-118, 1.7], [-104, 1.2], [-92, 0.8], [-80, 1.3], [-70, 0.25], [-64, 0],
  [8.5, 0], [9.6, 0.62], [42.4, 0.62], [43.6, 0.2], [70, 0.3], [95, 0.18], [113.5, 0.3], [116.5, 0.62], [123, 0.62], [124.5, -2.6],
  [149.5, -2.6], [151, 0.62], [155.5, 0.62], [158.5, 1.2], [164, 2.6], [168, 3.2], [214, 3.2],
];

export function groundY(x) {
  if (x <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [x0, y0] = PROFILE[i], [x1, y1] = PROFILE[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      const s = (1 - Math.cos(t * Math.PI)) / 2;
      let y = lerp(y0, y1, s);
      if (x > -138 && x < -70) y += (noise1(x * 0.25) - 0.5) * 0.35; // orman: hafif tümsekler
      if (x > 44 && x < 113) y += (noise1(x * 0.4 + 7) - 0.5) * 0.12;
      return y;
    }
  }
  return PROFILE[PROFILE.length - 1][1];
}

// Arka planın deniz mi kara mı olduğunu belirleyen ağırlık
function seaBackWeight(x) {
  // tersane (deniz), orman & kasaba (kara), iskele/sahil/fener (deniz)
  const a = 1 - smoothstep(-146, -134, x);
  const b = smoothstep(-3, 13, x);
  return Math.max(a, b);
}
function dockWeight(x) { return smoothstep(8.6, 10.4, x) * (1 - smoothstep(41.6, 43.4, x)); }
// boğaz: sahil iskelesinden ada iskelesine kadar her yer su
function channelWeight(x) { return smoothstep(116, 123.5, x) * (1 - smoothstep(150.5, 157, x)); }

export function terrainHeight(x, z) {
  const y0 = groundY(x);
  const sw = seaBackWeight(x);
  let y;
  if (z >= -2.2 && z <= 2.4) {
    y = y0;
  } else if (z > 2.4) {
    // ön plan: hafifçe alçalan; ada önden de denize iner
    const t = z - 2.4;
    y = y0 - Math.min(t, 3) * 0.04 + (hash2(Math.round(x * 2), Math.round(z * 2)) - 0.5) * 0.08;
    if (x > 153) y -= smoothstep(1.5, 8, t) * 5 * smoothstep(153, 158, x);
  } else {
    const t = -z - 2.2;
    // Kara arka planı: tepelere yükselir
    // ön sıradaki binalar düz zemine otursun diye tepe z≈-8'den sonra başlar
    const tt = Math.max(0, t - 6);
    const hills = y0 + tt * 0.26 + Math.pow(Math.max(0, tt - 5), 1.15) * 0.2 + (noise1(x * 0.07 + z * 0.13) - 0.3) * Math.min(tt, 10) * 0.25;
    // Deniz arka planı: kıyıdan aşağı iner
    let shore;
    if (x > 153) shore = y0 - smoothstep(6, 11, t) * 7.5 - t * 0.05; // ada uçurumu
    else if (x < -138) shore = y0 - t * 0.35;
    else shore = y0 - t * 0.28 - Math.max(0, t - 3) * 0.12;
    y = lerp(hills, shore, sw);
  }
  // iskele: altında su
  const dw = Math.max(dockWeight(x), channelWeight(x));
  if (dw > 0) y = lerp(y, -2.6 - Math.abs(z) * 0.02, dw);
  return y;
}

const C = {
  cobble: new THREE.Color('#77706a'), cobble2: new THREE.Color('#6a645e'),
  grass: new THREE.Color('#577d3e'), grassDark: new THREE.Color('#3e6531'), forest: new THREE.Color('#355a2c'),
  dirt: new THREE.Color('#6a5038'), sand: new THREE.Color('#d6bf8e'), sandWet: new THREE.Color('#a18d68'),
  rock: new THREE.Color('#7a7c80'), rockDark: new THREE.Color('#5d5f64'), gravel: new THREE.Color('#6e6862'),
  rust: new THREE.Color('#6a5244'), seabed: new THREE.Color('#2f4544'), hill: new THREE.Color('#4c7238'),
};

function colorFor(x, z, y, out) {
  const zone = zoneAt(x);
  const n = hash2(Math.round(x * 1.3), Math.round(z * 1.7));
  const path = Math.abs(z) < 2.0;
  switch (zone.id) {
    case 'kasaba':
      if (path) out.copy(n > 0.5 ? C.cobble : C.cobble2);
      else out.copy(z < 0 ? C.hill : C.grass).lerp(C.grassDark, n * 0.5);
      break;
    case 'orman':
      if (path) out.copy(C.dirt).lerp(C.grassDark, n * 0.4);
      else out.copy(C.forest).lerp(C.grass, n * 0.5);
      break;
    case 'tersane':
      if (path) out.copy(C.gravel).lerp(C.rust, n * 0.5);
      else out.copy(C.rust).lerp(C.gravel, n);
      break;
    case 'sahil':
      out.copy(C.sand).lerp(C.sandWet, smoothstep(0.3, -0.6, y) * 0.9 + n * 0.08);
      if (z > 4) out.lerp(C.grass, smoothstep(4, 7, z) * 0.5);
      break;
    case 'iskele':
      out.copy(C.seabed);
      if (x < 11 || x > 41) out.copy(C.sand).lerp(C.sandWet, 0.5);
      break;
    case 'bogaz':
      out.copy(C.seabed).lerp(C.sandWet, n * 0.3);
      break;
    case 'fener':
      if (y > 2.4) out.copy(C.grass).lerp(C.grassDark, n * 0.4).lerp(C.rock, n > 0.78 ? 0.75 : 0.12);
      else out.copy(C.rock).lerp(C.rockDark, n * 0.6);
      if (x < 159 && y < 2) out.lerp(C.sand, 0.45);
      break;
  }
  // geçişleri yumuşat (komşu bölgeye yakınsa karıştır)
  if (y < SEA_LEVEL - 0.3) out.lerp(C.seabed, smoothstep(SEA_LEVEL - 0.3, SEA_LEVEL - 2, y));
  return out;
}

export function buildTerrain() {
  const xs = [];
  for (let x = -222; x <= 216; x += 0.8) xs.push(x);
  const zs = [22, 16, 12, 9, 6.5, 4.5, 3.2, 2.4, 1.2, 0, -1.2, -2.2, -3.2, -4.5, -6, -8, -10.5, -13.5, -17, -22, -28, -36, -46];
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = xs[i] + (j > 12 ? (hash2(i, j) - 0.5) * 0.4 : 0);
      const z = zs[j];
      let y = terrainHeight(x, z);
      if (j === 0) y -= 3; // ön etek
      const k = (i * nz + j) * 3;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      colorFor(x, z, y, c);
      const v = 0.92 + hash2(i * 3, j * 7) * 0.12;
      col[k] = c.r * v; col[k + 1] = c.g * v; col[k + 2] = c.b * v;
    }
  }
  const idx = [];
  for (let i = 0; i < nx - 1; i++) {
    for (let j = 0; j < nz - 1; j++) {
      const a = i * nz + j, b = (i + 1) * nz + j, c2 = (i + 1) * nz + j + 1, d = i * nz + j + 1;
      idx.push(a, b, d, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  m.receiveShadow = true;
  return m;
}

export function surfaceAt(x) {
  const z = zoneAt(x);
  if (z.id === 'iskele' && x > 9.6 && x < 42.4) return 'wood';
  if ((x > PIER_A.from && x < PIER_A.to + 0.5) || (x > PIER_B.from - 0.5 && x < PIER_B.to)) return 'wood';
  return z.surface;
}

export { clamp };
