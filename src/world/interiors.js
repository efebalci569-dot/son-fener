// İç mekânlar: Fener (kesit), Mağara, Açık deniz (tekne)
import * as THREE from 'three';
import * as M from './models.js';
import { waveHeight } from './sea.js';
import { hash2, mulberry32 } from '../core/utils.js';
import { mergeStatic } from './merge.js';

export const FENER_X = 3000;
export const FLOOR_Y = [0, 4.6, 9.2, 13.8];
export const CAVE_X = 2000;
export const SEA_X = 4000;

// ------------------------------------------------------------------ FENER İÇİ
export function buildLighthouseInterior(G) {
  const X = FENER_X;
  const g = new THREE.Group();
  G.scene.add(g);

  // arka duvar: yarım silindir (iç yüz)
  const wallGeo = M.colorizeFaces(new THREE.CylinderGeometry(5.4, 6.2, 19, 22, 12, true, Math.PI / 2, Math.PI), v => {
    const n = hash2(Math.round(v.x * 2), Math.round(v.y * 1.4));
    if (v.y > 6.5) return n > 0.5 ? '#9a948c' : '#8a847c'; // lamba odası taşı
    return n > 0.5 ? '#b8ac98' : '#a89c88';
  });
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.BackSide }));
  wall.position.set(X, 8, -0.4); wall.receiveShadow = true; g.add(wall);

  // kesit çerçevesi: temel, yan duvar kesitleri ve karanlık arka fon
  const stone = M.colorizeFaces(new THREE.BoxGeometry(14, 9, 9, 7, 5, 1), v => hash2(Math.round(v.x * 1.3), Math.round(v.y * 1.6)) > 0.5 ? '#5a5048' : '#4e463e');
  const found = new THREE.Mesh(stone, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  found.position.set(X, -4.85, -3.2); g.add(found);
  for (const s of [-1, 1]) {
    const side = M.colorizeFaces(new THREE.BoxGeometry(1.4, 21, 7.5, 1, 14, 3), v => hash2(Math.round(v.y * 1.5), Math.round(v.z * 2) + s) > 0.5 ? '#6a6058' : '#5c534b');
    const m = new THREE.Mesh(side, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    m.position.set(X + s * 6.5, 8.3, -2.6); m.receiveShadow = true; g.add(m);
  }
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshBasicMaterial({ color: '#07090d' }));
  backdrop.position.set(X, 8, -8); g.add(backdrop);
  // katlar
  for (let i = 0; i < 4; i++) {
    const y = FLOOR_Y[i];
    const fl = M.box(11.6, 0.4, 6.2, '#7a5a3e', X, y - 0.2, -2.6);
    g.add(fl);
    g.add(M.box(11.6, 0.42, 0.12, '#4a3424', X, y - 0.2, 0.52)); // kesik kenar
    for (let k = 0; k < 7; k++) g.add(M.box(0.04, 0.02, 6.2, '#5a4030', X - 5.4 + k * 1.6, y + 0.005, -2.6));
  }
  // tavan (lamba odası üstü)
  g.add(M.box(11, 0.4, 6.2, '#3a2a22', X, 18.2, -2.6));

  // merdivenler (sağda yukarı)
  for (let f = 0; f < 3; f++) {
    for (let s = 0; s < 9; s++) {
      const st = M.box(1.0, 0.18, 1.1, '#5a4030', X + 2.6 + s * 0.28, FLOOR_Y[f] + 0.25 + s * 0.5, -4.3);
      g.add(st);
    }
    g.add(M.box(0.08, 4.6, 0.08, '#3a2a1a', X + 2.5, FLOOR_Y[f] + 2.3, -3.7));
  }
  // aşağı inme kapakları (solda)
  for (let f = 1; f < 4; f++) {
    g.add(M.box(1.3, 0.05, 1.2, '#3a2418', X - 4.0, FLOOR_Y[f] + 0.02, -1.4));
    g.add(M.box(0.08, 1.2, 0.08, '#2a1a10', X - 4.5, FLOOR_Y[f] + 0.6, -1.4));
    g.add(M.box(0.08, 1.2, 0.08, '#2a1a10', X - 3.5, FLOOR_Y[f] + 0.6, -1.4));
  }
  // giriş kapısı
  g.add(M.box(1.4, 2.4, 0.2, '#4a3020', X - 4.6, 1.2, -3.0));
  g.add(M.box(1.7, 0.2, 0.3, '#2a1a10', X - 4.6, 2.5, -3.0));
  // pencereler (gökyüzü renginde)
  const skyWinMat = new THREE.MeshBasicMaterial({ color: '#88aacc' });
  const winPos = [[-1.5, 2.6], [1.8, 7.3], [-2.2, 11.8]];
  for (const [wx, wy] of winPos) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), skyWinMat);
    w.position.set(X + wx, wy, -5.55); g.add(w);
    g.add(M.box(1.1, 0.12, 0.3, '#5a4a3a', X + wx, wy - 0.72, -5.45));
  }
  // lamba odası: geniş cam paneller
  for (let k = -2; k <= 2; k++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.0), skyWinMat);
    const a = k * 0.32;
    w.position.set(X + Math.sin(a) * 5.0, FLOOR_Y[3] + 2.0, -0.4 - Math.cos(a) * 5.0);
    w.rotation.y = -a; g.add(w);
  }

  // ---- değişken objeler (seviye bazlı) ----
  const O = {};
  // zemin
  O.bedOld = M.makeBed(false); O.bedOld.position.set(X + 1.4, 0, -3.6); g.add(O.bedOld);
  O.bedNew = M.makeBed(true); O.bedNew.position.set(X + 1.4, 0, -3.6); g.add(O.bedNew);
  O.chest = M.makeChest(); O.chest.position.set(X - 1.7, 0, -4.2); g.add(O.chest);
  O.bench = M.makeWorkbench(); O.bench.position.set(X - 0.2, 0, -4.1); g.add(O.bench);
  O.board = new THREE.Group();
  O.board.add(M.box(1.2, 1.5, 0.08, '#6a4a2a', 0, 1.6, 0));
  O.board.add(M.box(0.9, 0.5, 0.02, '#e8dcc0', -0.1, 1.8, 0.05));
  O.board.add(M.box(0.5, 0.4, 0.02, '#d8c8a0', 0.25, 1.25, 0.05));
  O.board.position.set(X - 3.0, 0, -5.0); g.add(O.board);
  O.junk = new THREE.Group();
  for (let i = 0; i < 6; i++) { const c = M.makeCrate(0.5 + (i % 3) * 0.15, '#6a5a48'); c.position.set(X - 1 + i * 0.7, 0, -4.6 + (i % 2) * 0.5); c.rotation.y = i; O.junk.add(c); }
  g.add(O.junk);
  // 1. kat
  O.brokenBoards = new THREE.Group();
  for (let i = 0; i < 5; i++) { const b = M.box(1.6, 0.08, 0.3, '#5a4030', X - 2 + i * 0.9, FLOOR_Y[1] + 0.1, -2.5 + (i % 3) * 0.6); b.rotation.set(0.1 * i, i, 0.15); O.brokenBoards.add(b); }
  g.add(O.brokenBoards);
  O.secretDoor = M.box(1.3, 2.3, 0.25, '#3a2414', X - 2.2, FLOOR_Y[1] + 1.15, -5.2); g.add(O.secretDoor);
  O.secretOpen = new THREE.Group();
  O.secretOpen.add(M.box(1.3, 2.3, 0.1, '#050404', X - 2.2, FLOOR_Y[1] + 1.15, -5.3));
  const book = M.box(0.5, 0.12, 0.35, '#5a2a2a', X - 2.2, FLOOR_Y[1] + 0.8, -4.6); O.secretOpen.add(book);
  O.secretOpen.add(M.box(0.8, 0.7, 0.5, '#3a2a1a', X - 2.2, FLOOR_Y[1] + 0.35, -4.6));
  g.add(O.secretOpen);
  O.workshop = new THREE.Group();
  const wb2 = M.makeWorkbench(); wb2.position.set(X + 0.6, FLOOR_Y[1], -4.1); O.workshop.add(wb2);
  O.workshop.add(M.box(1.2, 0.8, 0.7, '#4a5a6a', X - 0.6, FLOOR_Y[1] + 0.4, -4.4)); // yem tezgâhı
  const mapT = M.box(1.6, 0.08, 1.0, '#6a4a2a', X + 2.0, FLOOR_Y[1] + 0.95, -2.8); O.workshop.add(mapT);
  O.workshop.add(M.box(1.4, 0.02, 0.8, '#d8c8a0', X + 2.0, FLOOR_Y[1] + 1.0, -2.8));
  O.workshop.add(M.box(0.1, 0.95, 0.1, '#4a3020', X + 1.4, FLOOR_Y[1] + 0.47, -2.5));
  O.workshop.add(M.box(0.1, 0.95, 0.1, '#4a3020', X + 2.6, FLOOR_Y[1] + 0.47, -3.1));
  for (let i = 0; i < 3; i++) O.workshop.add(M.cyl(0.03, 0.03, 2.2, '#8a6a3a', 5, X - 3.4 + i * 0.3, FLOOR_Y[1] + 1.4, -4.9));
  g.add(O.workshop);
  // 2. kat
  O.observatory = new THREE.Group();
  const scope = M.cyl(0.18, 0.12, 2.0, '#8a7040', 8, X + 0.8, FLOOR_Y[2] + 1.5, -3.5); scope.rotation.z = 1.0; scope.rotation.y = 0.6; O.observatory.add(scope);
  O.observatory.add(M.cyl(0.05, 0.05, 1.3, '#2a2a2a', 5, X + 0.8, FLOOR_Y[2] + 0.65, -3.5));
  const radio = M.box(0.9, 0.6, 0.5, '#4a3a2a', X - 1.5, FLOOR_Y[2] + 1.15, -4.4); O.observatory.add(radio);
  O.observatory.add(M.box(1.4, 0.85, 0.7, '#5a4030', X - 1.5, FLOOR_Y[2] + 0.42, -4.4));
  O.radioLight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#3f3' })); O.radioLight.position.set(X - 1.2, FLOOR_Y[2] + 1.3, -4.14); O.observatory.add(O.radioLight);
  for (let i = 0; i < 3; i++) O.observatory.add(M.box(1.6, 0.06, 0.4, '#5a3a22', X + 2.6, FLOOR_Y[2] + 0.8 + i * 0.6, -4.8));
  for (let i = 0; i < 8; i++) O.observatory.add(M.box(0.12, 0.45, 0.3, ['#7a2a2a', '#2a4a6a', '#5a5a2a'][i % 3], X + 2.0 + (i % 4) * 0.35, FLOOR_Y[2] + 1.05 + Math.floor(i / 4) * 0.6, -4.8));
  g.add(O.observatory);
  O.dust = new THREE.Group();
  for (let i = 0; i < 4; i++) { const c = M.makeCrate(0.6, '#5a5048'); c.position.set(X - 2 + i * 1.2, FLOOR_Y[2], -4.4); O.dust.add(c); }
  g.add(O.dust);
  // 3. kat: lamba
  O.lamp = new THREE.Group();
  O.lamp.add(M.cyl(0.6, 0.8, 1.0, '#3a3a3e', 10, 0, 0.5, 0));
  const lensMat = new THREE.MeshStandardMaterial({ color: '#c8e0e8', emissive: new THREE.Color('#ffe6a0'), emissiveIntensity: 0, transparent: true, opacity: 0.8, roughness: 0.1, flatShading: true });
  O.lensMat = lensMat;
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.75 - Math.abs(i - 2.5) * 0.08, 0.08, 4, 14), lensMat);
    r.rotation.x = Math.PI / 2; r.position.y = 1.25 + i * 0.22; O.lamp.add(r);
  }
  O.core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: '#4a4030' }));
  O.core.position.y = 1.8; O.lamp.add(O.core);
  O.lamp.add(M.cyl(0.85, 0.85, 0.1, '#2a2a2e', 12, 0, 2.7, 0));
  O.lamp.position.set(X + 0.3, FLOOR_Y[3], -2.8); g.add(O.lamp);
  O.brokenLamp = new THREE.Group();
  for (let i = 0; i < 6; i++) { const s = M.box(0.2, 0.04, 0.15, '#9ab8c0', X + 0.3 + Math.sin(i) * 1.1, FLOOR_Y[3] + 0.05, -2 + Math.cos(i * 2) * 0.6); s.rotation.y = i; O.brokenLamp.add(s); }
  g.add(O.brokenLamp);
  const desk = M.box(1.4, 0.1, 0.7, '#5a3a22', X - 3.2, FLOOR_Y[3] + 0.9, -3.4); g.add(desk);
  g.add(M.box(0.1, 0.9, 0.6, '#4a2a18', X - 3.8, FLOOR_Y[3] + 0.45, -3.4));
  g.add(M.box(0.1, 0.9, 0.6, '#4a2a18', X - 2.6, FLOOR_Y[3] + 0.45, -3.4));
  O.note = M.box(0.35, 0.02, 0.45, '#e8dcc0', X - 3.3, FLOOR_Y[3] + 0.96, -3.3); g.add(O.note);
  g.add(M.box(0.45, 0.1, 0.32, '#3a2a4a', X - 2.85, FLOOR_Y[3] + 0.99, -3.5));
  g.add(M.box(0.6, 0.25, 0.4, '#2a4a3a', X + 3.4, FLOOR_Y[3] + 0.12, -3.6)); // yağ bidonu
  g.add(M.cyl(0.25, 0.25, 0.8, '#3a4a3a', 8, X + 3.9, FLOOR_Y[3] + 0.4, -4.2));

  // ışıklar
  const fl = (f, x, inten) => G.env.addLight({ area: 'fener_ic', pos: new THREE.Vector3(X + x, FLOOR_Y[f] + 3.2, -1.5), color: '#ffc080', distance: 9, intensity: () => inten(), flicker: true });
  fl(0, -1, () => G.state.lighthouse.level >= 2 ? 9 : 5);
  fl(1, 0.5, () => G.state.lighthouse.level >= 3 ? 8 : 2.5);
  fl(2, 0, () => G.state.lighthouse.level >= 4 ? 8 : 2);
  fl(3, -2.5, () => 5);
  G.env.addLight({ area: 'fener_ic', pos: new THREE.Vector3(X + 0.3, FLOOR_Y[3] + 2.0, -1.8), color: '#fff0c0', distance: 14, intensity: () => G.state.lighthouse.lit ? 40 : 0, on: () => G.state.lighthouse.lit });

  mergeStatic(g, new Set(Object.values(O).filter(o => o?.isObject3D)));

  const area = {
    id: 'fener_ic', name: 'Deniz Feneri', indoor: true, showSea: false,
    minX: X - 4.9, maxX: X + 4.9,
    ground: (x, p) => FLOOR_Y[p?.floor ?? 0],
    cam: { dist: 10.5, height: 1.6, look: 1.4, yawX: 0.8 },
    surface: 'wood',
    refresh(s) {
      const L = s.lighthouse.level;
      O.bedOld.visible = L < 2; O.bedNew.visible = L >= 2;
      O.chest.visible = s.hasChest;
      O.bench.visible = L >= 2;
      O.junk.visible = L < 2;
      O.brokenBoards.visible = L < 3;
      O.secretDoor.visible = L < 3; O.secretOpen.visible = L >= 3;
      O.workshop.visible = L >= 3;
      O.observatory.visible = L >= 4; O.dust.visible = L < 4;
      O.lamp.visible = !!s.flags.lampRepaired; O.brokenLamp.visible = !s.flags.lampRepaired;
      O.note.visible = !s.clues.includes('c01');
    },
    update(dt, t, p) {
      const lit = G.state.lighthouse.lit;
      lensMat.emissiveIntensity += ((lit ? 2.2 : 0) - lensMat.emissiveIntensity) * Math.min(1, dt * 3);
      O.core.material.color.set(lit ? '#fff4d0' : '#4a4030');
      if (lit) O.lamp.rotation.y += dt * 0.6;
      skyWinMat.color.copy(p.skyHorizon).lerp(p.skyTop, 0.4);
      O.radioLight.visible = Math.sin(t * 4) > 0;
    },
    group: g,
  };
  return area;
}

// ------------------------------------------------------------------ MAĞARA
export function caveGround(x) {
  const u = x - CAVE_X;
  return 0.35 * Math.sin(u * 0.31) + 0.25 * Math.sin(u * 0.13 + 1) - u * 0.035;
}

export function buildCave(G) {
  const X = CAVE_X;
  const g = new THREE.Group();
  G.scene.add(g);
  const rnd = mulberry32(42);
  const R = (a, b) => a + rnd() * (b - a);
  // zemin şeridi
  const xs = []; for (let x = X - 6; x <= X + 76; x += 0.8) xs.push(x);
  const zs = [8, 4, 2.2, 0, -2.2, -4, -6.5, -9];
  const pos = [], col = [], idx = [];
  const c = new THREE.Color();
  xs.forEach((x, i) => zs.forEach((z, j) => {
    let y = caveGround(x);
    if (Math.abs(z) > 2.2) y += (Math.abs(z) - 2.2) * (z < 0 ? 0.5 : 0.2) + (hash2(i, j) - 0.5) * 0.3;
    const pool = x > X + 34 && x < X + 47 && z < -2.5;
    if (pool) y -= 1.2;
    pos.push(x, y, z);
    c.set(hash2(i * 2, j) > 0.5 ? '#3a3a40' : '#2e2e34');
    if (z > 2.2) c.multiplyScalar(0.55);
    col.push(c.r, c.g, c.b);
  }));
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const a = i * zs.length + j, b = (i + 1) * zs.length + j, cc = (i + 1) * zs.length + j + 1, d = i * zs.length + j + 1;
    idx.push(a, b, d, b, cc, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const floor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  floor.receiveShadow = true; g.add(floor);
  // arka duvar ve tavan
  const rockM = M.mat('#2a2a30');
  for (let x = X - 8; x < X + 80; x += 3.2) {
    const r = new THREE.Mesh(M.rockGeo(R(3, 5), x), rockM); r.position.set(x, caveGround(x) + R(1, 4), -9 - R(0, 2)); g.add(r);
    const ceil = new THREE.Mesh(M.rockGeo(R(3.5, 5), x + 3), rockM); ceil.position.set(x, caveGround(x) + R(8, 10), R(-6, 2)); g.add(ceil);
    if (rnd() > 0.4) { const st = new THREE.Mesh(new THREE.ConeGeometry(R(0.2, 0.5), R(1.5, 3.5), 5), rockM); st.rotation.x = Math.PI; st.position.set(x + R(-1, 1), caveGround(x) + R(5.5, 7), R(-5, -1)); g.add(st); }
    if (rnd() > 0.5) { const sm = new THREE.Mesh(new THREE.ConeGeometry(R(0.3, 0.6), R(1, 2.2), 5), rockM); sm.position.set(x + R(-1, 1), caveGround(x) + 0.6, R(-6, -3)); g.add(sm); }
  }
  // giriş ve çıkış kapakları
  for (const x of [X - 7, X + 77]) { const w = new THREE.Mesh(M.rockGeo(7, x), rockM); w.position.set(x, caveGround(x) + 3, -1); g.add(w); }
  // giriş ışığı
  const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.5), new THREE.MeshBasicMaterial({ color: '#c8d8e8', transparent: true, opacity: 0.5 }));
  exitGlow.position.set(X + 0.2, caveGround(X) + 1.8, -3); g.add(exitGlow);
  G.env.addLight({ area: 'magara', pos: new THREE.Vector3(X + 1, caveGround(X) + 2, -1), color: '#a8c0d8', distance: 10, intensity: 6 });
  // yeraltı gölü
  const poolM = new THREE.MeshStandardMaterial({ color: '#0a2a3a', emissive: '#0a3a4a', emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3, flatShading: true });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.5, 12, 4), poolM); pool.rotation.x = -Math.PI / 2;
  pool.position.set(X + 40.5, caveGround(X + 40) - 0.55, -5.6); g.add(pool);
  G.env.addLight({ area: 'magara', pos: new THREE.Vector3(X + 40, caveGround(X + 40) + 0.5, -4), color: '#40c0d0', distance: 10, intensity: 4 });
  // parlayan mantarlar & kristaller (dekor)
  for (let i = 0; i < 10; i++) { const m = M.makeMushrooms(true); const x = X + R(4, 72); m.position.set(x, caveGround(x) + 0.3, R(-5, -3)); g.add(m); }
  for (const x of [X + 18, X + 52, X + 64]) {
    const cr = M.makeOreVein('#5ad8f0', true); cr.position.set(x, caveGround(x) + 0.5, -6.5); cr.scale.setScalar(1.6); g.add(cr);
    G.env.addLight({ area: 'magara', pos: new THREE.Vector3(x, caveGround(x) + 2, -5), color: '#50d0f0', distance: 9, intensity: 5 });
  }
  // pusula kaidesi
  const ped = new THREE.Group();
  ped.add(M.makeRock(0.8, '#3a3a40', 5));
  const compass = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 12), new THREE.MeshStandardMaterial({ color: '#8ae0f0', emissive: '#5ac8e0', emissiveIntensity: 1.6 }));
  compass.position.y = 0.75; ped.add(compass);
  ped.position.set(X + 70, caveGround(X + 70) + 0.2, -1.6); g.add(ped);
  G.env.addLight({ area: 'magara', pos: new THREE.Vector3(X + 70, caveGround(X + 70) + 1.6, -1), color: '#60e0f0', distance: 8, intensity: () => G.state.clues.includes('c11') ? 0 : 6, on: () => !G.state.clues.includes('c11') });

  mergeStatic(g, new Set([ped, pool]));

  const area = {
    id: 'magara', name: 'Eski Maden Mağarası', indoor: true, showSea: false,
    minX: X + 0.5, maxX: X + 73,
    ground: x => caveGround(x),
    cam: { dist: 13, height: 2.4, look: 1.4, yawX: 1.2 },
    surface: 'rock',
    refresh(s) { compass.visible = !s.clues.includes('c11'); },
    update(dt, t) { compass.rotation.y = Math.sin(t * 0.7) * 0.4; poolM.emissiveIntensity = 0.5 + Math.sin(t) * 0.15; },
    group: g,
  };
  return area;
}

// ------------------------------------------------------------------ AÇIK DENİZ (TEKNE)
export function buildSeaArea(G) {
  const X = SEA_X;
  const g = new THREE.Group();
  G.scene.add(g);
  const boat = M.makeBoat({ L: 7, W: 2.6, color: '#2a4a5a', cabin: true });
  boat.position.set(X, 0, 0); // dünyanın başlangıç noktasında (atölyenin önünde) kalmasın
  g.add(boat);
  // batık
  const wreck = new THREE.Group();
  for (const [x, h, r] of [[0, 9, 0.25], [6, 6, -0.35]]) {
    const m = M.cyl(0.2, 0.3, h, '#2a2420', 6, x, h / 2 - 2, 0); m.rotation.z = r; wreck.add(m);
    const y = M.box(0.12, 0.12, 3.5, '#2a2420', x + Math.sin(-r) * h * 0.4, h * 0.65 - 2, 0); wreck.add(y);
  }
  const buoy = M.cyl(0.4, 0.5, 1.2, '#d84a2a', 8, -6, 0, 2); wreck.add(buoy);
  wreck.position.set(X + 12, 0, -10); g.add(wreck);
  // uzak ada (yakın görünüm)
  const island = new THREE.Group();
  const im = M.mat('#4a5a48');
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(M.rockGeo(8 + i * 2, i * 3), im); r.position.set(i * 11 - 20, -1, -i * 2); r.scale.y = 0.7; island.add(r); }
  for (let i = 0; i < 9; i++) { const p = M.makePine(7 + (i % 3) * 2, i); p.position.set(-25 + i * 6, 4 + (i % 2), -4); island.add(p); }
  const ruin = M.makeLighthouse(); ruin.group.scale.setScalar(0.55); ruin.group.position.set(8, 5, -6); island.add(ruin.group);
  const sand = M.box(40, 0.4, 8, '#c8b48a', 0, 0.1, 6); island.add(sand);
  island.position.set(X + 18, -0.2, -26); g.add(island);

  const area = {
    id: 'deniz', name: 'Açık Deniz', indoor: false, showSea: true,
    minX: X - 2.6, maxX: X + 2.9,
    ground: () => boat.position.y + 0.98,
    cam: { dist: 15, height: 3.2, look: 1.4, yawX: 1.6 },
    surface: 'wood',
    dest: 'acik',
    setDest(d) {
      this.dest = d;
      wreck.visible = d === 'batik';
      island.visible = d === 'ada';
      this.name = { acik: 'Açık Deniz', batik: 'Batık Gemi', ada: 'Uzak Ada' }[d];
    },
    refresh() { },
    update(dt, t) {
      boat.position.set(X, waveHeight(X, 0, G.sea.t) - 0.45, 0);
      boat.rotation.z = Math.sin(t * 0.8) * 0.04 * G.weather.cur.waves;
      boat.rotation.x = Math.sin(t * 0.6) * 0.03 * G.weather.cur.waves;
      buoy.position.y = waveHeight(X + 6, -8, G.sea.t) + 0.3;
    },
    group: g,
  };
  area.setDest('acik');
  return area;
}
