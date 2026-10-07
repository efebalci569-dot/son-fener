// Fenerin içine mobilya yerleştirme (Stardew tarzı dekorasyon)
import * as THREE from 'three';
import { G } from '../game.js';
import { Input } from '../core/input.js';
import { FURNITURE, ghostify } from '../world/furniture.js';
import { ITEMS } from '../data/items.js';

const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

export class Decor {
  constructor() {
    this.items = new Map(); // uid → { mesh, light, rec }
    this.placing = null;    // { item, rot, ghost, x, z, ok }
    this.mouseUsed = false;
    this.music = 0;
  }

  get S() { return G.state; }
  list(f) { const d = this.S.decor ?? (this.S.decor = {}); return d[f] ?? (d[f] = []); }
  dims(rec) { const def = FURNITURE[rec.item]; const odd = rec.rot % 2 === 1; return { w: odd ? def.d : def.w, d: odd ? def.w : def.d }; }

  // ------------------------------------------------ sahne
  rebuild() {
    const area = G.areas.fener_ic;
    if (!area) return;
    for (const v of this.items.values()) { v.mesh.parent?.remove(v.mesh); if (v.light) G.env.sources = G.env.sources.filter(s => s !== v.light); }
    this.items.clear();
    for (const f of [-1, 0, 1, 2, 3]) for (const rec of this.list(f)) this.spawn(f, rec);
  }
  spawn(f, rec) {
    const def = FURNITURE[rec.item]; if (!def) return;
    const mesh = def.make();
    mesh.position.set(rec.x, 0, rec.z);
    mesh.rotation.y = -rec.rot * Math.PI / 2;
    mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    G.areas.fener_ic.floors[f].add(mesh);
    let light = null;
    if (def.light) {
      light = G.env.addLight({ area: 'fener_ic', pos: new THREE.Vector3(G.areas.fener_ic.center(f) + rec.x, 1.4, rec.z), color: def.light, distance: 7, intensity: 6, flicker: rec.item === 'gaz_lambasi', on: () => G.player.floor === f });
    }
    this.items.set(rec.uid, { mesh, light, rec, f });
  }

  // ------------------------------------------------ engel & etkileşim
  obstacles(f) {
    const cx = G.areas.fener_ic.center(f);
    return this.list(f).filter(r => FURNITURE[r.item]?.block).map(r => { const d = this.dims(r); return { x: cx + r.x, z: r.z, w: d.w, d: d.d }; });
  }
  interactables(f) {
    const cx = G.areas.fener_ic.center(f);
    return this.list(f).map(rec => {
      const def = FURNITURE[rec.item], d = this.dims(rec);
      return {
        area: 'fener_ic', floor: f, x: cx + rec.x, z: rec.z, range: Math.max(d.w, d.d) / 2 + 0.75,
        label: `${ITEMS[rec.item].icon} ${ITEMS[rec.item].name}`,
        action: () => this.menu(f, rec, def),
      };
    });
  }
  menu(f, rec, def) {
    const opts = [];
    if (def.music) opts.push({ label: '🎶 Plağı çal', onSelect: () => this.playMusic() });
    opts.push({ label: '↻ Döndür', onSelect: () => this.rotate(f, rec) });
    opts.push({ label: '✋ Taşı', onSelect: () => { this.pickup(f, rec, true); } });
    opts.push({ label: '📦 Topla (envantere)', onSelect: () => this.pickup(f, rec) });
    opts.push({ label: 'Kapat', onSelect: () => { } });
    G.ui.dialog({ speaker: null, lines: [`${ITEMS[rec.item].icon} ${ITEMS[rec.item].name}`], options: opts, menu: true });
  }
  rotate(f, rec) {
    const old = rec.rot;
    rec.rot = (rec.rot + 1) % 4;
    if (!this.valid(f, rec, rec)) { rec.rot = old; G.ui.toast('Burada döndürmeye yer yok.', 'warn'); return; }
    this.rebuild(); G.audio.click();
  }
  pickup(f, rec, move = false) {
    if (!move && !G.inv.canAdd(rec.item)) { G.ui.toast('Envanter dolu.', 'warn'); return; }
    const L = this.list(f); const i = L.indexOf(rec); if (i < 0) return;
    L.splice(i, 1);
    this.rebuild(); G.audio.pickup();
    if (move) { G.inv.items[rec.item] = (G.inv.items[rec.item] ?? 0) + 1; this.start(rec.item, rec.rot); }
    else G.inv.add(rec.item, 1);
  }

  // ------------------------------------------------ yerleştirme modu
  start(item, rot = 0) {
    if (G.area.id !== 'fener_ic') { G.ui.toast('Mobilyaları fenerin içine yerleştirebilirsin.', 'info'); return; }
    if (!G.inv.has(item)) return;
    this.cancel(true);
    const def = FURNITURE[item];
    const ghost = def.make();
    this.ghostMat = ghostify(ghost, true);
    G.areas.fener_ic.floors[G.player.floor].add(ghost);
    this.placing = { item, rot, ghost, x: 0, z: 0, ok: false, f: G.player.floor };
    this.mouseUsed = false;
    G.mode = 'place';
    G.ui.placeHud(true, ITEMS[item]);
  }
  cancel(silent) {
    if (!this.placing) return;
    this.placing.ghost.parent?.remove(this.placing.ghost);
    this.placing = null;
    if (G.mode === 'place') G.mode = 'play';
    G.ui.placeHud(false);
    if (!silent) G.audio.click();
  }
  valid(f, rec, ignore) {
    const r = G.areas.fener_ic.radius(f);
    const d = this.dims(rec);
    const half = Math.hypot(d.w, d.d) / 2;
    if (Math.hypot(rec.x, rec.z) + half * 0.85 > r - 0.3) return false;
    const def = FURNITURE[rec.item];
    const cx = G.areas.fener_ic.center(f);
    const overlap = (o) => Math.abs(cx + rec.x - o.x) < (d.w + o.w) / 2 - 0.02 && Math.abs(rec.z - o.z) < (d.d + o.d) / 2 - 0.02;
    // sabit engeller (merdiven, yatak, tezgâhlar...) her zaman
    for (const s of G.areas.fener_ic.statics) if (s.floor === f && (!s.cond || s.cond()) && overlap({ x: cx + s.x, z: s.z, w: s.w, d: s.d })) return false;
    // diğer mobilyalar: halılar yalnızca halılarla çakışmasın
    for (const o of this.list(f)) {
      if (o === ignore) continue;
      const odef = FURNITURE[o.item]; if (!odef) continue;
      if (odef.block !== def.block) continue;
      const od = this.dims(o);
      if (overlap({ x: cx + o.x, z: o.z, w: od.w, d: od.d })) return false;
    }
    // kapı, merdiven ve etkileşim noktalarını kapatma
    for (const it of G.areas.fener_ic.interactables()) {
      if (it.floor !== f || !def.block) continue;
      if (it.enabled && !it.enabled()) continue;
      if (Math.abs(it.x - (cx + rec.x)) < d.w / 2 + 0.35 && Math.abs(it.z - rec.z) < d.d / 2 + 0.35) return false;
    }
    // oyuncunun üstüne koyma
    if (def.block && Math.abs(G.player.x - (cx + rec.x)) < d.w / 2 + 0.3 && Math.abs(G.player.z - rec.z) < d.d / 2 + 0.3) return false;
    return true;
  }
  update(dt) {
    const p = this.placing;
    if (!p) return;
    if (G.player.floor !== p.f || G.area.id !== 'fener_ic') { this.cancel(true); return; }
    const cx = G.areas.fener_ic.center(p.f);
    if (Input.mouse.moved) this.mouseUsed = true;
    let x, z;
    if (this.mouseUsed) {
      ray.setFromCamera(new THREE.Vector2((Input.mouse.x / innerWidth) * 2 - 1, -(Input.mouse.y / innerHeight) * 2 + 1), G.camera);
      if (ray.ray.intersectPlane(plane, hit)) { x = hit.x - cx; z = hit.z; }
    }
    if (x === undefined) {
      const yaw = G.player.rig.yaw;
      x = G.player.x - cx + Math.cos(yaw) * 1.6; z = G.player.z - Math.sin(yaw) * 1.6;
    }
    const snap = v => Math.round(v * 4) / 4;
    p.x = snap(x); p.z = snap(z);
    if (Input.wasPressed('KeyR') || Input.mouse.rclicked) { p.rot = (p.rot + 1) % 4; G.audio.click(); }
    const rec = { item: p.item, x: p.x, z: p.z, rot: p.rot };
    p.ok = this.valid(p.f, rec);
    this.ghostMat.color.set(p.ok ? '#7cf09a' : '#f07a6a');
    p.ghost.position.set(p.x, 0.01 + Math.sin(performance.now() / 200) * 0.02, p.z);
    p.ghost.rotation.y = -p.rot * Math.PI / 2;
    if (Input.wasPressed('Escape')) { this.cancel(); return; }
    if (Input.wasPressed('KeyE', 'Enter') || Input.mouse.clicked) {
      if (!p.ok) { G.audio.fail(); return; }
      G.inv.remove(p.item, 1);
      const S = this.S;
      S.decorUid = (S.decorUid ?? 100) + 1;
      const r2 = { uid: S.decorUid, ...rec };
      this.list(p.f).push(r2);
      this.spawn(p.f, r2);
      G.audio.thud(); G.audio.creak(0.5);
      const more = G.inv.has(p.item);
      const item = p.item, rot = p.rot;
      this.cancel(true);
      if (more && Input.isDown('ShiftLeft', 'ShiftRight')) this.start(item, rot);
    }
  }

  // ------------------------------------------------ canlandırma
  animate(dt, t) {
    for (const v of this.items.values()) {
      const fish = v.mesh.userData.fish;
      if (fish) fish.children.forEach((f, i) => { const ph = f.userData.ph + t * (0.6 + i * 0.15); f.position.set(Math.sin(ph) * 0.5, Math.sin(ph * 1.7) * 0.15, Math.cos(ph * 0.8) * 0.15); f.rotation.y = Math.cos(ph) > 0 ? 0 : Math.PI; });
    }
    if (this.music > 0) {
      this.music -= dt;
      this.noteT = (this.noteT ?? 0) - dt;
      if (this.noteT <= 0) {
        const waltz = [392, 523, 659, 587, 523, 494, 523, 440, 392, 349, 392, 440, 494, 523];
        const n = waltz[(this.noteI = ((this.noteI ?? -1) + 1) % waltz.length)];
        G.audio.tone(n, { type: 'triangle', attack: 0.02, decay: 0.9, gain: 0.07, bus: G.audio.musicBus });
        if (this.noteI % 3 === 0) G.audio.tone(n / 2, { type: 'sine', attack: 0.02, decay: 1.2, gain: 0.05, bus: G.audio.musicBus });
        G.audio.noise({ type: 'highpass', freq: 5000, decay: 0.2, gain: 0.01 });
        for (let k = 0; k < 3; k++) if (Math.random() < 0.6) setTimeout(() => G.audio.vinyl(), Math.random() * 400);
        this.noteT = 0.42;
      }
    }
  }
  playMusic() { this.music = 22; G.ui.toast('🎶 Gramofondan eski bir vals yükseliyor...', 'info'); }
}
