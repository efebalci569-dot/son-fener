// Toplanabilir kaynak noktaları
import * as THREE from 'three';
import * as M from '../world/models.js';
import { G } from '../game.js';
import { terrainHeight } from '../world/terrain.js';
import { caveGround, CAVE_X } from '../world/interiors.js';
import { mulberry32, randInt, weightedPick, chance } from '../core/utils.js';
import { itemName } from '../data/items.js';

const pebbles = () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const r = M.makeRock(0.14 + Math.random() * 0.1, '#8a8680', i); r.position.set((Math.random() - 0.5) * 0.6, 0.06, (Math.random() - 0.5) * 0.4); g.add(r); } return g; };
const scrapHeap = () => { const g = M.makeScrap(); g.scale.setScalar(1.8); const b = M.makeBarrel('#5a3a2a'); b.position.set(0.5, 0, -0.3); b.rotation.z = 1.4; b.scale.setScalar(0.7); g.add(b); return g; };
const sparkle = () => {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: '#fff4c0' }));
  m.position.y = 0.35; const g = new THREE.Group(); g.add(m); g.userData.sparkle = m; return g;
};

export const NODE_TYPES = {
  driftwood: { name: 'Dal Yığını', make: M.makeDriftwood, drops: [['odun', 2, 3]], xp: 2, respawn: 0.8, verb: 'Topla' },
  shells: { name: 'Deniz Kabukları', make: M.makeShells, drops: [['deniz_kabugu', 1, 2]], xp: 2, respawn: 0.7, verb: 'Topla' },
  seaglass: { name: 'Parıltı', make: M.makeSeaGlass, drops: [['deniz_cami', 1, 2]], xp: 3, respawn: 0.6, verb: 'Topla' },
  pebbles: { name: 'Çakıl Taşları', make: pebbles, drops: [['tas', 1, 3]], xp: 1, respawn: 0.8, verb: 'Topla' },
  scrap: { name: 'Hurda', make: M.makeScrap, drops: [['hurda', 1, 2]], xp: 3, respawn: 0.7, verb: 'Topla' },
  wreckage: { name: 'Gemi Enkazı', make: M.makeWreckage, drops: [['gemi_parcasi', 1, 1], ['halat', 1, 2], ['odun', 0, 2]], xp: 6, respawn: 0.3, verb: 'Karıştır' },
  tree: { name: 'Ağaç', tool: 'balta', make: () => M.makeTree(4.4, 3), drops: [['odun', 3, 5], ['recine', 0, 1], ['meyve', 0, 1]], xp: 5, days: 3, verb: 'Kes', sound: 'chop', time: 0.9 },
  pine: { name: 'Reçineli Çam', tool: 'balta', make: () => M.makePine(6, 1), drops: [['odun', 2, 4], ['recine', 1, 2]], xp: 5, days: 3, verb: 'Kes', sound: 'chop', time: 0.9 },
  mushroom: { name: 'Mantarlar', make: () => M.makeMushrooms(false), drops: [['mantar', 1, 2]], xp: 3, respawn: 0.6, verb: 'Topla' },
  cavemush: { name: 'Parlak Mantarlar', make: () => M.makeMushrooms(true), drops: [['mantar', 1, 2], ['bitki', 0, 1]], xp: 4, respawn: 0.6, verb: 'Topla' },
  herb: { name: 'Şifalı Bitki', make: () => M.makeHerb(), drops: [['bitki', 1, 2]], xp: 2, respawn: 0.7, verb: 'Topla' },
  berry: { name: 'Meyve Çalısı', make: M.makeBerryBush, drops: [['meyve', 2, 3]], xp: 2, respawn: 0.6, verb: 'Topla', keepMesh: true },
  boulder: { name: 'Kaya', tool: 'kazma', make: () => { const r = M.makeRock(0.85, '#7a7874', 7); r.position.y = 0.4; const g = new THREE.Group(); g.add(r); return g; }, drops: [['tas', 3, 5], ['hurda', 0, 1]], xp: 4, days: 2, verb: 'Kır', sound: 'mine', time: 0.9 },
  iron: { name: 'Demir Damarı', tool: 'kazma', make: () => M.makeOreVein('#a0a0a8'), drops: [['demir', 1, 3], ['tas', 0, 2]], xp: 6, days: 2, verb: 'Kır', sound: 'mine', time: 1.0 },
  copper: { name: 'Bakır Damarı', tool: 'kazma', make: () => M.makeOreVein('#d0783a'), drops: [['bakir', 1, 3], ['tas', 0, 1]], xp: 6, days: 2, verb: 'Kır', sound: 'mine', time: 1.0 },
  crystal: { name: 'Kristal Kümesi', tool: 'kazma', make: () => M.makeOreVein('#5ad8f0', true), drops: [['kristal', 1, 2]], xp: 10, days: 3, verb: 'Kır', sound: 'mine', time: 1.2 },
  oldchest: { name: 'Eski Sandık', make: M.makeChest, drops: [['eski_esya', 1, 1], ['hazine', 0, 1], ['halat', 0, 2]], xp: 12, days: 7, verb: 'Aç' },
  scrapheap: { name: 'Paslı Yığın', make: scrapHeap, drops: [['hurda', 2, 4], ['demir', 0, 1], ['halat', 0, 1]], xp: 4, days: 1, respawn: 0.7, verb: 'Karıştır' },
  hidden: { name: 'Bir şey parlıyor...', hidden: true, make: sparkle, drops: 'hidden', xp: 15, days: 4, verb: 'Kaz', range: 1.1 },
};

const HIDDEN_LOOT = [['hazine', 3], ['gizemli_obje', 2], ['deniz_cami', 4], ['eski_esya', 3], ['kristal', 2], ['parlak_yem', 2]];

class Node {
  constructor(id, type, area, x, z) {
    this.id = id; this.type = type; this.def = NODE_TYPES[type]; this.area = area; this.x = x; this.z = z;
    this.mesh = this.def.make();
    const y = area === 'magara' ? caveGround(x) : terrainHeight(x, z);
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = (x * 7.3) % 6.28;
    G.scene.add(this.mesh);
    if (this.def.tool === 'balta') G.world?.swayers.push(this.mesh);
  }
  get available() { const d = G.state.nodes[this.id]; return !d || d <= G.state.day; }
  refresh() {
    const av = this.available;
    if (this.def.hidden) {
      this.mesh.visible = av && G.skills.level('kesif') >= 5;
    } else if (this.def.keepMesh) {
      this.mesh.visible = true;
      this.mesh.children.forEach((c, i) => { if (i > 0) c.visible = av; });
    } else if (this.def.tool === 'balta') {
      this.mesh.visible = true;
      this.mesh.scale.set(1, av ? 1 : 0.12, 1);
    } else this.mesh.visible = av;
  }
  harvest() {
    const d = this.def;
    if (d.tool && !G.inv.has(d.tool)) { G.ui.toast(`${itemName(d.tool)} gerekli.`, 'warn'); G.audio.fail(); return; }
    const time = d.time ?? 0.5;
    G.player.doAction(time, 'work');
    G.player.rig.facing = this.x >= G.player.x ? 1 : -1;
    if (d.sound === 'chop') { G.audio.chop(); setTimeout(() => G.audio.chop(), 400); }
    else if (d.sound === 'mine') { G.audio.mine(); setTimeout(() => G.audio.mine(), 450); }
    setTimeout(() => {
      let got = 0;
      const extra = G.skills.level('kesif') >= 8 && chance(0.25) ? 1 : 0;
      if (d.drops === 'hidden') {
        const it = weightedPick(HIDDEN_LOOT);
        if (G.inv.add(it, it === 'deniz_cami' ? 3 : 1) === 0) got++;
      } else {
        for (const [it, a, b] of d.drops) {
          const n = randInt(a, b) + (a > 0 ? extra : 0);
          if (n > 0 && G.inv.add(it, n) === 0) got++;
        }
      }
      if (!got) return;
      G.audio.pickup();
      G.skills.add('kesif', d.xp);
      G.state.nodes[this.id] = G.state.day + (d.days ?? 1);
      this.refresh();
    }, time * 1000);
  }
}

function scatter(rnd, prefix, area, from, to, n, weights, zFn) {
  const out = [];
  const step = (to - from) / n;
  for (let i = 0; i < n; i++) {
    const x = from + step * (i + 0.2 + rnd() * 0.6);
    const type = weightedPick(weights.map(([k, w]) => [k, w * (0.5 + rnd())]));
    out.push([`${prefix}_${i}`, type, area, x, zFn(type, i, rnd)]);
  }
  return out;
}

export function buildNodes() {
  const rnd = mulberry32(77);
  const small = (t, i, r) => (i % 2 ? 1 : -1) * (0.9 + r() * 0.6);
  const back = () => -2.9;
  const list = [
    ...scatter(rnd, 'sahil', 'world', 46, 120, 20, [['driftwood', 3], ['shells', 3], ['seaglass', 2.5], ['pebbles', 1.5], ['scrap', 3], ['wreckage', 1]], small),
    ['kasaba_0', 'scrap', 'world', 6.8, 1.2], ['kasaba_1', 'pebbles', 'world', -64, 1.4],
    ['fener_0', 'seaglass', 'world', 131, 1.2], ['fener_1', 'scrap', 'world', 138, -1.3], ['fener_2', 'boulder', 'world', 166, -2.6], ['fener_3', 'shells', 'world', 160, 1.4],
    ...scatter(rnd, 'orman', 'world', -136, -72, 26, [['tree', 3], ['pine', 2], ['mushroom', 2], ['herb', 2], ['berry', 1.5], ['boulder', 0.8], ['driftwood', 0.6]], (t, i, r) => (t === 'tree' || t === 'pine' || t === 'boulder') ? back() : small(t, i, r)),
    ...scatter(rnd, 'tersane', 'world', -200, -142, 16, [['scrapheap', 4], ['boulder', 1.5], ['wreckage', 1.2], ['scrap', 2], ['iron', 0.6]], (t, i, r) => (t === 'boulder' || t === 'iron') ? back() : small(t, i, r)),
    ['tersane_chest', 'oldchest', 'world', -176, -2.6],
    ...scatter(rnd, 'magara', 'magara', CAVE_X + 5, CAVE_X + 66, 18, [['iron', 3], ['copper', 3], ['crystal', 1.4], ['boulder', 1], ['cavemush', 1.2]], (t, i, r) => (t === 'cavemush' ? small(t, i, r) : -2.6)),
    ['magara_chest', 'oldchest', 'magara', CAVE_X + 58, -2.4],
    // gizli noktalar
    ['gizli_0', 'hidden', 'world', 101.5, 0.9], ['gizli_1', 'hidden', 'world', 57.3, -1.2], ['gizli_2', 'hidden', 'world', -101, 1.1],
    ['gizli_3', 'hidden', 'world', -189, -1.0], ['gizli_4', 'hidden', 'world', 163.5, 1.0], ['gizli_5', 'hidden', 'magara', CAVE_X + 30, 1.0], ['gizli_6', 'hidden', 'world', -47, 1.6],
  ];
  // mağara: içerideki orman ağaçlarını dışarıda tut; aynı x'e çok yakın olanları ayır
  return list.map(([id, type, area, x, z]) => new Node(id, type, area, x, z));
}

export function respawnNodes() {
  const S = G.state;
  for (const n of G.nodes) {
    const d = S.nodes[n.id];
    if (d && d <= S.day && n.def.respawn !== undefined && !chance(n.def.respawn)) S.nodes[n.id] = S.day + 1;
    n.refresh();
  }
}

export function updateNodes(t) {
  for (const n of G.nodes) {
    const sp = n.mesh.userData.sparkle;
    if (sp && n.mesh.visible) { sp.rotation.y = t * 3; sp.position.y = 0.35 + Math.sin(t * 4 + n.x) * 0.06; sp.scale.setScalar(0.8 + Math.sin(t * 6 + n.x) * 0.3); }
  }
}
