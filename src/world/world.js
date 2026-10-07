// Dış dünyanın yerleşimi: kasaba, iskele, sahil, fener, orman, tersane ve arka planlar
import * as THREE from 'three';
import * as M from './models.js';
import { buildTerrain, terrainHeight, groundY } from './terrain.js';
import { waveHeight } from './sea.js';
import { mulberry32, randRange } from '../core/utils.js';
import { mergeStatic } from './merge.js';

export const LIGHTHOUSE_X = 150, LIGHTHOUSE_Z = -4.4;

export function buildWorld(G) {
  const scene = G.scene;
  const root = new THREE.Group();
  scene.add(root);
  const rnd = mulberry32(1927);
  const R = (a, b) => a + rnd() * (b - a);
  const place = (obj, x, z, rotY = 0, yOff = 0) => {
    obj.position.set(x, terrainHeight(x, z) + yOff, z);
    obj.rotation.y = rotY;
    root.add(obj);
    return obj;
  };
  const W = { root, boats: [], gulls: [], swayers: [], gates: {}, lighthouse: null, extras: {} };

  root.add(buildTerrain());

  // ---------- KASABA ----------
  const houses = [
    { x: -58, w: 6, h: 4.2, wall: '#c9b79c', roof: '#6a3b3e', seed: 0 },
    { x: -30, w: 5.5, h: 3.9, wall: '#a8b8c0', roof: '#3d4a5a', seed: 1 },
  ];
  for (const h of houses) {
    const { group } = M.makeHouse({ w: h.w, h: h.h, d: 5, wall: h.wall, roof: h.roof, seed: h.seed });
    place(group, h.x, -5.6);
  }
  // arka sıra evler (yamaçta)
  const back = [[-56, '#d8c8b0', '#7a4a3a'], [-44, '#b8a890', '#4a5a6a'], [-33, '#e0d0c0', '#5a3a3a'], [-25, '#c8b8a0', '#6a5a3a'], [-15, '#b0a898', '#3a4a5a'], [-6, '#d0c0a8', '#7a3a2a'], [0.5, '#c0b0a0', '#4a4a3a']];
  back.forEach(([x, wall, roof], i) => {
    const { group } = M.makeHouse({ w: R(5, 6.5), h: R(3.8, 5.2), d: 4.5, wall, roof, seed: i });
    place(group, x + R(-0.5, 0.5), -14 - R(0, 2), R(-0.08, 0.08));
  });
  // dükkânlar (kesit)
  const shopDefs = [
    { x: -48.5, w: 9, h: 4.6, wall: '#c8c0b0', roof: '#4a4038', sign: 'BELEDİYE', kind: 'belediye', open: [9, 17], sign2: '#2a3040' },
    { x: -20.5, w: 8, h: 4.2, wall: '#e0cfa8', roof: '#3d6a5a', sign: 'MARKET', kind: 'market', open: [8, 18], sign2: '#2a4a3a' },
    { x: -11.5, w: 9, h: 4.4, wall: '#b89878', roof: '#5a2a24', sign: 'MARTI BAR', kind: 'bar', open: [12, 25], sign2: '#4a1a14' },
    { x: -0.5, w: 8, h: 4.2, wall: '#a8a49c', roof: '#3a4048', sign: 'ATÖLYE', kind: 'atolye', open: [8, 18], sign2: '#3a3020' },
  ];
  for (const s of shopDefs) {
    const { group, lightLocal } = M.makeShop({ w: s.w, h: s.h, d: 5, wall: s.wall, roof: s.roof, sign: s.sign, kind: s.kind, signColor: s.sign2 });
    place(group, s.x, -5.5);
    const [o, c] = s.open;
    G.env.addLight({
      area: 'world', pos: new THREE.Vector3(s.x, lightLocal.y, -5.5 + lightLocal.z), color: s.kind === 'bar' ? '#ff9a50' : '#ffc890', distance: 11,
      on: (n, hh) => { const h = hh < 6 ? hh + 24 : hh; return h >= o && h < c; }, intensity: n => 14 + n * 6, flicker: s.kind === 'bar',
    });
  }
  // kilise
  const church = M.makeChurch();
  place(church.group, -38, -6.5);
  G.env.addLight({ area: 'world', pos: new THREE.Vector3(-37, 3, -2.5), color: '#ffb070', distance: 8, on: (n, hh) => n > 0.5 && (hh > 18 || hh < 1), intensity: 6, flicker: true });
  const memorial = M.makeMemorial(); place(memorial, -35.4, -3.1);
  place(M.makeBench(), -34.6, -2.2);
  // kasaba girişi: araba + tabela
  place(M.makeCar(), -65.2, 1.3, 0.04);
  const welcome = M.makeSign('SON FENER', 2.8, 0.9, { bg: '#2a3a4a', font: 'bold 70px Georgia' });
  const post = new THREE.Group(); post.add(welcome); welcome.position.y = 2.1;
  post.add(M.box(0.12, 2.2, 0.12, '#3a3a3a', -1.1, 1.1, 0)); post.add(M.box(0.12, 2.2, 0.12, '#3a3a3a', 1.1, 1.1, 0));
  place(post, -62.5, -2.8, 0.1);
  // sokak lambaları
  for (const x of [-61, -52.5, -42.6, -26.5, -16.4, -6.8, 6.2, 14, 26, 38, 128.5, 143]) {
    const { group, bulb } = M.makeLampPost();
    const z = x > 8 && x < 43 ? -1.75 : -2.6;
    const y0 = x > 8 && x < 43 ? 0.62 : terrainHeight(x, z);
    group.position.set(x, y0, z); root.add(group);
    G.env.addLight({ area: 'world', pos: new THREE.Vector3(x + bulb.x, y0 + bulb.y - 0.1, z), color: '#ffc070', distance: 13, on: 'night', intensity: 14 });
  }
  // dekor
  [[-63.5, 3.6], [-45, 4.2], [-24, 3.9], [-4, 4.4], [-52, 5.2], [-12, 5.6]].forEach(([x, z]) => place(M.makeBush(R(0.8, 1.3), '#4f7a3c'), x, z));
  [[-17, -2.8, 'barrel'], [-23.6, -2.6, 'crate'], [-23.0, -2.7, 'crate2'], [2.6, -2.7, 'barrel'], [3.4, -2.6, 'crate'], [-54.6, -2.7, 'barrel']].forEach(([x, z, k]) => {
    place(k === 'barrel' ? M.makeBarrel() : M.makeCrate(k === 'crate2' ? 0.55 : 0.8), x, z, R(-0.3, 0.3));
  });
  place(M.makeFence(5), -61.6, 3.0);
  for (let i = 0; i < 10; i++) place(M.makeGrassTuft(), R(-66, 6), R(3, 6));

  // ---------- İSKELE ----------
  const dock = new THREE.Group();
  for (let x = 9.6; x < 42.4; x += 1.6) {
    const p = M.box(1.55, 0.2, 3.3, (Math.floor(x) % 3 === 0) ? '#7a5e42' : '#86684a', x + 0.8, 0.52, 0);
    dock.add(p);
  }
  for (let x = 10; x <= 42; x += 3.2) for (const z of [-1.55, 1.55]) dock.add(M.cyl(0.14, 0.16, 3.6, '#4a3a2a', 6, x, -1.2, z));
  for (const x of [12, 22, 32, 41.6]) dock.add(M.cyl(0.18, 0.22, 0.6, '#2a2a2e', 8, x, 0.9, -1.45));
  root.add(dock);
  // bağlı tekneler
  const boatCols = ['#b84a3a', '#3a6a8a', '#e0c050'];
  [[15.5, -5.2], [23.5, -5.6], [31, -5.0]].forEach(([x, z], i) => {
    const b = M.makeBoat({ L: R(4.6, 5.8), W: 1.8, color: boatCols[i], cabin: i !== 1, mast: i === 1 });
    b.position.set(x, 0, z); b.rotation.y = R(-0.15, 0.15) + (i % 2 ? Math.PI : 0);
    b.userData.phase = R(0, 6); root.add(b); W.boats.push(b);
  });
  // oyuncunun teknesi (onarılınca görünür)
  const pBoat = M.makeBoat({ L: 5.2, W: 1.9, color: '#2a4a5a', cabin: true });
  pBoat.position.set(38.4, 0, -4.4); pBoat.userData.phase = 1.3; pBoat.rotation.y = Math.PI;
  root.add(pBoat); W.boats.push(pBoat); W.extras.playerBoat = pBoat;
  // eski kırık tekne (onarımdan önce)
  const wreckBoat = M.makeBoat({ L: 5.2, W: 1.9, color: '#4a4440', cabin: false });
  wreckBoat.position.set(38.4, -0.9, -4.4); wreckBoat.rotation.set(0.25, Math.PI, 0.1);
  root.add(wreckBoat); W.extras.wreckBoat = wreckBoat;
  // halat & kasalar
  place(M.makeCrate(0.7), 13.5, -1.0, 0.2, 0.62 - terrainHeight(13.5, -1.0));
  place(M.makeBarrel('#5a5a6a'), 20.2, 1.1, 0, 0.62 - terrainHeight(20.2, 1.1));

  // ---------- SAHİL ----------
  for (let i = 0; i < 26; i++) {
    const x = R(46, 122), z = R(-9, -3.5);
    place(M.makeRock(R(0.4, 1.4), rnd() > 0.5 ? '#6a6a6e' : '#7a766e', i), x, z, R(0, 6), -0.2);
  }
  for (let i = 0; i < 12; i++) place(M.makeRock(R(0.3, 0.7), '#8a8478', i + 40), R(46, 122), R(3, 7), R(0, 6), -0.1);
  for (let i = 0; i < 16; i++) place(M.makeGrassTuft('#8a9a5a'), R(46, 120), R(4, 8));
  const beached = M.makeHullSkeleton(); beached.scale.setScalar(0.6); place(beached, 87, -7.5, 0.4, -0.6); beached.rotation.z = 0.15;
  // Selin'in kulübesi
  const hut = M.makeHut(); place(hut.group, 96, -7.2, 0.05);
  W.extras.selinHut = hut.group;
  // uzak yelkenli / balıkçı teknesi
  const farBoat = M.makeBoat({ L: 6, color: '#d8d0c0', cabin: true, mast: true });
  farBoat.position.set(0, 0, -95); farBoat.scale.setScalar(1.6); root.add(farBoat);
  W.extras.farBoat = farBoat;

  // ---------- FENER ----------
  const lh = M.makeLighthouse();
  const ly = terrainHeight(LIGHTHOUSE_X, LIGHTHOUSE_Z) - 0.2;
  lh.group.position.set(LIGHTHOUSE_X, ly, LIGHTHOUSE_Z);
  root.add(lh.group);
  W.lighthouse = { ...lh, worldLamp: new THREE.Vector3(LIGHTHOUSE_X, ly + lh.lampY, LIGHTHOUSE_Z), baseY: ly };
  G.env.addLight({ area: 'world', pos: new THREE.Vector3(LIGHTHOUSE_X, ly + 4.1, LIGHTHOUSE_Z + 2.8), color: '#ffc070', distance: 9, on: 'night', intensity: 10 });
  for (let i = 0; i < 16; i++) place(M.makeRock(R(0.6, 2.2), rnd() > 0.5 ? '#6a6c70' : '#5a5c60', i + 70), R(124, 172), R(-12, -6.5), R(0, 6), -0.4);
  for (let i = 0; i < 6; i++) place(M.makeRock(R(0.5, 1.1), '#6e7074', i + 90), R(126, 170), R(3.5, 7), R(0, 6), -0.2);
  place(M.makeFence(8, '#e8e0d0'), 162, -5.6);
  place(M.makeFence(6, '#e8e0d0'), 138, -5.6);
  place(M.makeBench(), 157, -2.6, 0);
  for (let i = 0; i < 12; i++) place(M.makeGrassTuft('#6a8a4a'), R(132, 170), R(-5, 6));
  // uzak kayalık ada & ufuk adası
  const islandMat = M.mat('#3a4a48');
  const farIsland = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(M.rockGeo(R(14, 26), i * 9), islandMat);
    r.position.set(i * 16 - 40, R(-4, 2), R(-10, 10)); r.scale.y = R(0.6, 1.2); farIsland.add(r);
  }
  for (let i = 0; i < 10; i++) { const t = M.makePine(R(10, 16), i); t.position.set(R(-40, 40), R(8, 14), R(-6, 6)); farIsland.add(t); }
  farIsland.position.set(260, -2, -290); root.add(farIsland);
  W.extras.farIsland = farIsland;
  const islet = new THREE.Mesh(M.rockGeo(9, 3), islandMat); islet.position.set(40, -3, -170); islet.scale.set(2, 0.7, 1.2); root.add(islet);

  // ---------- ORMAN ----------
  for (let i = 0; i < 150; i++) {
    const x = R(-142, -66);
    const z = -R(4.8, 34);
    const t = rnd() > 0.35 ? M.makePine(R(4, 8.5), i) : M.makeTree(R(3.5, 6), i);
    place(t, x, z, R(0, 6), -0.1);
  }
  for (let i = 0; i < 30; i++) place(M.makeBush(R(0.6, 1.2), rnd() > 0.5 ? '#3f6a32' : '#4a7a3a'), R(-140, -68), R(-3.5, 6.5));
  for (let i = 0; i < 30; i++) place(M.makeGrassTuft('#4a7a3a'), R(-140, -68), R(2.5, 7));
  const cave = M.makeCaveMouth(); place(cave, -118, -4.6, 0, -0.2);
  // devrilmiş ağaç kapısı
  const fallen = M.makeFallenTree(); place(fallen, -69.6, 0, 0, 0.1);
  W.gates.forest = fallen;

  // ---------- TERSANE ----------
  const crane = M.makeCrane(); place(crane, -172, -9, 0.3);
  const crane2 = M.makeCrane(); place(crane2, -150, -12, -0.2); crane2.scale.setScalar(0.8);
  const hull1 = M.makeHullSkeleton(); place(hull1, -186, -9.5, 0.1, -0.2);
  const hull2 = M.makeHullSkeleton(); hull2.scale.setScalar(0.8); place(hull2, -160, -7.6, -0.25, -0.3);
  // raylar
  const rails = new THREE.Group();
  for (const z of [-2.85, -3.55]) rails.add(M.box(64, 0.08, 0.1, '#5a4a40', -172, 0, z));
  for (let x = -203; x < -141; x += 1.1) rails.add(M.box(0.25, 0.08, 1.2, '#4a3a2a', x, -0.06, -3.2));
  rails.position.y = groundY(-172) + 0.06; root.add(rails);
  // paslı vagon
  const wagon = new THREE.Group();
  wagon.add(M.box(4.6, 2.2, 2.0, '#6a3a2a', 0, 1.6, 0));
  wagon.add(M.box(4.8, 0.2, 2.1, '#3a2a22', 0, 2.75, 0));
  for (const x of [-1.5, 1.5]) for (const z of [-0.9, 0.9]) { const w = M.cyl(0.35, 0.35, 0.15, '#2a2a2a', 8, x, 0.4, z); w.rotation.x = Math.PI / 2; wagon.add(w); }
  place(wagon, -178, -3.2, 0.03, 0.05);
  // tersane ofisi
  const office = M.makeHouse({ w: 5.5, h: 3.6, d: 4.5, wall: '#7a6a5a', roof: '#3a3a3a', seed: 2, chimney: false });
  place(office.group, -148, -6.2, -0.04);
  // denizci kulübesi
  const sHut = M.makeHut(); place(sHut.group, -195, -5.6, 0.08);
  for (let i = 0; i < 14; i++) place(M.makeBarrel(rnd() > 0.5 ? '#6a3a2a' : '#4a4a4a'), R(-200, -142), R(-8, -4.2), R(0, 6));
  for (let i = 0; i < 10; i++) place(M.makeRock(R(0.4, 1.0), '#5a5450', i + 120), R(-204, -140), R(3, 7), R(0, 6), -0.1);
  // moloz kapısı
  const rubble = M.makeRubble(); place(rubble, -139.2, 0);
  W.gates.shipyard = rubble;

  // ---------- ARKA PLAN TEPELERİ ----------
  const hillMat = M.mat('#3c5a36'), hillMat2 = M.mat('#4a6040'), mountMat = M.mat('#4a5560');
  const mountainGeo = (r, h, seed) => {
    const g = new THREE.ConeGeometry(r, h, 11, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > h / 2 - 0.01 || y < -h / 2 + 0.01) continue;
      const k = 1 + (Math.sin(p.getX(i) * 0.37 + seed) * Math.cos(p.getZ(i) * 0.41 + seed * 2) * 0.16) + (rnd() - 0.5) * 0.1;
      p.setXYZ(i, p.getX(i) * k, y + (rnd() - 0.5) * h * 0.06, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  };
  for (let i = 0; i < 12; i++) {
    const h = new THREE.Mesh(mountainGeo(R(24, 40), R(16, 28), i), i % 2 ? hillMat : hillMat2);
    h.position.set(-150 + i * 12.5 + R(-4, 4), R(-4, 0), -62 - R(0, 25)); h.scale.z = 0.6;
    root.add(h);
  }
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(mountainGeo(R(55, 85), R(60, 100), i + 20), mountMat);
    m.position.set(-300 + i * 48, -6, -200 - R(0, 50));
    root.add(m);
  }
  // Ağaçlarla kaplı tepe sırtı
  for (let i = 0; i < 70; i++) {
    const t = M.makePine(R(7, 12), i);
    const x = R(-150, 5), z = -R(40, 60);
    t.position.set(x, terrainHeight(x, -46) + R(0, 6), z);
    root.add(t);
  }

  // ---------- MARTILAR ----------
  for (let i = 0; i < 6; i++) {
    const g = M.makeGull();
    g.userData = { ...g.userData, cx: R(20, 130), cy: R(8, 14), cz: R(-12, -4), r: R(6, 14), sp: R(0.3, 0.6) * (rnd() > 0.5 ? 1 : -1), ph: R(0, 6) };
    root.add(g); W.gulls.push(g);
  }

  // Hareketsiz geometriyi birleştir (çizim çağrısı optimizasyonu)
  const skip = new Set([...W.boats, ...W.gulls, W.gates.forest, W.gates.shipyard, W.extras.farBoat, W.extras.wreckBoat, W.extras.playerBoat]);
  W.mergeStats = mergeStatic(root, skip);

  W.update = (dt, t, nightF, weather) => {
    for (const b of W.boats) {
      const ph = b.userData.phase;
      b.position.y = waveHeight(b.position.x, b.position.z, G.sea.t) - 0.12 + Math.sin(t * 1.2 + ph) * 0.05;
      b.rotation.z = Math.sin(t * 0.9 + ph) * 0.05 * weather.cur.waves;
      b.rotation.x = Math.sin(t * 0.7 + ph * 2) * 0.03 * weather.cur.waves;
    }
    // uzaktaki tekne gündüz geçer
    const fb = W.extras.farBoat;
    fb.visible = nightF < 0.5;
    fb.position.x = ((t * 2.2) % 520) - 140;
    fb.position.y = waveHeight(fb.position.x, fb.position.z, G.sea.t) - 0.5;
    // martılar
    for (const g of W.gulls) {
      const u = g.userData;
      u.ph += dt * u.sp;
      g.position.set(u.cx + Math.cos(u.ph) * u.r, u.cy + Math.sin(u.ph * 2.3) * 0.6, u.cz + Math.sin(u.ph) * 3);
      g.rotation.y = -u.ph - (u.sp > 0 ? 0 : Math.PI);
      const f = Math.sin(t * 9 + u.cx) * 0.5;
      u.wings[0].rotation.x = f; u.wings[1].rotation.x = -f;
      g.visible = nightF < 0.6 && weather.cur.rain < 0.5;
    }
    // rüzgârda sallanan ağaçlar
    const wind = weather.cur.wind;
    for (let i = 0; i < W.swayers.length; i += 1) {
      const s = W.swayers[i];
      s.rotation.z = Math.sin(t * (0.8 + wind) + i) * 0.015 * (0.4 + wind * 2);
    }
  };

  return W;
}

export function lighthouseDoorX() { return LIGHTHOUSE_X; }
export { randRange };
