// Prosedürel low-poly model fabrikası. Hiçbir harici model/doku kullanılmaz.
import * as THREE from 'three';
import { hash2, randRange } from '../core/utils.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.88, metalness: 0, ...opts });
    matCache.set(key, m);
  }
  return m;
}

// Gece yanan pencere ve lamba malzemeleri (env tarafından parlaklıkları ayarlanır)
export const WINDOW_MATS = [0, 1, 2].map(i => new THREE.MeshStandardMaterial({
  color: '#1c2230', emissive: new THREE.Color(['#ffb35c', '#ffc77a', '#ff9f4a'][i]), emissiveIntensity: 0, roughness: 0.3, flatShading: true,
}));
export const LAMP_MAT = new THREE.MeshStandardMaterial({ color: '#3a3020', emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 0, roughness: 0.4 });
export const GLOW_MAT = new THREE.MeshBasicMaterial({ color: '#ffd38a' });

function shade(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; return m; }

export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y, z);
  return shade(m);
}

export function cyl(rt, rb, h, color, seg = 8, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y, z);
  return shade(m);
}

// Yüz bazlı renklendirme (düz gölgeli vertex color)
export function colorizeFaces(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) { v.x += pos.getX(i + k) / 3; v.y += pos.getY(i + k) / 3; v.z += pos.getZ(i + k) / 3; }
    c.set(fn(v));
    for (let k = 0; k < 3; k++) { colors[(i + k) * 3] = c.r; colors[(i + k) * 3 + 1] = c.g; colors[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

export function roofGeo(w, d, h, over = 0.35) {
  const W = w / 2 + over, D = d / 2 + over;
  const s = new THREE.Shape();
  s.moveTo(-D, 0); s.lineTo(D, 0); s.lineTo(0, h); s.lineTo(-D, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2 * W, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-W, 0, 0);
  return g;
}

export function textTexture(text, { w = 512, h = 128, bg = '#3b2a1e', fg = '#f0dfba', font = 'bold 62px Georgia', border = '#1e140c' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  if (border) { x.strokeStyle = border; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10); }
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeSign(text, w = 2.6, h = 0.6, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [
    mat('#2a1d12'), mat('#2a1d12'), mat('#2a1d12'), mat('#2a1d12'),
    new THREE.MeshStandardMaterial({ map: textTexture(text, opts), roughness: 0.8 }), mat('#2a1d12'),
  ]);
  return shade(m);
}

function addWindow(g, x, y, z, w = 0.9, h = 1.1, matIdx = 0, trim = '#e8e0d0', rotY = 0) {
  const wg = new THREE.Group();
  wg.add(box(w + 0.2, h + 0.2, 0.08, trim, 0, 0, 0));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), WINDOW_MATS[matIdx % 3]);
  glass.position.z = 0.05;
  wg.add(glass);
  wg.add(box(0.06, h, 0.04, trim, 0, 0, 0.07));
  wg.add(box(w, 0.06, 0.04, trim, 0, 0, 0.07));
  wg.position.set(x, y, z); wg.rotation.y = rotY;
  g.add(wg);
  return glass;
}

export function makeHouse({ w = 6, h = 4, d = 5, wall = '#c9b79c', roof = '#7a3b2e', trim = '#efe6d6', door = '#4a3020', chimney = true, seed = 0 } = {}) {
  const g = new THREE.Group();
  g.add(box(w, h, d, wall, 0, h / 2, 0));
  g.add(box(w + 0.15, 0.35, d + 0.15, '#5a5048', 0, 0.17, 0));
  const r = shade(new THREE.Mesh(roofGeo(w, d, h * 0.5), mat(roof)));
  r.position.y = h; g.add(r);
  g.add(box(w + 0.8, 0.15, 0.15, '#3a2a22', 0, h, d / 2 + 0.3));
  g.add(box(1.0, 1.95, 0.12, door, -w * 0.22, 0.98, d / 2 + 0.06));
  g.add(box(1.25, 0.12, 0.3, trim, -w * 0.22, 2.0, d / 2 + 0.12));
  const wins = [];
  wins.push(addWindow(g, w * 0.2, h * 0.52, d / 2 + 0.02, 0.9, 1.0, seed));
  if (w > 5.5) wins.push(addWindow(g, w * 0.4, h * 0.52, d / 2 + 0.02, 0.7, 1.0, seed + 1));
  if (h > 4.5) wins.push(addWindow(g, -w * 0.22, h * 0.82, d / 2 + 0.02, 0.8, 0.8, seed + 2));
  // çatı penceresi / baca
  if (chimney) {
    g.add(box(0.6, 1.6, 0.6, '#6a5a50', w * 0.28, h + 0.9, -d * 0.15));
    g.add(box(0.75, 0.15, 0.75, '#4a3a32', w * 0.28, h + 1.75, -d * 0.15));
  }
  // saksı
  g.add(box(0.8, 0.3, 0.3, '#7a4a32', w * 0.2, h * 0.52 - 0.7, d / 2 + 0.2));
  g.add(box(0.7, 0.2, 0.25, '#4f7a3c', w * 0.2, h * 0.52 - 0.47, d / 2 + 0.2));
  return { group: g, windows: wins };
}

// Önü açık (kesit) dükkân — içi görünür
export function makeShop({ w = 8, h = 4.2, d = 5, wall = '#d8c8a8', roof = '#3d5a6a', sign = 'DÜKKAN', kind = 'market', signColor = '#3b2a1e' } = {}) {
  const g = new THREE.Group();
  const inner = '#8a6a4a', floorC = '#6a4a32';
  g.add(box(w, 0.2, d, floorC, 0, 0.1, 0));
  g.add(box(w, h, 0.3, wall, 0, h / 2, -d / 2 + 0.15));
  g.add(box(0.3, h, d, wall, -w / 2 + 0.15, h / 2, 0));
  g.add(box(0.3, h, d, wall, w / 2 - 0.15, h / 2, 0));
  g.add(box(w - 0.6, h - 0.2, 0.1, inner, 0, h / 2, -d / 2 + 0.35)); // iç duvar
  // ön çerçeve
  g.add(box(0.5, h, 0.5, wall, -w / 2 + 0.25, h / 2, d / 2 - 0.25));
  g.add(box(0.5, h, 0.5, wall, w / 2 - 0.25, h / 2, d / 2 - 0.25));
  g.add(box(w, 0.9, 0.5, wall, 0, h - 0.45, d / 2 - 0.25));
  const r = shade(new THREE.Mesh(roofGeo(w, d, h * 0.45), mat(roof)));
  r.position.y = h; g.add(r);
  const s = makeSign(sign, Math.min(w * 0.55, 4.2), 0.7, { bg: signColor });
  s.position.set(0, h - 0.45, d / 2 + 0.03); g.add(s);
  // tente
  const awn = box(w - 0.4, 0.08, 1.2, roof, 0, h - 1.0, d / 2 + 0.5); awn.rotation.x = 0.35; g.add(awn);
  const wins = [];
  wins.push(addWindow(g, -w / 2 + 1.4, h * 0.62, -d / 2 + 0.42, 0.9, 0.9, 1, '#5a4030'));
  // iç mekân
  if (kind === 'market') {
    g.add(box(w * 0.55, 1.0, 0.8, '#7a5a3a', 0.4, 0.6, 0.2));
    for (let i = 0; i < 3; i++) {
      g.add(box(w * 0.75, 0.08, 0.6, '#5a3a22', 0, 1.3 + i * 0.75, -d / 2 + 0.75));
      for (let k = 0; k < 7; k++) {
        const col = ['#c84', '#4a8', '#c55', '#58c', '#cb5', '#a6c', '#6a4'][(k + i * 2) % 7];
        g.add(box(0.32, 0.4, 0.3, col, -w * 0.33 + k * w * 0.11, 1.55 + i * 0.75, -d / 2 + 0.75));
      }
    }
    for (let k = 0; k < 3; k++) g.add(box(0.7, 0.6, 0.6, '#8a6a3a', -w / 2 + 1 + k * 0.9, 0.5, d / 2 - 1));
    g.add(box(0.5, 0.3, 0.5, '#d33', -w / 2 + 1, 0.95, d / 2 - 1));
    g.add(box(0.5, 0.3, 0.5, '#e93', -w / 2 + 1.9, 0.95, d / 2 - 1));
  } else if (kind === 'bar') {
    g.add(box(w * 0.5, 1.1, 0.7, '#4a2a18', -w * 0.12, 0.65, -0.3));
    g.add(box(w * 0.52, 0.08, 0.85, '#2a1a10', -w * 0.12, 1.24, -0.3));
    for (let i = 0; i < 2; i++) g.add(box(w * 0.6, 0.06, 0.4, '#3a2214', -w * 0.1, 1.8 + i * 0.6, -d / 2 + 0.6));
    for (let k = 0; k < 9; k++) g.add(cyl(0.07, 0.08, 0.38, ['#2a5a2a', '#6a2a2a', '#c8a050'][k % 3], 6, -w * 0.38 + k * 0.38, 2.04 + (k % 2) * 0.6, -d / 2 + 0.6));
    // masalar
    for (const tx of [w * 0.28, -w * 0.38]) {
      g.add(cyl(0.6, 0.6, 0.08, '#5a3a22', 10, tx, 0.95, 0.9));
      g.add(cyl(0.08, 0.1, 0.9, '#3a2214', 6, tx, 0.5, 0.9));
    }
    // fıçı
    g.add(cyl(0.45, 0.45, 1.0, '#6a4a2a', 10, w / 2 - 0.9, 0.7, -d / 2 + 1));
  } else if (kind === 'atolye') {
    g.add(box(w * 0.5, 0.9, 1.1, '#6a5a4a', 0.6, 0.55, -0.2));
    g.add(box(0.5, 0.35, 0.4, '#555', 0.9, 1.2, -0.2));
    g.add(cyl(0.25, 0.25, 0.12, '#888', 10, -0.2, 1.08, -0.2));
    // alet panosu
    g.add(box(w * 0.6, 1.6, 0.06, '#8a7050', 0, 2.3, -d / 2 + 0.45));
    for (let k = 0; k < 6; k++) g.add(box(0.08, 0.7, 0.05, '#444', -w * 0.22 + k * 0.5, 2.3, -d / 2 + 0.5));
    g.add(cyl(0.4, 0.5, 0.8, '#3a3a3a', 8, -w / 2 + 1, 0.6, -d / 2 + 1.2)); // örs
    g.add(box(1.3, 0.9, 0.9, '#5a3a2a', w / 2 - 1.2, 0.55, 0.6));
  } else if (kind === 'belediye') {
    g.add(box(w * 0.4, 0.9, 1.0, '#5a3a22', 0.6, 0.55, -0.4));
    g.add(box(0.4, 0.3, 0.3, '#ddd', 0.9, 1.15, -0.4));
    for (let i = 0; i < 4; i++) g.add(box(0.7, 2.6, 0.5, '#4a3020', -w / 2 + 0.8 + i * 0.75, 1.5, -d / 2 + 0.6));
    // duvardaki fotoğraf
    g.add(box(1.2, 0.8, 0.05, '#2a1a10', w * 0.25, 2.6, -d / 2 + 0.42));
    g.add(box(1.0, 0.62, 0.05, '#b8a888', w * 0.25, 2.6, -d / 2 + 0.45));
    // bayrak direği
    g.add(cyl(0.05, 0.05, 3, '#ccc', 6, w / 2 + 0.5, h + 1.5, d / 2 - 0.5));
    g.add(box(1.0, 0.6, 0.03, '#b33', w / 2 + 1.0, h + 2.6, d / 2 - 0.5));
  }
  return { group: g, windows: wins, lightLocal: new THREE.Vector3(0, h - 1.2, 0.3) };
}

export function makeChurch() {
  const g = new THREE.Group();
  const wall = '#b8b0a4', roof = '#4a4a55';
  g.add(box(8, 5, 7, wall, 0, 2.5, 0));
  const r = shade(new THREE.Mesh(roofGeo(8, 7, 3.2), mat(roof))); r.position.y = 5; g.add(r);
  // kule
  g.add(box(2.8, 11, 2.8, wall, -3.2, 5.5, 1.2));
  g.add(box(3.1, 0.3, 3.1, '#8a8278', -3.2, 8.2, 1.2));
  const spire = shade(new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.5, 4), mat(roof)));
  spire.position.set(-3.2, 13.25, 1.2); spire.rotation.y = Math.PI / 4; g.add(spire);
  // çan
  g.add(box(1.4, 1.8, 3.0, '#222', -3.2, 9.5, 1.2));
  const bell = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 0.8, 8), mat('#a07a3a', { metalness: 0.6, roughness: 0.4 })));
  bell.position.set(-3.2, 9.5, 2.5); g.add(bell);
  // kapı ve gül pencere
  g.add(box(1.6, 2.8, 0.15, '#3a2214', 1.0, 1.4, 3.55));
  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.9, 10), WINDOW_MATS[2]);
  rose.position.set(1.0, 3.9, 3.53); g.add(rose);
  const wins = [rose];
  wins.push(addWindow(g, 3.2, 2.6, 3.52, 0.6, 1.6, 1, '#8a8278'));
  wins.push(addWindow(g, -3.2, 5.0, 2.63, 0.5, 1.0, 0, '#8a8278'));
  // haç
  g.add(box(0.12, 1.0, 0.12, '#333', -3.2, 16.0, 1.2));
  g.add(box(0.6, 0.12, 0.12, '#333', -3.2, 16.2, 1.2));
  return { group: g, windows: wins };
}

export function makeLighthouse() {
  const g = new THREE.Group();
  // taş kaide
  const baseGeo = colorizeFaces(new THREE.CylinderGeometry(3.0, 3.4, 1.6, 12), v => hash2(Math.round(v.x * 3), Math.round(v.z * 3)) > 0.5 ? '#7e7a74' : '#6e6a64');
  g.add(shade(new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }))));
  g.children[0].position.y = 0.8;
  // kule (şeritli)
  const H = 15;
  const towerGeo = colorizeFaces(new THREE.CylinderGeometry(1.45, 2.3, H, 16, 10), v => {
    const band = Math.floor((v.y + H / 2) / (H / 5));
    return band % 2 === 0 ? '#ece6dc' : '#a83a30';
  });
  const tower = shade(new THREE.Mesh(towerGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75 })));
  tower.position.y = 1.6 + H / 2; g.add(tower);
  const topY = 1.6 + H;
  // galeri
  g.add(cyl(2.2, 2.2, 0.3, '#2a2a2e', 16, 0, topY + 0.15, 0));
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    g.add(cyl(0.04, 0.04, 0.9, '#2a2a2e', 4, Math.cos(a) * 2.1, topY + 0.75, Math.sin(a) * 2.1));
  }
  const rail = shade(new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.05, 4, 24), mat('#2a2a2e')));
  rail.rotation.x = Math.PI / 2; rail.position.y = topY + 1.2; g.add(rail);
  // lamba odası (cam)
  const glassMat = new THREE.MeshStandardMaterial({ color: '#9fc4d0', emissive: new THREE.Color('#fff2c0'), emissiveIntensity: 0.0, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 2.0, 12, 1, true), glassMat);
  glass.position.y = topY + 1.3; g.add(glass);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.add(box(0.08, 2.0, 0.08, '#1a1a1e', Math.cos(a) * 1.27, topY + 1.3, Math.sin(a) * 1.27));
  }
  const lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ color: '#3a3020' }));
  lampCore.position.y = topY + 1.3; g.add(lampCore);
  g.add(cyl(1.5, 1.5, 0.2, '#2a1a1a', 12, 0, topY + 2.35, 0));
  const cap = shade(new THREE.Mesh(new THREE.ConeGeometry(1.55, 1.5, 12), mat('#8a2a24')));
  cap.position.y = topY + 3.2; g.add(cap);
  g.add(cyl(0.18, 0.18, 0.3, '#2a2a2e', 8, 0, topY + 4.05, 0));
  const ball = shade(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat('#2a2a2e'))); ball.position.y = topY + 4.3; g.add(ball);
  // kapı
  g.add(box(1.1, 2.1, 0.4, '#3a2a1e', 0, 2.65, 2.15));
  g.add(box(1.4, 0.2, 0.5, '#5a5048', 0, 3.8, 2.15));
  // pencereler
  const wins = [];
  for (const [y, a] of [[6, 0.35], [10, -0.3], [13.5, 0.2]]) {
    const r = 2.3 - (y - 1.6) / H * 0.85 + 0.02;
    wins.push(addWindow(g, Math.sin(a) * r, y, Math.cos(a) * r, 0.45, 0.75, 0, '#2a2a2e', a));
  }
  return { group: g, lampY: topY + 1.3, glassMat, lampCore, windows: wins };
}

const PINE_COLS = ['#2f5a36', '#284e30', '#365f3a', '#2a523a'];
export function makePine(h = 5, seed = 0) {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.24, h * 0.3, '#4a3424', 6, 0, h * 0.15, 0));
  const col = PINE_COLS[Math.abs(Math.floor(seed * 7)) % PINE_COLS.length];
  for (let i = 0; i < 3; i++) {
    const r = (1.5 - i * 0.38) * h / 5, ch = h * 0.38;
    const c = shade(new THREE.Mesh(new THREE.ConeGeometry(r, ch, 7), mat(col)));
    c.position.y = h * 0.3 + i * h * 0.2 + ch / 2 - 0.2; c.rotation.y = seed + i;
    g.add(c);
  }
  return g;
}

const LEAF_COLS = ['#4f7a3a', '#5a8a40', '#45703a', '#6a8a3a'];
export function makeTree(h = 4, seed = 0) {
  const g = new THREE.Group();
  g.add(cyl(0.14, 0.24, h * 0.5, '#5a4030', 6, 0, h * 0.25, 0));
  const col = LEAF_COLS[Math.abs(Math.floor(seed * 13)) % LEAF_COLS.length];
  for (let i = 0; i < 3; i++) {
    const s = shade(new THREE.Mesh(new THREE.IcosahedronGeometry(h * (0.32 - i * 0.04), 0), mat(col)));
    s.position.set((i - 1) * h * 0.15, h * (0.6 + (i % 2) * 0.12), (i % 2) * 0.3);
    s.rotation.set(seed, seed * 2 + i, 0);
    g.add(s);
  }
  return g;
}

export function makeBush(s = 1, color = '#4a7a3a') {
  const m = shade(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 * s, 0), mat(color)));
  m.scale.y = 0.7; m.position.y = 0.3 * s;
  return m;
}

export function rockGeo(r = 1, seed = 0) {
  const g = new THREE.DodecahedronGeometry(r, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.8 + hash2(Math.round(x * 10) + seed, Math.round(y * 10) + Math.round(z * 10) * 3) * 0.4;
    p.setXYZ(i, x * k, y * k * 0.75, z * k);
  }
  g.computeVertexNormals();
  return g;
}
export function makeRock(r = 1, color = '#7a7a7e', seed = 0) {
  const m = shade(new THREE.Mesh(rockGeo(r, seed), mat(color)));
  m.rotation.y = seed;
  return m;
}

export function makeGrassTuft(color = '#5a8a3a') {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5 + Math.random() * 0.3, 3), mat(color));
    b.position.set(randRange(-0.15, 0.15), 0.25, randRange(-0.1, 0.1));
    b.rotation.z = randRange(-0.3, 0.3);
    g.add(b);
  }
  return g;
}

export function makeLampPost() {
  const g = new THREE.Group();
  g.add(cyl(0.07, 0.1, 3.4, '#1e1e22', 6, 0, 1.7, 0));
  g.add(box(0.7, 0.06, 0.06, '#1e1e22', 0.3, 3.3, 0));
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), LAMP_MAT);
  lamp.position.set(0.6, 3.05, 0); g.add(lamp);
  g.add(box(0.36, 0.06, 0.36, '#1e1e22', 0.6, 3.28, 0));
  return { group: g, bulb: new THREE.Vector3(0.6, 3.0, 0) };
}

export function makeBench() {
  const g = new THREE.Group();
  g.add(box(1.8, 0.08, 0.5, '#6a4a2a', 0, 0.5, 0));
  g.add(box(1.8, 0.4, 0.06, '#6a4a2a', 0, 0.75, -0.24));
  for (const x of [-0.75, 0.75]) g.add(box(0.08, 0.5, 0.45, '#2a2a2a', x, 0.25, 0));
  return g;
}

export function makeCrate(s = 0.8, color = '#8a6a42') {
  const g = new THREE.Group();
  g.add(box(s, s, s, color, 0, s / 2, 0));
  g.add(box(s + 0.02, 0.08, s + 0.02, '#5a4028', 0, s * 0.8, 0));
  g.add(box(s + 0.02, 0.08, s + 0.02, '#5a4028', 0, s * 0.2, 0));
  return g;
}

export function makeBarrel(color = '#6a4a2a') {
  const g = new THREE.Group();
  g.add(cyl(0.4, 0.36, 1.0, color, 10, 0, 0.5, 0));
  g.add(cyl(0.42, 0.42, 0.06, '#333', 10, 0, 0.25, 0));
  g.add(cyl(0.42, 0.42, 0.06, '#333', 10, 0, 0.75, 0));
  return g;
}

export function makeFence(len = 4, color = '#7a6a52') {
  const g = new THREE.Group();
  const n = Math.ceil(len / 1.2);
  for (let i = 0; i <= n; i++) g.add(box(0.12, 1.0, 0.12, color, -len / 2 + i * len / n, 0.5, 0));
  g.add(box(len, 0.08, 0.06, color, 0, 0.75, 0));
  g.add(box(len, 0.08, 0.06, color, 0, 0.4, 0));
  return g;
}

export function hullGeo(L = 5, W = 1.8, H = 1.0) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, H);
  s.lineTo(L / 2 + 0.3, H + 0.15);
  s.quadraticCurveTo(L / 2 - 0.1, 0.25, L / 2 - 0.9, 0);
  s.lineTo(-L / 2 + 0.3, 0);
  s.lineTo(-L / 2, H);
  const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -W / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const bow = Math.max(0, (x - (L / 2 - 1.8)) / 2.1);
    const keel = 1 - (1 - Math.min(1, y / H)) * 0.45;
    p.setZ(i, p.getZ(i) * Math.max(0.05, 1 - bow) * keel);
  }
  g.computeVertexNormals();
  return g;
}

export function makeBoat({ L = 5, W = 1.8, color = '#b84a3a', cabin = true, mast = false } = {}) {
  const g = new THREE.Group();
  const hull = shade(new THREE.Mesh(hullGeo(L, W, 1.0), mat(color)));
  g.add(hull);
  g.add(box(L * 0.92, 0.08, W * 0.8, '#7a5a3a', -0.1, 0.92, 0));
  g.add(box(L, 0.12, 0.08, '#eee', 0, 0.98, W * 0.47));
  if (cabin) {
    g.add(box(1.4, 1.1, W * 0.7, '#e8e0d0', -L * 0.18, 1.5, 0));
    g.add(box(1.6, 0.12, W * 0.8, '#4a4a55', -L * 0.18, 2.1, 0));
    addWindow(g, -L * 0.18 + 0.3, 1.6, W * 0.35 + 0.02, 0.5, 0.4, 1, '#e8e0d0');
  }
  if (mast) {
    g.add(cyl(0.06, 0.08, 4, '#5a4030', 6, L * 0.1, 2.9, 0));
    g.add(box(0.06, 0.06, 1.6, '#5a4030', L * 0.1, 3.8, 0));
  }
  return g;
}

export function makeGhostShip() {
  const g = new THREE.Group();
  const mats = [];
  const gm = (c, e = 0.5) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: new THREE.Color('#9fd6e0'), emissiveIntensity: e, transparent: true, opacity: 0, roughness: 0.9, flatShading: true, depthWrite: false }); mats.push(m); return m; };
  const hullM = gm('#3a4a50', 0.35);
  const hull = new THREE.Mesh(hullGeo(22, 6, 4.2), hullM); g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(19, 1.4, 5), hullM); deck.position.set(-2.5, 4.6, 0); g.add(deck);
  const mastM = gm('#2a3236', 0.25);
  const sailM = gm('#c8d8d8', 0.8); sailM.side = THREE.DoubleSide;
  for (const [x, h] of [[-7, 15], [0, 19], [7, 14]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, h, 6), mastM); m.position.set(x, 4 + h / 2, 0); g.add(m);
    for (let k = 0; k < 2; k++) {
      const sg = new THREE.PlaneGeometry(5.5 - k, 4.2, 6, 4);
      const p = sg.attributes.position;
      for (let i = 0; i < p.count; i++) { p.setZ(i, Math.sin(p.getX(i) * 0.6) * 0.5 + (Math.random() - 0.5) * 0.4); if (Math.random() < 0.08) p.setY(i, p.getY(i) - Math.random() * 1.6); }
      sg.computeVertexNormals();
      const s = new THREE.Mesh(sg, sailM); s.rotation.y = Math.PI / 2; s.position.set(x + 0.3, 6.5 + k * 4.8 + h * 0.15, 0); g.add(s);
      const yard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 6.2 - k), mastM); yard.position.set(x, 8.7 + k * 4.8 + h * 0.15, 0); g.add(yard);
    }
  }
  const nameM = new THREE.MeshBasicMaterial({ map: textTexture('AURELIA', { bg: null, border: null, fg: '#d8f0f0', font: 'bold 72px Georgia' }), transparent: true, opacity: 0, depthWrite: false });
  mats.push(nameM);
  const name = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), nameM); name.position.set(6.5, 2.8, 3.05); g.add(name);
  const name2 = name.clone(); name2.position.z = -3.05; name2.rotation.y = Math.PI; g.add(name2);
  // gemi fenerleri
  const lanternM = new THREE.MeshBasicMaterial({ color: '#bff', transparent: true, opacity: 0 }); mats.push(lanternM);
  for (const x of [-9, 9.5]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), lanternM); l.position.set(x, 6.2, 0); g.add(l); }
  return { group: g, mats };
}

export function makeCar() {
  const g = new THREE.Group();
  g.add(box(3.8, 0.8, 1.7, '#6a8a9a', 0, 0.75, 0));
  g.add(box(2.1, 0.7, 1.55, '#5a7a8a', -0.2, 1.5, 0));
  const glass = mat('#2a3a4a', { roughness: 0.2 });
  g.add(box(2.12, 0.5, 1.4, glass, -0.2, 1.52, 0));
  for (const [x, z] of [[1.2, 0.85], [-1.2, 0.85], [1.2, -0.85], [-1.2, -0.85]]) {
    const w = cyl(0.36, 0.36, 0.25, '#1a1a1a', 10, x, 0.36, z); w.rotation.x = Math.PI / 2; g.add(w);
  }
  g.add(box(0.1, 0.2, 0.35, '#ffe9a8', 1.92, 0.85, 0.55));
  g.add(box(0.1, 0.2, 0.35, '#ffe9a8', 1.92, 0.85, -0.55));
  g.add(box(1.0, 0.5, 0.9, '#7a5a3a', -1.2, 2.1, 0)); // bavul
  return g;
}

export function makeCrane() {
  const g = new THREE.Group();
  const c = '#7a4a32';
  g.add(box(1.5, 0.6, 1.5, '#444', 0, 0.3, 0));
  g.add(box(0.5, 9, 0.5, c, 0, 4.8, 0));
  const arm = box(9, 0.4, 0.4, c, 3, 9.2, 0); arm.rotation.z = 0.15; g.add(arm);
  g.add(box(0.05, 4, 0.05, '#222', 7.2, 8.0, 0));
  g.add(box(0.6, 0.5, 0.6, '#3a3a3a', 7.2, 5.9, 0));
  g.add(box(1.2, 1.2, 1.2, '#5a4a3a', 0, 8.2, 0));
  return g;
}

export function makeHullSkeleton() {
  const g = new THREE.Group();
  const c = '#6a3a28';
  g.add(box(14, 0.5, 0.6, c, 0, 0.3, 0));
  for (let i = 0; i < 9; i++) {
    const x = -6 + i * 1.5, h = 3 + Math.sin(i / 8 * Math.PI) * 2;
    for (const s of [-1, 1]) {
      const rib = box(0.25, h, 0.25, c, x, h / 2, s * 1.4); rib.rotation.x = s * 0.35; g.add(rib);
    }
  }
  return g;
}

export function makeHut() {
  const g = new THREE.Group();
  g.add(box(5, 3, 4, '#5a4a3a', 0, 1.5, 0));
  const r = shade(new THREE.Mesh(roofGeo(5, 4, 1.8), mat('#3a3028'))); r.position.y = 3; r.rotation.z = 0.06; g.add(r);
  g.add(box(1, 1.9, 0.1, '#2a2018', -1.2, 0.95, 2.03));
  const w = addWindow(g, 1.2, 1.7, 2.02, 0.7, 0.6, 0, '#3a3028');
  g.add(box(0.9, 0.08, 0.7, '#3a3028', 1.2, 1.7, 2.05)); // tahta çakılı pencere
  for (let i = 0; i < 4; i++) g.add(box(0.12, 1.2 + i * 0.1, 0.12, '#4a3a2a', 2.8 + i * 0.4, 0.6, 1.2 - i * 0.3));
  return { group: g, windows: [w] };
}

export function makeRubble() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const r = makeRock(randRange(0.4, 0.9), i % 2 ? '#6a6460' : '#5a5450', i * 3.1);
    r.position.set(randRange(-1, 1), randRange(0.2, 1.4), randRange(-1.6, 1.6));
    g.add(r);
  }
  const beam = box(3, 0.3, 0.3, '#5a3a22', 0, 1.6, 0.3); beam.rotation.z = 0.5; g.add(beam);
  return g;
}

export function makeFallenTree() {
  const g = new THREE.Group();
  const trunk = cyl(0.45, 0.6, 7, '#4a3424', 8, 0, 0.9, 0);
  trunk.rotation.x = Math.PI / 2; trunk.rotation.z = 0.25; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const s = shade(new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), mat('#3e6a32')));
    s.position.set(randRange(-0.6, 0.6), 1.4, -3.5 + i * 0.6); s.scale.y = 0.7; g.add(s);
  }
  const stump = cyl(0.55, 0.65, 0.8, '#4a3424', 8, 0.2, 0.4, 3.6); g.add(stump);
  return g;
}

export function makeCaveMouth() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = i / 8 * Math.PI;
    const r = makeRock(randRange(1.4, 2.2), '#5a5a5e', i * 2.3);
    r.position.set(Math.cos(a) * 3.2, Math.sin(a) * 3.4 + 0.5, 0);
    g.add(r);
  }
  const dark = new THREE.Mesh(new THREE.CircleGeometry(2.6, 12, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#030304' }));
  dark.position.set(0, 0.2, -0.6); g.add(dark);
  const sb = box(2.6, 2.4, 0.1, '#030304', 0, 1.0, -0.6); sb.material = dark.material; g.add(sb);
  g.add(box(0.15, 2.4, 0.15, '#5a3a22', -1.8, 1.2, 0.8));
  g.add(box(0.15, 2.4, 0.15, '#5a3a22', 1.8, 1.2, 0.8));
  g.add(box(3.9, 0.18, 0.18, '#5a3a22', 0, 2.4, 0.8));
  return g;
}

export function makeDriftwood() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const l = cyl(0.08, 0.11, randRange(1.0, 1.6), '#a8927a', 5, randRange(-0.2, 0.2), 0.1 + i * 0.08, randRange(-0.1, 0.1));
    l.rotation.z = Math.PI / 2 + randRange(-0.5, 0.5); l.rotation.y = randRange(-0.4, 0.4); g.add(l);
  }
  return g;
}

export function makeShells() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.12, 5), mat(['#f0d8c8', '#e8c0a8', '#fff0e0'][i % 3]));
    s.position.set(randRange(-0.3, 0.3), 0.05, randRange(-0.2, 0.2)); s.rotation.x = Math.PI / 2; s.rotation.z = Math.random() * 6;
    g.add(s);
  }
  return g;
}

export function makeSeaGlass() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: ['#6ac8a8', '#7ab8d8', '#a8e8c8'][i], emissive: '#2a6a5a', emissiveIntensity: 0.4, roughness: 0.2, flatShading: true }));
    s.position.set(randRange(-0.25, 0.25), 0.05, randRange(-0.15, 0.15)); g.add(s);
  }
  return g;
}

export function makeScrap() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const p = box(randRange(0.2, 0.5), 0.06, randRange(0.15, 0.3), ['#6a4a3a', '#7a5a4a', '#5a5a5a'][i % 3], randRange(-0.3, 0.3), 0.05 + i * 0.04, randRange(-0.2, 0.2));
    p.rotation.set(randRange(-0.3, 0.3), Math.random() * 3, randRange(-0.3, 0.3)); g.add(p);
  }
  const pipe = cyl(0.06, 0.06, 0.5, '#5a4a3a', 5, 0.1, 0.12, 0);
  pipe.rotation.z = 1.3; g.add(pipe);
  return g;
}

export function makeWreckage() {
  const g = new THREE.Group();
  const p = box(1.6, 0.12, 0.4, '#5a4a3a', 0, 0.12, 0); p.rotation.y = 0.3; g.add(p);
  const p2 = box(1.1, 0.12, 0.35, '#4a3a2a', 0.2, 0.25, 0.2); p2.rotation.y = -0.4; g.add(p2);
  const r = shade(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 4, 8), mat('#a89070'))); r.position.set(-0.4, 0.1, 0.1); r.rotation.x = Math.PI / 2; g.add(r);
  const crate = makeCrate(0.5, '#6a5038');
  crate.position.set(0.6, 0, -0.2); g.add(crate);
  return g;
}

export function makeMushrooms(glow = false) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.04, 0.05, 0.2, '#e8e0d0', 5, (i - 1) * 0.15, 0.1, randRange(-0.1, 0.1)));
    const capM = glow ? new THREE.MeshStandardMaterial({ color: '#4ad8c8', emissive: '#2ab8a8', emissiveIntensity: 1.5, flatShading: true }) : mat(['#b8462e', '#c86a3a', '#a8582a'][i]);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 6), capM);
    c.position.set((i - 1) * 0.15, 0.24, 0); g.add(c);
  }
  return g;
}

export function makeHerb(color = '#6aa84a', flower = '#e8d84a') {
  const g = new THREE.Group();
  g.add(makeGrassTuft(color));
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3), mat(flower));
    f.position.set(randRange(-0.15, 0.15), 0.5 + Math.random() * 0.2, randRange(-0.1, 0.1)); g.add(f);
  }
  return g;
}

export function makeBerryBush() {
  const g = new THREE.Group();
  g.add(makeBush(1.1, '#3f6a32'));
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), mat('#4a3a9a'));
    const a = Math.random() * 6;
    b.position.set(Math.cos(a) * 0.5, 0.25 + Math.random() * 0.4, Math.sin(a) * 0.35 + 0.15); g.add(b);
  }
  return g;
}

export function makeOreVein(color = '#8a8a90', glow = false) {
  const g = new THREE.Group();
  const r = makeRock(0.9, '#4a4a50', Math.random() * 10); r.position.y = 0.5; g.add(r);
  for (let i = 0; i < 5; i++) {
    const m = glow
      ? new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, flatShading: true, roughness: 0.2 })
      : mat(color, { metalness: 0.5, roughness: 0.4 });
    const o = new THREE.Mesh(glow ? new THREE.OctahedronGeometry(randRange(0.12, 0.28), 0) : new THREE.IcosahedronGeometry(0.12, 0), m);
    o.position.set(randRange(-0.5, 0.5), randRange(0.4, 1.0), randRange(0.2, 0.6));
    if (glow) o.scale.y = 2;
    g.add(o);
  }
  return g;
}

export function makeChest() {
  const g = new THREE.Group();
  g.add(box(1.0, 0.6, 0.6, '#7a5030', 0, 0.3, 0));
  g.add(box(1.04, 0.22, 0.64, '#6a4022', 0, 0.7, 0));
  g.add(box(0.16, 0.2, 0.05, '#c8a040', 0, 0.55, 0.32));
  return g;
}

export function makeWorkbench() {
  const g = new THREE.Group();
  g.add(box(1.8, 0.12, 0.8, '#7a5a3a', 0, 0.9, 0));
  for (const x of [-0.8, 0.8]) for (const z of [-0.3, 0.3]) g.add(box(0.1, 0.9, 0.1, '#5a3a22', x, 0.45, z));
  g.add(box(0.5, 0.2, 0.3, '#555', -0.4, 1.06, 0));
  g.add(box(0.3, 0.06, 0.1, '#888', 0.4, 0.99, 0.1));
  g.add(box(1.6, 0.06, 0.6, '#5a3a22', 0, 0.3, 0));
  return g;
}

export function makeBed(nice = false) {
  const g = new THREE.Group();
  g.add(box(2.1, 0.35, 1.0, nice ? '#6a4a2a' : '#5a5048', 0, 0.35, 0));
  g.add(box(1.9, 0.18, 0.9, nice ? '#e8e0d0' : '#a8a090', 0, 0.6, 0));
  g.add(box(1.2, 0.12, 0.92, nice ? '#3a5a8a' : '#6a6050', 0.3, 0.72, 0));
  g.add(box(0.4, 0.15, 0.6, '#f0ece0', -0.7, 0.75, 0));
  if (nice) g.add(box(0.12, 1.1, 1.0, '#6a4a2a', -1.05, 0.7, 0));
  return g;
}

export function makeGull() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 5), mat('#f0f0f0'));
  body.rotation.z = -Math.PI / 2; g.add(body);
  const wm = mat('#e0e0e4');
  const wl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.7), wm); wl.position.z = 0.35;
  const wr = wl.clone(); wr.position.z = -0.35;
  const L = new THREE.Group(); L.add(wl); const R = new THREE.Group(); R.add(wr);
  g.add(L, R);
  g.userData.wings = [L, R];
  return g;
}

export function makeSilhouette() {
  // Simsiyah, hareketsiz bir insan figürü
  const m = new THREE.MeshBasicMaterial({ color: '#020304', transparent: true, opacity: 0 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.3, 6), m); body.position.y = 1.0; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), m); head.position.y = 1.85; g.add(head);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 5), m); a.position.set(0, 1.05, s * 0.3); g.add(a); }
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 5), m); l.position.set(0, 0.35, s * 0.12); g.add(l); }
  g.userData.mat = m;
  return g;
}

export function makeCreature() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#0a1214', roughness: 0.5, flatShading: true, transparent: true, opacity: 0 });
  const back = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m); back.scale.set(2.2, 0.6, 1); g.add(back);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 4), m); sp.position.set(-12 + i * 4.5, 5 + Math.sin(i) * 0.8, 0); sp.rotation.z = -0.3; g.add(sp);
  }
  const eyeM = new THREE.MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), eyeM); eye.position.set(18, 2.5, 4); g.add(eye);
  g.userData.mats = [m, eyeM];
  return g;
}

export function makeFootprint() {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.11, 7), new THREE.MeshBasicMaterial({ color: '#3a3022', transparent: true, opacity: 0.75, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(1, 1.8, 1);
  return m;
}

export function makeMemorial() {
  const g = new THREE.Group();
  g.add(box(1.6, 1.2, 0.15, '#5a4a3a', 0, 1.3, 0));
  g.add(box(1.4, 1.0, 0.05, '#2a2420', 0, 1.3, 0.08));
  g.add(box(0.1, 0.8, 0.1, '#3a2a1a', -0.6, 0.4, 0));
  g.add(box(0.1, 0.8, 0.1, '#3a2a1a', 0.6, 0.4, 0));
  for (let i = 0; i < 5; i++) g.add(box(1.0 - (i % 2) * 0.3, 0.05, 0.02, '#c8b898', 0, 1.65 - i * 0.16, 0.11));
  return g;
}
