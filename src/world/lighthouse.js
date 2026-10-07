// Fenerin içi: kuş bakışı (Stardew tarzı) yuvarlak katlar, tamir, temizlik, bodrum
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as M from './models.js';
import { G } from '../game.js';
import { mergeStatic } from './merge.js';
import { weightedPick, randInt, randRange, pick, chance, clamp } from '../core/utils.js';
import { itemName, itemIcon } from '../data/items.js';
import { lampMenu } from '../systems/interactions.js';
import { WEATHER } from './weather.js';
import { LIGHTHOUSE_X } from './world.js';

export const FENER_X = 3000;
export const FLOOR_INFO = {
  '-1': { name: 'Bodrum', r: 6.4 },
  0: { name: 'Zemin Kat', r: 6.2 },
  1: { name: '1. Kat · Atölye', r: 5.8 },
  2: { name: '2. Kat · Gözlem', r: 5.4 },
  3: { name: 'Lamba Odası', r: 4.6 },
};
export const fc = f => FENER_X + (f + 1) * 40; // katın dünya merkezi (x)
const upSide = f => (f % 2 === 0 ? 1 : -1);
const downSide = f => upSide(f - 1);
export const stairUp = f => { const r = FLOOR_INFO[f].r; return { x: upSide(f) * r * 0.5, z: -r * 0.55 }; };
export const stairDown = f => { const r = FLOOR_INFO[f].r; return { x: downSide(f) * r * 0.5, z: -r * 0.55 }; };
export const DOOR = { x: 0, z: 5.25 };
export const BED = { x: -4.35, z: 1.4 };
export const WAKE = { x: -3.3, z: 1.4 };

// ------------------------------------------------------------------ dokular
function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 4;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function planks(x, w, h, base) {
  const rows = 9, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let px = -rnd(0, 120);
    while (px < w) {
      const len = rnd(90, 220);
      const l = rnd(-12, 12);
      x.fillStyle = `hsl(${base[0] + rnd(-4, 4)}, ${base[1]}%, ${base[2] + l * 0.4}%)`;
      x.fillRect(px, r * rh, len, rh);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px, r * rh, 2, rh);
      x.fillStyle = 'rgba(0,0,0,0.25)';
      x.beginPath(); x.arc(px + 7, r * rh + 7, 1.8, 0, 7); x.arc(px + 7, r * rh + rh - 7, 1.8, 0, 7); x.fill();
      for (let k = 0; k < 4; k++) { x.strokeStyle = `rgba(0,0,0,${rnd(0.04, 0.1)})`; x.beginPath(); const yy = r * rh + rnd(4, rh - 4); x.moveTo(px, yy); x.lineTo(px + len, yy + rnd(-2, 2)); x.stroke(); }
      px += len;
    }
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, r * rh, w, 2);
  }
}
const TEX = {
  wood: () => canvasTex(512, 512, (x, w, h) => planks(x, w, h, [28, 38, 34]), [2, 2]),
  woodOld: () => canvasTex(512, 512, (x, w, h) => { planks(x, w, h, [26, 22, 28]); for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(20,14,8,${rnd(0.1, 0.3)})`; x.beginPath(); x.ellipse(rnd(0, w), rnd(0, h), rnd(10, 40), rnd(5, 18), rnd(0, 3), 0, 7); x.fill(); } }, [2, 2]),
  stone: () => canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#2a2826'; x.fillRect(0, 0, w, h);
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
      const ox = gx * 86 + rnd(-4, 4), oy = gy * 86 + rnd(-4, 4);
      const v = rnd(-8, 8);
      x.fillStyle = `hsl(30, 6%, ${30 + v}%)`; x.fillRect(ox + 3, oy + 3, 80 + rnd(-6, 2), 80 + rnd(-6, 2));
      x.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 5; k++) x.fillRect(ox + rnd(5, 70), oy + rnd(5, 70), rnd(3, 10), rnd(3, 10));
    }
    for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(20,40,40,${rnd(0.15, 0.35)})`; x.beginPath(); x.ellipse(rnd(0, w), rnd(0, h), rnd(20, 70), rnd(15, 40), 0, 0, 7); x.fill(); }
  }, [2, 2]),
  metal: () => canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#4a4c50'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#2a2c30'; x.lineWidth = 4;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 32); x.lineTo(w, i * 32); x.stroke(); }
  }, [3, 3]),
  wall: (dark) => canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = dark ? '#3a3632' : '#d8cdb8'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { x.fillStyle = dark ? `rgba(20,40,30,${rnd(0.05, 0.2)})` : `rgba(120,100,70,${rnd(0.03, 0.1)})`; x.beginPath(); x.ellipse(rnd(0, w), rnd(0, h * 0.6), rnd(10, 60), rnd(10, 40), 0, 0, 7); x.fill(); }
    // alt taş sıra
    const sy = h * 0.62;
    for (let r = 0; r < 3; r++) for (let c = -1; c < 9; c++) {
      x.fillStyle = `hsl(28, 8%, ${(dark ? 22 : 42) + rnd(-5, 5)}%)`;
      x.fillRect(c * 64 + (r % 2) * 32 + 2, sy + r * 33 + 2, 60, 29);
    }
    if (!dark) { x.fillStyle = '#6a4a30'; x.fillRect(0, sy - 8, w, 8); }
  }, [7, 1]),
};

// ------------------------------------------------------------------ küçük yardımcılar
const smat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
function rbx(g, w, h, d, m, x, y, z, r = 0.04) {
  const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), typeof m === 'string' ? smat(m) : m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
}

// ------------------------------------------------------------------ kurulum
export function buildLighthouseInterior(G) {
  const floors = {};
  const statics = []; // { floor, x, z, w, d, cond }
  const inters = [];
  const anim = []; // her karede çağrılacak
  const dyn = {}; // değişken objeler
  const skyWin = new THREE.MeshBasicMaterial({ color: '#88aacc' });
  const S = () => G.state;
  const L = () => S().lighthouse.level;

  const block = (floor, x, z, w, d, cond) => statics.push({ floor, x, z, w, d, cond });
  const inter = (floor, x, z, o) => inters.push({ area: 'fener_ic', floor, x: fc(floor) + x, z, range: 0.95, ...o });

  for (const f of [-1, 0, 1, 2, 3]) {
    const r = FLOOR_INFO[f].r;
    const g = new THREE.Group(); g.position.set(fc(f), 0, 0);
    G.scene.add(g); floors[f] = g;
    const base = f === -1;
    const lampRoom = f === 3;
    // zemin
    const fm = new THREE.MeshStandardMaterial({ map: base ? TEX.stone() : lampRoom ? TEX.metal() : (f === 0 ? TEX.wood() : TEX.woodOld()), roughness: base ? 0.75 : 0.85 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(r + 0.1, 56), fm);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.05, r + 1.05, 0.6, 56), smat('#2a2622'));
    rim.position.y = -0.31; g.add(rim);
    // duvarlar: arka yarı yüksek, ön yarı alçak (kesit)
    const wallTex = TEX.wall(base);
    const wallH = lampRoom ? 0.9 : 3.1;
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.35, wallH, 56, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.BackSide, roughness: 0.95 }));
    back.position.y = wallH / 2; back.receiveShadow = true; g.add(back);
    const front = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.35, 0.5, 56, 1, true, -Math.PI / 2, Math.PI), smat(base ? '#3a3632' : '#8a7e6e', { roughness: 0.95 }));
    front.position.y = 0.25; g.add(front);
    const capM = smat('#3a3430', { roughness: 1 });
    const capB = new THREE.Mesh(new THREE.RingGeometry(r + 0.35, r + 1.05, 56, 1, 0, Math.PI), capM); capB.rotation.x = -Math.PI / 2; capB.position.y = wallH; g.add(capB);
    const capF = new THREE.Mesh(new THREE.RingGeometry(r + 0.35, r + 1.05, 56, 1, Math.PI, Math.PI), capM); capF.rotation.x = -Math.PI / 2; capF.position.y = 0.5; g.add(capF);
    // pencereler (arka duvar)
    if (!base && !lampRoom) {
      for (const a of [-0.55, 0.55]) {
        const th = Math.PI + a; // arka taraf (z<0)
        const wx = Math.sin(th) * (r + 0.32), wz = Math.cos(th) * (r + 0.32);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), skyWin);
        w.position.set(wx, 1.8, wz); w.lookAt(0, 1.8, 0); g.add(w);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.4), smat('#5a4430')); fr.position.set(wx * 0.97, 1.15, wz * 0.97); fr.lookAt(0, 1.15, 0); g.add(fr);
      }
    }
    if (lampRoom) {
      // her yanı camla çevrili
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.3, r + 0.3, 2.6, 56, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#a8d0e0', transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide }));
      glass.position.y = 0.9 + 1.3; g.add(glass);
      for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i / 10 * Math.PI; const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), smat('#1e1e22')); m.position.set(Math.sin(a) * (r + 0.3), 2.2, Math.cos(a) * (r + 0.3)); g.add(m); }
      const sky = new THREE.Mesh(new THREE.CylinderGeometry(r + 2.5, r + 2.5, 6, 32, 1, true, Math.PI / 2, Math.PI), skyWin); sky.position.y = 2; g.add(sky);
    }
    // yukarı merdiven (döner)
    if (f < 3) {
      const s = stairUp(f);
      const st = new THREE.Group(); st.position.set(s.x, 0, s.z);
      st.add(M.cyl(0.1, 0.1, 3.2, '#3a2a1a', 8, 0, 1.6, 0));
      for (let i = 0; i < 9; i++) {
        const a = i * 0.62 * -upSide(f) + Math.PI / 2;
        const step = rbx(st, 0.9, 0.08, 0.36, '#7a5a3a', Math.cos(a) * 0.5, 0.2 + i * 0.33, -Math.sin(a) * 0.5, 0.02);
        step.rotation.y = a;
      }
      g.add(st);
      block(f, s.x, s.z, 1.5, 1.5);
      inter(f, s.x, s.z + 1.3, { label: '⬆️ Yukarı çık', action: () => G.changeFloor(f + 1) });
    }
    // aşağı inen açıklık
    if (f > -1) {
      const s = stairDown(f);
      const hole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 1.3), new THREE.MeshBasicMaterial({ color: '#050403' }));
      hole.position.set(s.x, 0.012, s.z); g.add(hole);
      for (const [dx, dz, w, d] of [[0, -0.68, 1.42, 0.08], [-0.68 * downSide(f), 0, 0.08, 1.42]]) rbx(g, w, 0.9, d, '#5a4430', s.x + dx, 0.45, s.z + dz, 0.02);
      for (let i = 0; i < 3; i++) rbx(g, 1.0, 0.06, 0.3, '#6a4a2e', s.x, -0.15 - i * 0.25, s.z - 0.3 + i * 0.3, 0.02);
      block(f, s.x, s.z, 1.4, 1.4);
      inter(f, s.x, s.z + 1.3, { label: f === 0 ? '⬇️ Bodruma in' : '⬇️ Aşağı in', action: () => G.changeFloor(f - 1) });
    }
    // tavan lambası ışığı
    G.env.addLight({
      area: 'fener_ic', pos: new THREE.Vector3(fc(f), lampRoom ? 2.2 : 2.7, -0.6), color: base ? '#d8e0ff' : '#ffc890', distance: 13, flicker: base,
      on: () => G.player.floor === f && (!base || S().flags.rep_jenerator),
      intensity: () => {
        const gen = S().flags.rep_jenerator ? 1.35 : 1;
        if (base) return Math.random() < 0.03 ? 0.5 : 7;
        if (lampRoom) return 4 * gen;
        const lv = f === 0 ? (L() >= 2 ? 15 : 10) : f === 1 ? (L() >= 3 ? 14 : 7) : (L() >= 4 ? 14 : 6);
        return lv * gen;
      },
    });
  }

  // ================================================================= ZEMİN KAT (0)
  {
    const g = floors[0];
    // kapı & paspas
    rbx(g, 1.6, 0.03, 0.9, '#6a3a2a', DOOR.x, 0.02, DOOR.z + 0.2, 0.01);
    for (const sx of [-0.85, 0.85]) rbx(g, 0.2, 2.3, 0.3, '#4a3020', sx, 1.15, FLOOR_INFO[0].r + 0.2);
    rbx(g, 1.9, 0.25, 0.32, '#4a3020', 0, 2.35, FLOOR_INFO[0].r + 0.2);
    inter(0, DOOR.x, DOOR.z, {
      label: () => G.night.knock?.state === 'knocking' ? '🚪 Kapıyı aç' : '🚪 Dışarı çık', range: 1.1,
      action: () => { if (G.night.doorEvent()) return; G.audio.door(false); G.setArea('world', LIGHTHOUSE_X - 0.6); },
    });
    // yatak
    dyn.bedOld = M.makeBed(false); dyn.bedOld.rotation.y = Math.PI / 2; dyn.bedOld.position.set(BED.x, 0, BED.z); g.add(dyn.bedOld);
    dyn.bedNew = M.makeBed(true); dyn.bedNew.rotation.y = Math.PI / 2; dyn.bedNew.position.set(BED.x, 0, BED.z); g.add(dyn.bedNew);
    block(0, BED.x, BED.z, 1.15, 2.25);
    inter(0, WAKE.x - 0.1, BED.z, { label: () => G.hour >= 18 ? '🛏️ Uyu' : '🛏️ Yatak (uyu)', action: () => G.day.sleep() });
    // geliştirme panosu
    const board = new THREE.Group();
    rbx(board, 1.3, 1.0, 0.08, '#6a4a2a', 0, 1.7, 0);
    rbx(board, 0.5, 0.6, 0.02, '#e8dcc0', -0.25, 1.75, 0.05); rbx(board, 0.4, 0.4, 0.02, '#d8c8a0', 0.3, 1.8, 0.05);
    board.position.set(-1.1, 0, -5.9); g.add(board);
    inter(0, -1.1, -4.85, { label: '📋 Geliştirme panosu', action: () => G.ui.openUpgrade() });
    // çalışma masası (Sv.2)
    dyn.bench = M.makeWorkbench(); dyn.bench.position.set(1.15, 0, -4.85); g.add(dyn.bench);
    block(0, 1.15, -4.85, 1.9, 0.9, () => L() >= 2);
    inter(0, 1.15, -3.95, { enabled: () => L() >= 2, label: '🔨 Çalışma masası', action: () => G.ui.openCraft('fener') });
    // sandık
    dyn.chest = M.makeChest(); dyn.chest.rotation.y = -Math.PI / 2; dyn.chest.position.set(5.0, 0, -1.6); g.add(dyn.chest);
    block(0, 5.0, -1.6, 0.7, 1.1, () => S().hasChest);
    inter(0, 4.1, -1.6, { enabled: () => S().hasChest, label: '📦 Sandık', action: () => { G.audio.chest(); G.ui.openChest(); } });
  }

  // ================================================================= 1. KAT
  {
    const g = floors[1];
    dyn.secretDoor = rbx(g, 1.2, 2.2, 0.25, '#3a2414', 0, 1.1, -5.75);
    dyn.secretOpen = rbx(g, 1.1, 2.1, 0.1, '#050403', 0, 1.06, -5.62);
    inter(1, 0, -4.75, {
      label: () => L() >= 3 ? (S().clues.includes('c02') ? '🚪 Gizli oda (boş)' : '🚪 Gizli oda') : '🔒 Kilitli kapı',
      action: () => {
        if (L() < 3) { G.ui.toast('Paslı, ağır bir kilit. Bu katı onarınca (Fener Seviye 3) açabilirsin.', 'info'); return; }
        if (S().clues.includes('c02')) { G.ui.toast('Gizli oda boş. Yalnızca tuz ve küf kokusu.', 'info'); return; }
        G.ui.dialog({ speaker: null, lines: ['Kapı gıcırdayarak açılıyor. İçerisi küçük, penceresiz bir oda.', 'Bir sandığın içinde, yağlı bezlere sarılmış ıslak bir seyir defteri buluyorsun.', 'Kapağında soluk harflerle: AURELIA — 1927.', 'Sayfalar hâlâ ıslak. Seksen yıldır.'], onEnd: () => G.mystery.addClue('c02') });
      },
    });
    // atölye eşyaları (Sv.3)
    dyn.workshop = new THREE.Group(); g.add(dyn.workshop);
    const wb = M.makeWorkbench(); wb.rotation.y = Math.PI / 2; wb.position.set(-3.6, 0, 1.0); dyn.workshop.add(wb);
    rbx(dyn.workshop, 0.9, 0.85, 1.3, '#4a5a6a', 3.6, 0.42, 1.2); // yem tezgâhı
    for (let i = 0; i < 4; i++) rbx(dyn.workshop, 0.12, 0.12, 0.12, ['#c84', '#4a8', '#d55', '#58c'][i], 3.4 + (i % 2) * 0.3, 0.92, 0.8 + i * 0.25);
    rbx(dyn.workshop, 1.6, 0.08, 1.1, '#6a4a2a', 0, 0.9, 2.4); rbx(dyn.workshop, 1.4, 0.02, 0.9, '#d8c8a0', 0, 0.95, 2.4);
    for (const [x, z] of [[-0.7, 2.0], [0.7, 2.0], [-0.7, 2.8], [0.7, 2.8]]) rbx(dyn.workshop, 0.08, 0.9, 0.08, '#4a3020', x, 0.45, z);
    for (let i = 0; i < 5; i++) rbx(dyn.workshop, 0.08, 1.4, 0.06, '#8a6a3a', -2.4 + i * 0.3, 1.4, -5.6);
    block(1, -3.6, 1.0, 0.9, 1.9, () => L() >= 3);
    block(1, 3.6, 1.2, 1.0, 1.4, () => L() >= 3);
    block(1, 0, 2.4, 1.7, 1.2, () => L() >= 3);
    inter(1, -2.6, 1.0, { enabled: () => L() >= 3, label: '🔨 Atölye tezgâhı', action: () => G.ui.openCraft('fener3') });
    inter(1, 2.6, 1.2, { enabled: () => L() >= 3, label: '🪱 Yem tezgâhı', action: () => G.ui.openCraft('fener3') });
    inter(1, 0, 1.4, { enabled: () => L() >= 3, label: '🗺️ Harita masası', action: () => G.ui.openNotebook('harita') });
    dyn.brokenBoards = new THREE.Group(); g.add(dyn.brokenBoards);
    for (let i = 0; i < 6; i++) { const b = rbx(dyn.brokenBoards, 1.2, 0.06, 0.25, '#4a3020', -1 + (i % 3) * 0.9, 0.05 + (i % 2) * 0.05, -1 + Math.floor(i / 3) * 0.6, 0.02); b.rotation.set(0.1 * i, i * 0.7, 0.15); }
  }

  // ================================================================= 2. KAT
  {
    const g = floors[2];
    dyn.observatory = new THREE.Group(); g.add(dyn.observatory);
    const scope = M.cyl(0.18, 0.12, 2.0, '#8a7040', 8, 0.4, 1.5, -3.9); scope.rotation.x = 0.9; dyn.observatory.add(scope);
    dyn.observatory.add(M.cyl(0.05, 0.05, 1.3, '#2a2a2a', 5, 0.4, 0.65, -3.6));
    rbx(dyn.observatory, 1.3, 0.85, 0.8, '#5a4030', -3.3, 0.42, 1.0);
    rbx(dyn.observatory, 0.9, 0.55, 0.5, '#4a3a2a', -3.3, 1.12, 1.0);
    dyn.radioLight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#3f3' })); dyn.radioLight.position.set(-3.0, 1.25, 1.27); dyn.observatory.add(dyn.radioLight);
    rbx(dyn.observatory, 0.5, 2.0, 1.6, '#5a3a22', 3.6, 1.0, 1.2);
    for (let i = 0; i < 9; i++) rbx(dyn.observatory, 0.3, 0.42, 0.12, ['#7a2a2a', '#2a4a6a', '#5a5a2a'][i % 3], 3.3, 0.45 + Math.floor(i / 3) * 0.6, 0.6 + (i % 3) * 0.4, 0.01);
    block(2, 0.4, -3.8, 0.8, 0.8, () => L() >= 4);
    block(2, -3.3, 1.0, 1.4, 0.9, () => L() >= 4);
    block(2, 3.6, 1.2, 0.6, 1.7, () => L() >= 4);
    inter(2, -2.3, 1.0, {
      enabled: () => L() >= 4, label: '📻 Radyo',
      action: () => {
        G.audio.radio();
        const h = G.hour;
        if (h >= 22 && !S().clues.includes('c12')) G.ui.dialog({ speaker: null, lines: ['Parazitin içinden bir ses...', '"...Aurelia\'dan karaya... konum 48 kuzey... ada... ışığı görüyoruz... bizi bekleyin..."', 'Ardından şarkı söyleyen sesler. Sonra sessizlik.'], onEnd: () => G.mystery.addClue('c12') });
        else if (h >= 22) G.ui.toast('Parazit... ve çok uzaktan, bir şarkının kırıntıları.', 'mystery');
        else G.ui.toast('Yalnızca parazit. Belki gece bir şey duyulabilir.', 'info');
      },
    });
    inter(2, 0.4, -2.9, {
      enabled: () => L() >= 4, label: '🔭 Teleskop',
      action: () => {
        const s = S(), w = WEATHER[s.tomorrowWeather];
        const lines = [`Yarın için gökyüzü: ${w.icon} ${w.name}.`];
        if (G.hour >= 18 && s.nightEvent) {
          const hint = { normal: 'Deniz bu gece sakin görünüyor.', sis: 'Ufukta kalın bir sis duvarı birikiyor.', sesler: 'Sahil boş. Ama rüzgârın sesi... kelimeye benziyor.', ayak_izleri: 'Islak kumda bir şeyler kımıldıyor gibi.', siluet: 'Su kenarında biri mi duruyor? Göz kırpınca yok.', uzak_isik: 'Ufukta, çok uzakta soluk bir ışık yanıp sönüyor.', hayalet_gemi: 'Ufukta yelken gibi bir şey... sonra hiçbir şey.', npc_kayip: 'Kasabanın bir penceresinde ışık hiç yanmadı.', fener_ariza: 'Lamba mekanizmasından tuhaf bir tıkırtı geliyor.', yaratik: 'Denizin yüzeyi bir yerde fazla düz. Sanki altında bir şey var.', ozel: 'Bu gece bir şey farklı. Tarif edemiyorsun.' }[s.nightEvent];
          lines.push('Bu gece: ' + hint);
        } else lines.push('Gece olunca denizi gözlemek daha anlamlı olabilir.');
        G.ui.dialog({ speaker: null, lines });
      },
    });
    inter(2, 2.6, 1.2, { enabled: () => L() >= 4, label: '📚 Eski deniz kayıtları', action: () => G.ui.dialog({ speaker: null, lines: ['1889: Fener inşa edildi. Mimarın notu: "Işık denize doğru değil, denizin üzerine — bir çit gibi."', '1927: Bekçi kaydı boş. 14-17 Kasım sayfaları yırtılmış.', '1947, 1967, 1987: Her biri Kasım. Her birinde aynı not: "Işık söndü."', 'Son sayfada Aron Lind\'in el yazısı: "Kapıyı ben açacağım. Jonas\'ı geri getireceğim."'] }) });
    dyn.brokenScope = new THREE.Group(); g.add(dyn.brokenScope);
    const bs = M.cyl(0.16, 0.1, 1.6, '#6a5a3a', 8, 0.6, 0.15, -3.5); bs.rotation.z = Math.PI / 2; dyn.brokenScope.add(bs);
  }

  // ================================================================= LAMBA ODASI (3)
  {
    const g = floors[3];
    dyn.lamp = new THREE.Group();
    dyn.lamp.add(M.cyl(0.6, 0.85, 1.0, '#3a3a3e', 12, 0, 0.5, 0));
    dyn.lensMat = new THREE.MeshStandardMaterial({ color: '#c8e0e8', emissive: new THREE.Color('#ffe6a0'), emissiveIntensity: 0, transparent: true, opacity: 0.8, roughness: 0.1, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const rr = new THREE.Mesh(new THREE.TorusGeometry(0.75 - Math.abs(i - 2.5) * 0.08, 0.08, 4, 14), dyn.lensMat);
      rr.rotation.x = Math.PI / 2; rr.position.y = 1.25 + i * 0.22; dyn.lamp.add(rr);
    }
    dyn.core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: '#4a4030' }));
    dyn.core.position.y = 1.8; dyn.lamp.add(dyn.core);
    dyn.lamp.add(M.cyl(0.85, 0.85, 0.1, '#2a2a2e', 12, 0, 2.7, 0));
    dyn.lamp.position.set(0, 0, -0.3); g.add(dyn.lamp);
    dyn.brokenLamp = new THREE.Group(); g.add(dyn.brokenLamp);
    dyn.brokenLamp.add(M.cyl(0.6, 0.85, 1.0, '#3a3a3e', 12, 0, 0.5, -0.3));
    for (let i = 0; i < 8; i++) { const s = M.box(0.22, 0.04, 0.16, '#9ab8c0', Math.sin(i) * 1.3, 0.04, -0.3 + Math.cos(i * 2) * 0.9); s.rotation.y = i; dyn.brokenLamp.add(s); }
    block(3, 0, -0.3, 1.9, 1.9);
    inter(3, 0, 1.05, { range: 1.3, label: () => S().flags.lampRepaired ? '🔆 Fener lambası' : '🔧 Lambayı onar', action: () => lampMenu() });
    // masa ve not
    rbx(g, 1.3, 0.08, 0.7, '#5a3a22', -2.5, 0.9, 1.5);
    for (const [x, z] of [[-3.05, 1.25], [-1.95, 1.25], [-3.05, 1.75], [-1.95, 1.75]]) rbx(g, 0.07, 0.9, 0.07, '#4a2a18', x, 0.45, z);
    dyn.note = rbx(g, 0.35, 0.02, 0.45, '#e8dcc0', -2.6, 0.95, 1.5, 0.005);
    block(3, -2.5, 1.5, 1.35, 0.75);
    inter(3, -2.5, 2.4, {
      enabled: () => !S().clues.includes('c01'), label: '📄 Eski not',
      action: () => G.ui.dialog({ speaker: null, lines: ['Masada sararmış bir kâğıt. Eski bekçinin el yazısı:', '"Son gece denizde bir ışık gördüm. Bizim ışığımıza cevap veriyordu. Üç kısa, bir uzun. Tıpkı 1927 kayıtlarındaki gibi."', '"Jonas onu görmeye gitti. Ben de gidiyorum. — A."'], onEnd: () => { G.mystery.addClue('c01'); area.refresh(S()); } }),
    });
    rbx(g, 0.5, 1.1, 0.4, '#5a3a22', 2.2, 0.55, 2.1);
    rbx(g, 0.45, 0.06, 0.35, '#3a2a4a', 2.2, 1.12, 2.1);
    block(3, 2.2, 2.1, 0.6, 0.5);
    inter(3, 1.4, 2.6, { label: '📖 Fener defteri', action: () => { const s = S(); G.ui.dialog({ speaker: null, lines: [`Yanan geceler: ${s.stats.nightsLit ?? 0} · Üst üste: ${s.stats.litStreak ?? 0}`, `Hazne: ${s.lighthouse.fuel.toFixed(1)} / ${G.lamp.capacity().toFixed(1)} saat · Fener Seviye ${s.lighthouse.level}`, 'Eski bekçinin son kaydı: "Işık bir kapıdır. Kapalı tutun."'] }); } });
    for (const [x, z] of [[-2.7, -1.8], [-2.1, -2.5]]) { const b = M.makeBarrel('#3a4a3a'); b.position.set(x, 0, z); g.add(b); }
    block(3, -2.4, -2.15, 1.3, 1.3);
    G.env.addLight({ area: 'fener_ic', pos: new THREE.Vector3(fc(3), 2.6, -0.3), color: '#fff0c0', distance: 12, intensity: () => S().lighthouse.lit ? 12 : 0, on: () => S().lighthouse.lit && G.player.floor === 3 });
  }

  // ================================================================= BODRUM (-1)
  const B = { scareT: 30, whisperT: 0, still: 0, lastPos: new THREE.Vector3(), rats: [], drips: [], mirrorScare: null };
  {
    const g = floors[-1];
    // jeneratör
    dyn.gen = new THREE.Group();
    rbx(dyn.gen, 1.7, 1.0, 1.0, '#4a5a4a', 0, 0.5, 0, 0.08);
    dyn.gen.add(M.cyl(0.35, 0.35, 1.05, '#3a3a3e', 12, 0.45, 0.55, 0));
    dyn.genWheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 16), smat('#8a8a8a', { metalness: 0.6 })); dyn.genWheel.position.set(-0.86, 0.6, 0); dyn.genWheel.rotation.y = Math.PI / 2; dyn.gen.add(dyn.genWheel);
    dyn.genLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: '#f33' })); dyn.genLight.position.set(-0.3, 1.02, 0.5); dyn.gen.add(dyn.genLight);
    for (let i = 0; i < 3; i++) dyn.gen.add(M.cyl(0.03, 0.03, 1.4, '#2a2a2a', 4, 0.6 - i * 0.2, 1.6, -0.3)); // kablolar
    dyn.gen.position.set(3.7, 0, -2.6); g.add(dyn.gen);
    block(-1, 3.7, -2.6, 1.8, 1.1);
    // çıplak ampul (jeneratör onarılınca)
    dyn.bulbWire = M.cyl(0.01, 0.01, 1.4, '#1a1a1a', 4, 0, 2.6, -0.5); g.add(dyn.bulbWire);
    dyn.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#e0e8ff', emissiveIntensity: 0 })); dyn.bulb.position.set(0, 1.85, -0.5); g.add(dyn.bulb);
    // sızdıran boru
    const pipe = M.cyl(0.12, 0.12, 4.4, '#5a4a3a', 8, 1.4, 2.4, -5.9); pipe.rotation.z = Math.PI / 2; g.add(pipe);
    g.add(M.cyl(0.12, 0.12, 2.4, '#5a4a3a', 8, 3.55, 1.2, -5.9));
    dyn.pipeFix = M.cyl(0.17, 0.17, 0.35, '#a87a3a', 8, 1.4, 2.4, -5.9); dyn.pipeFix.rotation.z = Math.PI / 2; g.add(dyn.pipeFix);
    dyn.puddle = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), new THREE.MeshStandardMaterial({ color: '#1a2a2e', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.8 }));
    dyn.puddle.rotation.x = -Math.PI / 2; dyn.puddle.scale.set(1.4, 0.8, 1); dyn.puddle.position.set(1.4, 0.015, -4.6); g.add(dyn.puddle);
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), new THREE.MeshBasicMaterial({ color: '#8ab0c0' })); d.visible = false; g.add(d); B.drips.push({ m: d, y: 2.3, v: 0, t: i * 0.7 }); }
    // demir kapak (denize açılır)
    dyn.hatch = new THREE.Group();
    dyn.hatch.add(M.cyl(0.9, 0.95, 0.08, '#3a3430', 20, 0, 0.04, 0));
    dyn.hatchLid = M.cyl(0.78, 0.78, 0.1, '#4a3e36', 20, 0, 0.1, 0); dyn.hatch.add(dyn.hatchLid);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; dyn.hatch.add(M.cyl(0.05, 0.05, 0.06, '#2a2420', 6, Math.cos(a) * 0.68, 0.17, Math.sin(a) * 0.68)); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 14), smat('#2a2420', { metalness: 0.5 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.17; dyn.hatch.add(ring);
    dyn.seal = new THREE.Group();
    for (const a of [0.4, -0.5]) { const p = rbx(dyn.seal, 2.0, 0.12, 0.3, '#5a5a60', 0, 0.22, 0, 0.03); p.rotation.y = a; }
    dyn.hatch.add(dyn.seal);
    dyn.hatch.position.set(0, 0, 2.2); g.add(dyn.hatch);
    // zincirler
    for (const [x, z] of [[-1.3, 3.2], [1.4, 3.4]]) {
      for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 4, 8), smat('#3a3632', { metalness: 0.6 })); l.position.set(x, 2.9 - k * 0.13, z); l.rotation.y = k % 2 ? 0 : Math.PI / 2; g.add(l); }
    }
    // dalış elbisesi (duvarda asılı)
    dyn.suit = new THREE.Group();
    const canvas = smat('#6a6050', { roughness: 1 });
    rbx(dyn.suit, 0.6, 0.9, 0.4, canvas, 0, 1.3, 0, 0.12);
    for (const s of [-1, 1]) { rbx(dyn.suit, 0.2, 0.75, 0.22, canvas, 0, 0.5, s * 0.14, 0.08); rbx(dyn.suit, 0.18, 0.7, 0.18, canvas, 0.0, 1.2, s * 0.38, 0.07); }
    dyn.helmet = new THREE.Group(); dyn.helmet.position.y = 2.0;
    dyn.helmet.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), smat('#a8783a', { metalness: 0.7, roughness: 0.35 })));
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), new THREE.MeshStandardMaterial({ color: '#0a1416', roughness: 0.05, metalness: 0.5, emissive: '#000', emissiveIntensity: 0 }));
    port.position.set(0.31, 0, 0); port.rotation.y = Math.PI / 2; dyn.helmet.add(port); dyn.port = port;
    const pring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 14), smat('#c8a050', { metalness: 0.8 })); pring.position.set(0.31, 0, 0); pring.rotation.y = Math.PI / 2; dyn.helmet.add(pring);
    dyn.suit.add(dyn.helmet);
    dyn.suit.position.set(5.45, 0, 1.6); dyn.suit.rotation.y = Math.PI; g.add(dyn.suit);
    block(-1, 5.4, 1.6, 0.6, 0.9);
    // örtülü ayna
    dyn.mirror = new THREE.Group();
    rbx(dyn.mirror, 0.12, 2.0, 1.0, '#3a2a1a', 0, 1.1, 0);
    dyn.mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshStandardMaterial({ color: '#8a9aa0', roughness: 0.05, metalness: 0.9 }));
    dyn.mirrorGlass.position.set(0.07, 1.1, 0); dyn.mirrorGlass.rotation.y = Math.PI / 2; dyn.mirror.add(dyn.mirrorGlass);
    dyn.cloth = rbx(dyn.mirror, 0.2, 2.05, 1.1, smat('#d8d0c0', { roughness: 1 }), 0.08, 1.05, 0, 0.08);
    dyn.mirror.position.set(-5.6, 0, 1.4); g.add(dyn.mirror);
    block(-1, -5.6, 1.4, 0.5, 1.1);
    // raflar & kavanozlar
    rbx(g, 1.6, 1.8, 0.45, '#4a3a2a', 3.4, 0.9, 4.3);
    for (let i = 0; i < 8; i++) { const j = M.cyl(0.1, 0.1, 0.28, ['#6a8a5a', '#8a6a3a', '#5a6a7a'][i % 3], 8, 2.85 + (i % 4) * 0.36, 0.5 + Math.floor(i / 4) * 0.7, 4.35); j.material = j.material.clone(); j.material.transparent = true; j.material.opacity = 0.75; g.add(j); }
    block(-1, 3.4, 4.3, 1.7, 0.6);
    // duvardaki çentikler
    const tally = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: '#141210' }));
      const col = i % 5, grp = Math.floor(i / 5);
      m.position.set(-1.6 + (grp % 4) * 0.42 + col * 0.06, 1.2 + Math.floor(grp / 4) * 0.35, 0);
      if (col === 4) { m.rotation.z = 1.1; m.position.x -= 0.12; }
      tally.add(m);
    }
    tally.position.set(-0.4, 0, -6.4); g.add(tally);
    // ıslak ayak izleri (gece)
    dyn.prints = new THREE.Group(); g.add(dyn.prints);
    const st = stairUp(-1);
    for (let i = 0; i < 14; i++) {
      const u = i / 13, fp = M.makeFootprint();
      fp.position.set(u * st.x + (i % 2 ? 0.12 : -0.12), 0.02, 2.2 + u * (st.z + 1.2 - 2.2));
      fp.rotation.z = Math.atan2(st.x, st.z + 1.2 - 2.2);
      dyn.prints.add(fp);
    }
    // fareler
    for (let i = 0; i < 2; i++) {
      const rat = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), smat('#2a2422')); b.scale.set(1.6, 0.8, 0.9); rat.add(b);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.3, 4), smat('#5a4a44')); tail.rotation.z = Math.PI / 2; tail.position.x = -0.3; rat.add(tail);
      rat.visible = false; g.add(rat);
      B.rats.push({ m: rat, t: -randRange(5, 20), a: 0, dir: 1 });
    }
    dyn.sil = M.makeSilhouette(); dyn.sil.visible = false; g.add(dyn.sil);
    // duvardaki ızgaradan sızan soğuk ışık
    const grate = new THREE.Group();
    rbx(grate, 1.0, 0.5, 0.1, '#1a1a1c', 0, 2.5, 0);
    for (let i = 0; i < 5; i++) rbx(grate, 0.04, 0.5, 0.14, '#3a3a3e', -0.4 + i * 0.2, 2.5, 0.02, 0.01);
    grate.position.set(-2.6, 0, -5.95); g.add(grate);
    const shaftM = new THREE.MeshBasicMaterial({ color: '#8fa8d0', transparent: true, opacity: 0.028, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 3.4, 10, 1, true), shaftM);
    shaft.position.set(-2.5, 1.4, -4.7); shaft.rotation.x = -0.7; g.add(shaft);
    dyn.shaft = shaft;
    G.env.addLight({ area: 'fener_ic', pos: new THREE.Vector3(fc(-1) - 2.4, 0.4, -3.6), color: '#8098c8', distance: 7, intensity: () => 2.5 + G.env.night * -1, on: () => G.player.floor === -1 });
  }

  // ------------------------------------------------------------------ tamir edilebilir nesneler
  const REPAIRS = [
    { id: 'jenerator', floor: -1, x: 3.7, z: -1.6, name: 'Jeneratör', cost: { hurda: 4, bakir: 2, halat: 1 }, xp: ['crafting', 35],
      desc: 'Paslı bir dizel jeneratör. Kayışı kopmuş, kabloları çürümüş.', done: 'Jeneratör öksürerek çalıştı! Fenerin her katında ışıklar daha parlak. Bodrumdaki ampul titreyerek yandı.', use: () => G.ui.toast('Jeneratör düzenli bir uğultuyla çalışıyor.', 'info') },
    { id: 'boru', floor: -1, x: 1.4, z: -4.95, name: 'Sızdıran boru', cost: { hurda: 2, halat: 1 }, xp: ['crafting', 15],
      desc: 'Duvardaki boru damla damla tuzlu su sızdırıyor. Tuzlu... deniz suyu mu?', done: 'Boruyu kelepçeyle sardın. Damlama durdu. Sessizlik daha da ağırlaştı.' },
    { id: 'soba', floor: 0, x: 4.1, z: 0.7, name: 'Kırık soba', cost: { hurda: 3, tas: 2 }, xp: ['crafting', 20],
      desc: 'Döküm bir soba. Bacası tıkalı, kapağı menteşesinden kopmuş.', done: 'Soba yeniden yanıyor! Artık yemek pişirebilirsin.', use: () => G.ui.openCraft('soba'), fixedLabel: '🍲 Soba (yemek pişir)' },
    { id: 'saat', floor: 0, x: -5.0, z: -0.9, name: 'Durmuş duvar saati', cost: { bakir: 1, hurda: 1 }, xp: ['crafting', 12],
      desc: 'Duvar saati 03:17\'de durmuş. Sarkacı yerinde ama dişlileri paslı.', done: 'Saat tıkırdamaya başladı. Hiç durmadığı bir zamanı hatırlıyor gibi.', use: () => G.ui.toast(`Saat: ${String(Math.floor(G.hour) % 24).padStart(2, '0')}:${String(Math.floor((G.hour % 1) * 60)).padStart(2, '0')}. Tık, tak.`, 'info') },
    { id: 'doseme', floor: 0, x: -0.6, z: 2.4, name: 'Çökmüş döşeme', cost: { odun: 3 }, xp: ['crafting', 10], range: 1.0,
      desc: 'Birkaç tahta çökmüş. Altında karanlık bir boşluk var.', done: 'Tahtaları yeniledin. Ayağının altı artık sağlam.' },
    { id: 'pencere1', floor: 1, x: 1.7, z: -4.6, name: 'Kırık pencere', cost: { deniz_cami: 2, odun: 1 }, xp: ['crafting', 12],
      desc: 'Camı kırık, rüzgâr içeri tuz taşıyor.', done: 'Deniz camından renkli bir pencere yaptın. Işık yeşilimsi süzülüyor.' },
    { id: 'pencere2', floor: 2, x: -1.4, z: -4.2, name: 'Kırık pencere', cost: { deniz_cami: 2, odun: 1 }, xp: ['crafting', 12],
      desc: 'Pencere tahtalarla kapatılmış. Tahtaların arasından ufuk görünüyor.', done: 'Pencereyi onardın. Buradan bütün koy görünüyor.' },
  ];
  // modeller
  {
    const soba = new THREE.Group();
    rbx(soba, 0.9, 0.8, 0.8, '#2a2a2e', 0, 0.45, 0, 0.08);
    for (const [x, z] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) soba.add(M.cyl(0.05, 0.04, 0.12, '#1a1a1a', 6, x, 0.06, z));
    soba.add(M.cyl(0.11, 0.11, 2.6, '#2a2a2e', 8, 0.2, 2.1, 0));
    dyn.fire = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ color: '#ff7a2a' })); dyn.fire.position.set(-0.46, 0.4, 0); dyn.fire.rotation.y = -Math.PI / 2; soba.add(dyn.fire);
    dyn.sobaDoor = rbx(soba, 0.05, 0.3, 0.45, '#3a3a3e', -0.5, 0.18, 0.12, 0.01); dyn.sobaDoor.rotation.y = 0.6;
    soba.position.set(5.05, 0, 0.7); floors[0].add(soba);
    block(0, 5.05, 0.7, 1.0, 0.95);
    G.env.addLight({ area: 'fener_ic', pos: new THREE.Vector3(fc(0) + 4.4, 0.6, 0.7), color: '#ff8a3a', distance: 6, flicker: true, on: () => S().flags.rep_soba && G.player.floor === 0, intensity: 5 });
    const clock = new THREE.Group();
    rbx(clock, 0.16, 1.8, 0.5, '#5a3a22', 0, 1.3, 0, 0.05);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), smat('#e8dcc0')); face.position.set(0.09, 1.85, 0); face.rotation.y = Math.PI / 2; clock.add(face);
    dyn.hand = M.box(0.02, 0.16, 0.02, '#1a1a1a', 0.1, 1.9, 0); clock.add(dyn.hand);
    dyn.pend = new THREE.Group(); dyn.pend.position.set(0.1, 1.55, 0); dyn.pend.add(M.cyl(0.01, 0.01, 0.5, '#c8a040', 4, 0, -0.25, 0)); dyn.pend.add(M.cyl(0.07, 0.07, 0.02, '#c8a040', 10, 0, -0.5, 0)); clock.add(dyn.pend);
    clock.position.set(-5.85, 0, -0.9); floors[0].add(clock);
    dyn.badFloor = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.8), new THREE.MeshBasicMaterial({ color: '#0a0806' })); hole.position.y = 0.01; dyn.badFloor.add(hole);
    for (let i = 0; i < 3; i++) { const b = M.box(1.2, 0.05, 0.22, '#4a3020', 0, 0.02 + i * 0.03, -0.3 + i * 0.3); b.rotation.set(0.25 * (i - 1), 0.1 * i, 0.3 * (i % 2 ? 1 : -1)); dyn.badFloor.add(b); }
    dyn.badFloor.position.set(-0.6, 0, 2.4); floors[0].add(dyn.badFloor);
    // pencere tahtaları (onarılmamış pencereler)
    dyn.boards1 = new THREE.Group(); dyn.boards2 = new THREE.Group();
    for (const [grp, f, a] of [[dyn.boards1, 1, 0.55], [dyn.boards2, 2, -0.55]]) {
      const r = FLOOR_INFO[f].r, th = Math.PI + a;
      const wx = Math.sin(th) * (r + 0.2), wz = Math.cos(th) * (r + 0.2);
      for (let k = 0; k < 3; k++) { const b = M.box(1.1, 0.16, 0.06, '#5a4030', 0, 1.4 + k * 0.4, 0); b.rotation.z = (k - 1) * 0.15; grp.add(b); }
      grp.position.set(wx, 0, wz); grp.lookAt(0, 0, 0); floors[f].add(grp);
    }
  }
  for (const R of REPAIRS) {
    inter(R.floor, R.x, R.z, {
      range: R.range ?? 1.0,
      label: () => S().flags['rep_' + R.id] ? (R.fixedLabel ?? (R.use ? `⚙️ ${R.name.replace(/^Kırık |^Durmuş |^Sızdıran |^Çökmüş /, '')}` : null)) : `🔧 ${R.name} — onar`,
      enabled: () => !S().flags['rep_' + R.id] || !!R.use,
      action: () => repair(R),
    });
  }
  function repair(R) {
    const s = S();
    if (s.flags['rep_' + R.id]) { R.use?.(); return; }
    const need = Object.entries(R.cost);
    const ok = need.every(([it, n]) => G.inv.has(it, n));
    const costTxt = need.map(([it, n]) => `${itemIcon(it)} ${n} ${itemName(it)} (${G.inv.count(it)})`).join(' · ');
    G.ui.dialog({
      speaker: null, lines: [R.desc + '  Gerekenler: ' + costTxt], menu: true,
      options: [
        { label: ok ? '🔧 Onar' : '🔒 Malzeme yetersiz', onSelect: () => {
          if (!ok) { G.ui.toast('Malzemelerin yetersiz.', 'warn'); G.audio.fail(); return; }
          for (const [it, n] of need) G.inv.remove(it, n);
          G.player.doAction(1.6);
          [0, 400, 800, 1200].forEach(d => setTimeout(() => (d % 800 ? G.audio.mine() : G.audio.chop()), d));
          setTimeout(() => {
            s.flags['rep_' + R.id] = true;
            G.skills.add(R.xp[0], R.xp[1]);
            puff(R.floor, R.x, R.z, '#c8b090');
            area.refresh(s);
            G.audio.success();
            G.ui.toast('🔧 ' + R.done, 'quest', 5);
            G.quests.check();
          }, 1600);
        } },
        { label: 'Vazgeç', onSelect: () => { } },
      ],
    });
  }

  // ------------------------------------------------------------------ çöp yığınları (dır cartu curtu)
  const JUNK = [
    [0, -1.6, 0.3], [0, 1.7, -2.3], [0, -2.5, 3.7], [0, 2.4, 3.9], [0, -2.2, -1.3],
    [1, -1.9, 0.6], [1, 1.9, 0.4], [1, 0.3, 3.2], [1, -0.6, -2.6],
    [2, -1.4, 0.8], [2, 1.6, 1.4], [2, 0.2, 3.0],
    [-1, -2.4, 0.4], [-1, 2.0, 2.9], [-1, -2.2, 4.0],
  ].map(([floor, x, z], i) => ({ id: 'j' + i, floor, x, z }));
  const JUNK_LOOT = [['odun', 4], ['hurda', 4], ['halat', 2], ['tas', 2], ['deniz_cami', 1.4], ['eski_esya', 0.5], ['bakir', 0.6], ['deniz_kabugu', 1]];
  dyn.junk = {};
  for (const J of JUNK) {
    const grp = new THREE.Group();
    const cols = J.floor === -1 ? ['#3a3430', '#2e2a26', '#4a4038'] : ['#6a5a48', '#5a4a3a', '#7a6a52'];
    for (let k = 0; k < 6; k++) {
      const c = rbx(grp, randRange(0.3, 0.6), randRange(0.2, 0.5), randRange(0.3, 0.55), cols[k % 3], randRange(-0.35, 0.35), 0.15 + (k > 3 ? 0.3 : 0), randRange(-0.3, 0.3), 0.04);
      c.rotation.set(randRange(-0.3, 0.3), randRange(0, 3), randRange(-0.3, 0.3));
    }
    const sheet = rbx(grp, 0.9, 0.04, 0.7, J.floor === -1 ? '#4a4a40' : '#c8c0a8', 0, 0.55, 0, 0.02); sheet.rotation.set(0.2, 0.6, 0.15);
    grp.position.set(J.x, 0, J.z); floors[J.floor].add(grp);
    dyn.junk[J.id] = grp;
    const lvlOk = () => !(J.floor === 1 && L() >= 3) && !(J.floor === 2 && L() >= 4);
    block(J.floor, J.x, J.z, 1.1, 1.0, () => !S().flags['junk_' + J.id] && lvlOk());
    inter(J.floor, J.x, J.z + 0.95, {
      range: 0.9, enabled: () => !S().flags['junk_' + J.id] && lvlOk(),
      label: J.floor === -1 ? '🧹 Çürük sandıklar — karıştır' : '🧹 Eski eşya yığını — temizle',
      action: () => {
        G.player.doAction(1.1);
        G.audio.rustle(); setTimeout(() => G.audio.thud(), 450); setTimeout(() => G.audio.rustle(), 700);
        setTimeout(() => {
          const s = S();
          s.flags['junk_' + J.id] = true;
          puff(J.floor, J.x, J.z, J.floor === -1 ? '#5a5650' : '#b8ab92');
          const n = randInt(1, 3);
          for (let i = 0; i < n; i++) G.inv.add(weightedPick(JUNK_LOOT), randInt(1, 2));
          G.skills.add('kesif', 4); G.skills.add('crafting', 2);
          if (J.floor === -1 && chance(0.5) && !s.flags.basementLetter) { s.flags.basementLetter = true; setTimeout(() => G.ui.dialog({ speaker: null, lines: ['Çürük tahtaların arasında ıslak bir zarf var.', '"Eğer bunu okuyorsan, yeni bekçi: Geceleri kapağı açma. Ne kadar yalvarırlarsa yalvarsınlar. — A.L."'] }), 300); }
          area.refresh(s);
        }, 1100);
      },
    });
  }

  // ------------------------------------------------------------------ bodrum etkileşimleri
  inter(-1, 0, 3.25, {
    range: 1.15,
    label: () => S().flags.hatchSealed ? '🔒 Mühürlü kapak' : '🕳️ Demir kapak',
    action: () => {
      const s = S();
      if (s.flags.hatchSealed) { G.ui.dialog({ speaker: null, lines: ['Mühürlü kapak. Altından artık ses gelmiyor.', '...Çoğu gece.'] }); return; }
      const night = G.hour >= 21 || G.hour < 5;
      const canSeal = G.quests.isActive('q_muhur') || s.clues.includes('c14');
      const opts = [
        { label: '👂 Kulağını daya', onSelect: () => {
          if (night) {
            G.audio.knock(); G.ui.shake(0.3);
            G.ui.dialog({ speaker: null, lines: ['Soğuk demire kulağını dayıyorsun.', 'Su... ve altında, çok yakında, nefes alan bir şey.', 'Tak. Tak. Tak.', 'Kapağın kenarında, içeriden kazınmış harfler: "BIRAKIN GİRELİM".'], onEnd: () => G.mystery.addClue('c14') });
          } else G.ui.dialog({ speaker: null, lines: ['Dalgaların boğuk uğultusu.', 'Bir de... çok uzaktan bir şarkı mı? Gündüz olduğu için emin olamıyorsun.'] });
        } },
      ];
      if (canSeal) opts.push({ label: '🔒 Mühürle (4 Demir, 2 Halat)', onSelect: () => {
        if (!G.inv.has('demir', 4) || !G.inv.has('halat', 2)) { G.ui.toast('Mühür için 4 Demir Cevheri ve 2 Halat gerekli.', 'warn'); return; }
        G.inv.remove('demir', 4); G.inv.remove('halat', 2);
        G.player.doAction(2.0); [0, 500, 1000, 1500].forEach(d => setTimeout(() => G.audio.mine(), d));
        setTimeout(() => { s.flags.hatchSealed = true; area.refresh(s); G.audio.rumble(); G.ui.shake(0.5); G.ui.toast('Kapağı demir kuşaklarla mühürledin. Altından son bir vuruş geldi... sonra sessizlik.', 'mystery', 6); G.quests.check(); }, 2000);
      } });
      opts.push({ label: 'Uzaklaş', onSelect: () => { } });
      G.ui.dialog({ speaker: null, lines: ['Zemine gömülü, paslı, yuvarlak bir demir kapak. Altından dalga sesleri geliyor.'], options: opts });
    },
  });
  inter(-1, 4.5, 1.6, { label: '🤿 Eski dalış elbisesi', action: () => G.ui.dialog({ speaker: null, lines: ['Duvarda bakır miğferli eski bir dalış elbisesi asılı.', 'Kumaşı ıslak. Daha yeni giyilmiş gibi.', 'Miğferin camından içeri bakıyorsun. Karanlık. Ama bir an... cam buğulandı. İçeriden.'] }) });
  inter(-1, -4.7, 1.4, {
    label: () => S().flags.mirrorUncovered ? '🪞 Ayna' : '🪞 Örtülü ayna',
    action: () => {
      const s = S();
      if (s.flags.mirrorUncovered) { G.ui.dialog({ speaker: null, lines: ['Aynada yalnızca kendini görüyorsun.', '...Değil mi?'] }); return; }
      G.ui.dialog({
        speaker: null, lines: ['Beyaz bir örtüyle kapatılmış boy aynası. Örtünün üstünde ıslak el izleri var.'],
        options: [
          { label: 'Örtüyü kaldır', onSelect: () => {
            s.flags.mirrorUncovered = true; area.refresh(s);
            // tek seferlik korku anı: arkanda biri
            const p = G.player;
            dyn.sil.position.set(p.x - fc(-1) + 1.3, 0, p.z + 0.2); dyn.sil.rotation.y = Math.PI; dyn.sil.visible = true;
            dyn.sil.userData.mat.opacity = 0.95; B.mirrorScare = 0.75;
            G.audio.sting(); G.ui.shake(0.6);
            setTimeout(() => G.ui.dialog({ speaker: null, lines: ['Aynada, tam arkanda, ıslak saçlı biri duruyordu.', 'Döndüğünde kimse yok. Yalnızca zemindeki ıslak izler.'] }), 900);
          } },
          { label: 'Dokunma', onSelect: () => { } },
        ],
      });
    },
  });
  inter(-1, -0.4, -5.3, { label: '✏️ Duvardaki çentikler', action: () => G.ui.dialog({ speaker: null, lines: ['Duvar baştan sona beşerli çentiklerle dolu. Binlercesi.', 'En altta, titrek bir el yazısı:', '"7300. gece. Yirmi yıl. Kapı yine açılacak. — A.L."'], onEnd: () => G.mystery.addClue('c15') }) });

  // ------------------------------------------------------------------ toz bulutu
  const puffs = [];
  function puff(floor, x, z, color) {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(randRange(0.12, 0.25), 6, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
      m.position.set(x + randRange(-0.4, 0.4), randRange(0.2, 0.8), z + randRange(-0.4, 0.4));
      floors[floor].add(m);
      puffs.push({ m, v: new THREE.Vector3(randRange(-0.6, 0.6), randRange(0.6, 1.4), randRange(-0.6, 0.6)), life: 0.9, floor });
    }
  }

  // birleştirme (değişmeyen geometri)
  const skip = new Set(Object.values(dyn).filter(o => o?.isObject3D));
  for (const j of Object.values(dyn.junk)) skip.add(j);
  for (const f of Object.keys(floors)) mergeStatic(floors[f], skip);

  // ------------------------------------------------------------------ alan nesnesi
  const area = {
    id: 'fener_ic', name: 'Deniz Feneri', indoor: true, showSea: false, topdown: true,
    floors, statics,
    minX: -1e9, maxX: 1e9,
    ground: () => 0,
    cam: { dist: 8.6, height: 13, look: 0, yawX: 0 },
    surface: 'wood',
    floorName(f) { return FLOOR_INFO[f]?.name ?? ''; },
    entrance() { return { x: fc(0) + DOOR.x, z: DOOR.z - 0.9 }; },
    wakeSpot() { return { x: fc(0) + WAKE.x, z: WAKE.z }; },
    center(f) { return fc(f); },
    radius(f) { return FLOOR_INFO[f].r; },
    isDark() { return G.player.floor === -1 && !S().flags.rep_jenerator; },
    interactables() { return inters; },
    // engeller (dünya koordinatında AABB)
    obstacles(f) {
      const out = [];
      for (const s of statics) if (s.floor === f && (!s.cond || s.cond())) out.push({ x: fc(f) + s.x, z: s.z, w: s.w, d: s.d });
      for (const o of G.decor?.obstacles(f) ?? []) out.push(o);
      return out;
    },
    blocked(f, x, z, r = 0.3) {
      const lx = x - fc(f);
      if (Math.hypot(lx, z) > FLOOR_INFO[f].r - 0.25 - r) return true;
      for (const o of this.obstacles(f)) if (Math.abs(x - o.x) < o.w / 2 + r && Math.abs(z - o.z) < o.d / 2 + r) return true;
      return false;
    },
    arrival(f, from) {
      // yukarıdan inince yukarı merdivenin önüne, aşağıdan çıkınca aşağı açıklığın önüne
      const s = from > f ? stairUp(f) : stairDown(f);
      return { x: fc(f) + s.x, z: s.z + 1.55 };
    },
    refresh(st) {
      const lv = st.lighthouse.level, fl = st.flags;
      dyn.bedOld.visible = lv < 2; dyn.bedNew.visible = lv >= 2;
      dyn.chest.visible = st.hasChest;
      dyn.bench.visible = lv >= 2;
      dyn.secretDoor.visible = lv < 3; dyn.secretOpen.visible = lv >= 3;
      dyn.workshop.visible = lv >= 3; dyn.brokenBoards.visible = lv < 3;
      dyn.observatory.visible = lv >= 4; dyn.brokenScope.visible = lv < 4;
      dyn.lamp.visible = !!fl.lampRepaired; dyn.brokenLamp.visible = !fl.lampRepaired;
      dyn.note.visible = !st.clues.includes('c01');
      dyn.fire.visible = !!fl.rep_soba; dyn.sobaDoor.rotation.y = fl.rep_soba ? 0 : 0.6;
      dyn.badFloor.visible = !fl.rep_doseme;
      dyn.boards1.visible = !fl.rep_pencere1; dyn.boards2.visible = !fl.rep_pencere2;
      dyn.puddle.visible = !fl.rep_boru;
      dyn.pipeFix.visible = !!fl.rep_boru;
      dyn.genLight.material.color.set(fl.rep_jenerator ? '#3f3' : '#f33');
      dyn.bulb.material.emissiveIntensity = fl.rep_jenerator ? 3 : 0;
      dyn.seal.visible = !!fl.hatchSealed;
      dyn.cloth.visible = !fl.mirrorUncovered;
      for (const J of JUNK) dyn.junk[J.id].visible = !fl['junk_' + J.id] && !(J.floor === 1 && lv >= 3) && !(J.floor === 2 && lv >= 4);
      G.decor?.rebuild();
    },
    update(dt, t, p) {
      const st = S(), f = G.player.floor, P = G.player;
      const lit = st.lighthouse.lit;
      dyn.lensMat.emissiveIntensity += ((lit ? 0.9 : 0) - dyn.lensMat.emissiveIntensity) * Math.min(1, dt * 3);
      dyn.core.material.color.set(lit ? '#f8e2b0' : '#4a4030');
      if (lit) dyn.lamp.rotation.y += dt * 0.6;
      skyWin.color.copy(p.skyHorizon).lerp(p.skyTop, 0.4);
      dyn.radioLight.visible = Math.sin(t * 4) > 0;
      if (st.flags.rep_saat) { dyn.pend.rotation.x = Math.sin(t * 3.1) * 0.35; dyn.hand.rotation.x = -(G.hour % 12) / 12 * Math.PI * 2; }
      if (st.flags.rep_jenerator) dyn.genWheel.rotation.x += dt * 12;
      dyn.fire.material.color.setHSL(0.06 + Math.sin(t * 9) * 0.015, 1, 0.5 + Math.sin(t * 13) * 0.08);
      // toz bulutları
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i]; q.life -= dt;
        q.m.position.addScaledVector(q.v, dt); q.v.multiplyScalar(0.94);
        q.m.material.opacity = Math.max(0, q.life) * 0.8; q.m.scale.addScalar(dt * 1.2);
        if (q.life <= 0) { floors[q.floor].remove(q.m); q.m.geometry.dispose(); puffs.splice(i, 1); }
      }
      G.decor?.animate(dt, t);
      // ---- konumlu iç mekân sesleri ----
      if (G.area === area) {
        const A = G.audio;
        const near = (fl, lx, lz, maxD) => {
          if (f !== fl) return [0, 0];
          const sx = fc(fl) + lx, d = Math.hypot(P.x - sx, P.z - lz);
          const k = Math.max(0, 1 - d / maxD);
          return [k * k, (sx - P.x) / 5];
        };
        const fire = near(0, 5.05, 0.7, 10); A.setSpot('fire', st.flags.rep_soba ? fire[0] : 0, fire[1]);
        const tick = near(0, -5.85, -0.9, 8); A.setSpot('tick', st.flags.rep_saat ? tick[0] : 0, tick[1]);
        const hum = near(-1, 3.7, -2.6, 14);
        A.setSpot('hum', st.flags.rep_jenerator ? (f === -1 ? 0.25 + hum[0] * 0.75 : f === 0 ? 0.12 : 0) : 0, hum[1]);
        const gear = near(3, 0, -0.3, 8);
        A.setSpot('gears', lit ? (f === 3 ? 0.3 + gear[0] * 0.7 : f === 2 ? 0.12 : 0) : 0, gear[1]);
        const sl = near(-1, 0, 2.2, 4.5); A.setSpot('slosh', st.flags.hatchSealed ? sl[0] * 0.25 : sl[0], sl[1]);
        // mobilyalar: akvaryum ve gaz lambası
        let bub = [0, 0], hiss = [0, 0];
        for (const rec of G.decor?.list(f) ?? []) {
          if (rec.item === 'akvaryum') { const n = near(f, rec.x, rec.z, 5); if (n[0] > bub[0]) bub = n; }
          if (rec.item === 'gaz_lambasi') { const n = near(f, rec.x, rec.z, 3.5); if (n[0] > hiss[0]) hiss = n; }
        }
        A.setSpot('bubbles', bub[0], bub[1]); A.setSpot('hiss', hiss[0], hiss[1]);
        // çatıya/cama vuran yağmur: üst katlarda daha belirgin
        A.setSpot('roofRain', G.weather.cur.rain * [0.15, 0.4, 0.55, 0.7, 1][f + 1]);
        // saat başı çan (onarılmış saat)
        const hr = Math.floor(G.hour);
        if (st.flags.rep_saat && this._lastHr !== undefined && hr !== this._lastHr && f === 0) A.chime();
        this._lastHr = hr;
      }
      // ---- bodrum ----
      const inBase = f === -1 && G.area === area;
      G.audio.setAmbient({ cave: inBase ? 1 : 0 });
      const night = G.hour >= 21 || G.hour < 5;
      dyn.prints.visible = night && !st.flags.hatchSealed;
      // miğfer oyuncuyu izler
      if (inBase) {
        const lx = P.x - fc(-1) - dyn.suit.position.x, lz = P.z - dyn.suit.position.z;
        const want = Math.atan2(lz, -lx) ; // suit grubu π döndürülmüş
        dyn.helmet.rotation.y += (clamp(want, -1.3, 1.3) - dyn.helmet.rotation.y) * Math.min(1, dt * 0.4);
        dyn.port.material.emissive.set(night && !st.flags.hatchSealed ? '#2a6a6a' : '#000');
        dyn.port.material.emissiveIntensity = 0.6 + Math.sin(t * 0.7) * 0.4;
      }
      // damlalar
      for (const d of B.drips) {
        if (st.flags.rep_boru || !inBase) { d.m.visible = false; continue; }
        d.t -= dt;
        if (d.t <= 0 && !d.m.visible) { d.m.visible = true; d.m.position.set(1.4 + randRange(-0.6, 0.6), 2.3, -5.7); d.v = 0; }
        if (d.m.visible) { d.v += 9.8 * dt; d.m.position.y -= d.v * dt; if (d.m.position.y < 0.03) { d.m.visible = false; d.t = randRange(0.6, 2.2); G.audio.tone(randRange(1300, 1900), { type: 'sine', decay: 0.18, gain: 0.03, bus: G.audio.reverb }); } }
      }
      // fareler
      for (const r of B.rats) {
        r.t += dt;
        if (!inBase) { r.m.visible = false; continue; }
        if (r.t > 0 && !r.m.visible) { r.m.visible = true; r.a = randRange(0, Math.PI * 2); r.dir = chance(0.5) ? 1 : -1; r.life = randRange(1.5, 3); G.audio.tone(3200, { type: 'square', decay: 0.05, gain: 0.015, glide: 2600 }); }
        if (r.m.visible) {
          r.a += r.dir * dt * 0.9; r.life -= dt;
          const rr = FLOOR_INFO[-1].r - 0.5;
          r.m.position.set(Math.sin(r.a) * rr, 0.08, Math.cos(r.a) * rr);
          r.m.rotation.y = r.a + (r.dir > 0 ? 0 : Math.PI);
          if (r.life <= 0) { r.m.visible = false; r.t = -randRange(10, 30); }
        }
      }
      // ayna korkusu
      if (B.mirrorScare !== null) { B.mirrorScare -= dt; dyn.sil.userData.mat.opacity = Math.max(0, B.mirrorScare) * 1.3; if (B.mirrorScare <= 0) { dyn.sil.visible = false; B.mirrorScare = null; } }
      // gece vuruşları & fısıltılar
      if (inBase && G.mode === 'play') {
        if (night && !st.flags.hatchSealed) {
          B.scareT -= dt;
          if (B.scareT <= 0) {
            B.scareT = randRange(35, 70);
            G.audio.knock(); G.ui.shake(0.25);
            G.ui.subtitle('tak... tak... tak...');
            dyn.hatchLid.position.y = 0.16; setTimeout(() => { dyn.hatchLid.position.y = 0.1; }, 260);
          }
        }
        const moved = B.lastPos.distanceTo(P.rig.root.position) > 0.01;
        B.lastPos.copy(P.rig.root.position);
        B.still = moved ? 0 : B.still + dt;
        if (B.still > 9 && !st.flags.hatchSealed) { B.still = -20; G.audio.whisper(randRange(-0.6, 0.6)); G.ui.subtitle(pick(['...bekçi...', 'şşşş...', '...aç...', '...ışığı söndür...'])); }
      }
    },
  };
  area.refresh(G.state);
  return area;
}

export { stairUp as _stairUp };
