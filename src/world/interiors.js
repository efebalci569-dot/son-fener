// İç mekânlar: Fener (kesit), Mağara, Açık deniz (tekne)
import * as THREE from 'three';
import * as M from './models.js';
import { waveHeight } from './sea.js';
import { hash2, mulberry32 } from '../core/utils.js';
import { mergeStatic } from './merge.js';

export const CAVE_X = 2000;
export const SEA_X = 4000;

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
