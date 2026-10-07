// Fenerin içine yerleştirilebilen mobilyalar (modeller + tanımlar)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat } from './models.js';

const sm = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
function rb(g, w, h, d, r, m, x, y, z) {
  const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), typeof m === 'string' ? sm(m) : m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
}
function cy(g, rt, rbm, h, m, x, y, z, seg = 12) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbm, h, seg), typeof m === 'string' ? sm(m) : m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
}

const WOOD = '#8a5e3a', WOOD_D = '#5e3e24', WOOD_L = '#b08458';

export const FURNITURE = {
  sandalye: {
    w: 0.7, d: 0.7, block: true, make() {
      const g = new THREE.Group();
      rb(g, 0.6, 0.08, 0.6, 0.03, WOOD, 0, 0.48, 0);
      for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) rb(g, 0.06, 0.48, 0.06, 0.02, WOOD_D, x, 0.24, z);
      rb(g, 0.6, 0.55, 0.06, 0.03, WOOD, 0, 0.8, -0.27);
      rb(g, 0.5, 0.06, 0.5, 0.03, '#a83a30', 0, 0.54, 0.02);
      return g;
    },
  },
  masa: {
    w: 1.7, d: 1.0, block: true, make() {
      const g = new THREE.Group();
      rb(g, 1.7, 0.08, 1.0, 0.03, WOOD_L, 0, 0.78, 0);
      for (const [x, z] of [[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]]) rb(g, 0.08, 0.76, 0.08, 0.02, WOOD_D, x, 0.38, z);
      rb(g, 0.9, 0.02, 0.6, 0.01, '#e8dcc0', 0.1, 0.83, 0); // örtü
      cy(g, 0.08, 0.06, 0.18, '#d8d0c0', -0.4, 0.92, 0.1, 10); // kupa
      return g;
    },
  },
  hali: {
    w: 2.4, d: 1.6, block: false, make() {
      const g = new THREE.Group();
      const c = document.createElement('canvas'); c.width = 128; c.height = 96;
      const x = c.getContext('2d');
      x.fillStyle = '#7a2e2a'; x.fillRect(0, 0, 128, 96);
      x.strokeStyle = '#d8b878'; x.lineWidth = 5; x.strokeRect(8, 8, 112, 80);
      x.strokeStyle = '#2a4a5a'; x.lineWidth = 3; x.strokeRect(18, 18, 92, 60);
      for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#d8b878' : '#2a4a5a'; x.beginPath(); x.arc(32 + i * 13, 48, 4, 0, 7); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 1.6), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
      m.position.y = 0.02; m.receiveShadow = true; g.add(m);
      return g;
    },
  },
  saksi: {
    w: 0.7, d: 0.7, block: true, make() {
      const g = new THREE.Group();
      cy(g, 0.26, 0.2, 0.42, '#b8643a', 0, 0.21, 0);
      cy(g, 0.24, 0.24, 0.04, '#4a3020', 0, 0.42, 0);
      const leaf = mat('#4f8a3c');
      for (let i = 0; i < 7; i++) {
        const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + (i % 3) * 0.05, 0), leaf);
        const a = i * 0.9; l.position.set(Math.cos(a) * 0.15, 0.6 + (i % 3) * 0.14, Math.sin(a) * 0.15); l.castShadow = true; g.add(l);
      }
      return g;
    },
  },
  kitaplik: {
    w: 1.6, d: 0.55, block: true, make() {
      const g = new THREE.Group();
      rb(g, 1.6, 2.0, 0.08, 0.02, WOOD_D, 0, 1.0, -0.24);
      for (const x of [-0.78, 0.78]) rb(g, 0.06, 2.0, 0.5, 0.02, WOOD, x, 1.0, 0);
      for (let i = 0; i < 4; i++) rb(g, 1.56, 0.05, 0.5, 0.02, WOOD, 0, 0.1 + i * 0.6, 0);
      const cols = ['#7a2a2a', '#2a4a6a', '#5a6a2a', '#8a6a2a', '#4a2a5a', '#2a5a5a'];
      for (let s = 0; s < 3; s++) for (let i = 0; i < 9; i++) {
        if ((i + s) % 5 === 4) continue;
        rb(g, 0.13, 0.4 + ((i * 7 + s) % 3) * 0.06, 0.36, 0.01, cols[(i + s * 2) % 6], -0.62 + i * 0.155, 0.35 + s * 0.6, 0.02);
      }
      return g;
    },
  },
  gaz_lambasi: {
    w: 0.6, d: 0.6, block: true, light: '#ffb060', make() {
      const g = new THREE.Group();
      cy(g, 0.2, 0.26, 0.1, '#2a2a2e', 0, 0.05, 0);
      cy(g, 0.03, 0.03, 1.1, '#2a2a2e', 0, 0.6, 0, 6);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffb050', emissiveIntensity: 2.2 }));
      glass.position.y = 1.25; g.add(glass);
      cy(g, 0.18, 0.12, 0.08, '#2a2a2e', 0, 1.44, 0);
      return g;
    },
  },
  kabuk_rafi: {
    w: 1.0, d: 0.45, block: true, make() {
      const g = new THREE.Group();
      rb(g, 1.0, 1.1, 0.4, 0.04, WOOD_L, 0, 0.55, 0);
      for (let s = 0; s < 3; s++) for (let i = 0; i < 4; i++) {
        const sh = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 6), sm(['#f0d8c8', '#e8b8a0', '#fff0e0', '#d8c0e0'][(i + s) % 4]));
        sh.position.set(-0.32 + i * 0.21, 0.3 + s * 0.33, 0.21); sh.rotation.x = Math.PI / 2; g.add(sh);
      }
      return g;
    },
  },
  gemi_maketi: {
    w: 0.8, d: 0.5, block: true, make() {
      const g = new THREE.Group();
      rb(g, 0.8, 0.7, 0.5, 0.04, WOOD_D, 0, 0.35, 0);
      const hull = rb(g, 0.6, 0.12, 0.16, 0.05, '#3a2a1a', 0, 0.8, 0);
      hull.scale.z = 0.9;
      for (const x of [-0.15, 0.08]) {
        cy(g, 0.01, 0.01, 0.42, '#3a2a1a', x, 1.05, 0, 4);
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22), new THREE.MeshStandardMaterial({ color: '#f0e8d8', side: THREE.DoubleSide }));
        sail.position.set(x, 1.05, 0); sail.rotation.y = Math.PI / 2; g.add(sail);
      }
      return g;
    },
  },
  fici: {
    w: 0.7, d: 0.7, block: true, make() {
      const g = new THREE.Group();
      cy(g, 0.3, 0.3, 0.85, '#7a5032', 0, 0.42, 0, 14);
      for (const y of [0.18, 0.66]) cy(g, 0.32, 0.32, 0.05, '#3a3a3e', 0, y, 0, 14);
      cy(g, 0.28, 0.28, 0.02, '#5a3a22', 0, 0.86, 0, 14);
      return g;
    },
  },
  koltuk: {
    w: 1.6, d: 0.9, block: true, make() {
      const g = new THREE.Group();
      const fab = sm('#5a7a8a', { roughness: 0.95 });
      rb(g, 1.6, 0.36, 0.85, 0.12, fab, 0, 0.34, 0.03);
      rb(g, 1.6, 0.6, 0.24, 0.1, fab, 0, 0.7, -0.33);
      for (const x of [-0.72, 0.72]) rb(g, 0.2, 0.5, 0.85, 0.08, fab, x, 0.5, 0.03);
      rb(g, 0.6, 0.12, 0.6, 0.05, '#c8a060', -0.3, 0.56, 0.05);
      for (const [x, z] of [[-0.7, 0.35], [0.7, 0.35], [-0.7, -0.35], [0.7, -0.35]]) cy(g, 0.04, 0.03, 0.14, WOOD_D, x, 0.07, z, 6);
      return g;
    },
  },
  akvaryum: {
    w: 1.4, d: 0.6, block: true, anim: 'fish', make() {
      const g = new THREE.Group();
      rb(g, 1.4, 0.7, 0.6, 0.04, WOOD_D, 0, 0.35, 0);
      const water = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 0.5), new THREE.MeshStandardMaterial({ color: '#4aa0c0', transparent: true, opacity: 0.45, roughness: 0.05, emissive: '#103848', emissiveIntensity: 0.6 }));
      water.position.y = 1.0; g.add(water);
      const fish = new THREE.Group(); fish.position.y = 1.0; g.add(fish);
      const fc = ['#ff8a3a', '#f0d040', '#3ad0c0'];
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), sm(fc[i % 3], { emissive: fc[i % 3], emissiveIntensity: 0.3 }));
        f.rotation.z = Math.PI / 2; f.userData.ph = i * 1.7; fish.add(f);
      }
      g.userData.fish = fish;
      for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), sm('#3a8a4a')); w.position.set(-0.4 + i * 0.35, 0.85, -0.1); g.add(w); }
      return g;
    },
  },
  gramofon: {
    w: 0.7, d: 0.7, block: true, music: true, make() {
      const g = new THREE.Group();
      rb(g, 0.6, 0.7, 0.6, 0.05, WOOD, 0, 0.35, 0);
      rb(g, 0.5, 0.12, 0.5, 0.03, WOOD_D, 0, 0.76, 0);
      cy(g, 0.2, 0.2, 0.02, '#1a1a1a', 0, 0.83, 0, 16);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 14, 1, true), sm('#c8a040', { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
      horn.position.set(0.05, 1.15, -0.1); horn.rotation.set(-0.5, 0, 0.3); g.add(horn);
      cy(g, 0.02, 0.02, 0.35, '#c8a040', 0.12, 0.95, 0.05, 5);
      return g;
    },
  },
  fener_maketi: {
    w: 0.6, d: 0.6, block: true, light: '#fff0c0', make() {
      const g = new THREE.Group();
      cy(g, 0.26, 0.3, 0.1, '#5a5048', 0, 0.05, 0);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.0, 12), [sm('#ece6dc')][0]);
      t.position.y = 0.6; t.castShadow = true; g.add(t);
      for (const y of [0.3, 0.7]) cy(g, 0.185 - (y - 0.1) * 0.08, 0.19 - (y - 0.1) * 0.08, 0.14, '#a83a30', 0, y, 0);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: '#ffe0a0', emissiveIntensity: 2.5 }));
      l.position.y = 1.18; g.add(l);
      cy(g, 0.01, 0.14, 0.14, '#8a2a24', 0, 1.33, 0, 10);
      return g;
    },
  },
  tablo: {
    w: 0.8, d: 0.6, block: true, make() {
      const g = new THREE.Group();
      for (const x of [-0.25, 0.25]) { const l = rb(g, 0.05, 1.4, 0.05, 0.02, WOOD_D, x, 0.7, 0.1); l.rotation.x = -0.12; }
      const c = document.createElement('canvas'); c.width = 96; c.height = 72;
      const x = c.getContext('2d');
      const grd = x.createLinearGradient(0, 0, 0, 72); grd.addColorStop(0, '#f0a070'); grd.addColorStop(0.55, '#5a7ab0'); grd.addColorStop(0.56, '#2a4a6a'); grd.addColorStop(1, '#1a2a3a');
      x.fillStyle = grd; x.fillRect(0, 0, 96, 72);
      x.fillStyle = '#ece6dc'; x.fillRect(66, 22, 6, 20); x.fillStyle = '#a83a30'; x.fillRect(66, 28, 6, 4); x.fillRect(66, 36, 6, 4);
      x.fillStyle = '#ffe9a0'; x.fillRect(65, 18, 8, 4);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      rb(g, 0.74, 0.58, 0.05, 0.02, '#c8a040', 0, 1.15, 0.05);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.48), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
      p.position.set(0, 1.15, 0.08); g.add(p);
      g.rotation.x = 0;
      return g;
    },
  },
};

// Hayalet (yerleştirme önizlemesi) malzemesi uygula
export function ghostify(g, ok) {
  const m = new THREE.MeshBasicMaterial({ color: ok ? '#7cf09a' : '#f07a6a', transparent: true, opacity: 0.45, depthWrite: false });
  g.traverse(o => { if (o.isMesh) { o.material = m; o.castShadow = false; } });
  return m;
}
