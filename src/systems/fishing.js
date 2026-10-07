// Gerilim tabanlı balık tutma: balığın çekiş ritmini oku, sakin anlarda sar.
import * as THREE from 'three';
import { G } from '../game.js';
import { FISH, FISH_BY_ID, ZONE_FISH_NAMES } from '../data/fish.js';
import { ITEMS } from '../data/items.js';
import { Input } from '../core/input.js';
import { randRange, weightedPick, clamp } from '../core/utils.js';
import { waveHeight } from '../world/sea.js';

function timeTags(h) {
  const t = [];
  if (h >= 6 && h < 18) t.push('gunduz');
  if (h >= 17 && h < 22) t.push('aksam');
  if (h >= 21) t.push('gece');
  return t;
}

export function fishCandidates(zone, far = false) {
  const S = G.state, h = G.hour;
  const tags = timeTags(h);
  let weather = S.weather;
  if (S.nightEvent === 'sis' && h >= 21) weather = 'sis';
  const lit = S.lighthouse.lit;
  const tier = G.inv.rodTier();
  const lvl = G.skills.level('balikcilik');
  const bait = S.bait;
  const out = [];
  for (const f of FISH) {
    if (f.netOnly || !f.zones.includes(zone)) continue;
    if (!f.time.includes('any') && !f.time.some(x => tags.includes(x))) continue;
    if (!f.weather.includes('any') && !f.weather.includes(weather)) continue;
    if (f.needLamp && !lit) continue;
    if (f.event && !(S.nightEvent === f.event && h >= 21)) continue;
    let w = f.rarity;
    if (bait === 'solucan' && f.diff <= 2.5) w *= 1.4;
    if (bait === 'karides' && f.diff >= 3) w *= 1.8;
    if (bait === 'parlak_yem' && f.time.includes('gece')) w *= 2.5;
    if (far && f.diff >= 3) w *= 1.4;
    if (f.diff > tier * 2.6 + 1.5) w *= 0.25;
    if (lvl >= 8 && f.rarity < 15) w *= 1.4;
    if (f.junk) w *= Math.max(0.2, 1 - lvl * 0.07) * (bait ? 0.6 : 1);
    out.push([f.id, w]);
  }
  return out;
}

export class Fishing {
  constructor() {
    this.state = 'idle';
    this.bobber = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d83a2a', emissive: '#a02010', emissiveIntensity: 0.5 }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f0f0f0' }));
    this.bobber.add(top, bot);
    this.bobber.visible = false;
    G.scene.add(this.bobber);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#d8d8d8', transparent: true, opacity: 0.6 }));
    this.line.frustumCulled = false; this.line.visible = false;
    G.scene.add(this.line);
    this.el = document.getElementById('fishing');
  }

  start(spot) {
    const tier = G.inv.rodTier();
    if (!tier) { G.ui.toast('Oltan yok. Elias\'la konuş ya da atölyede bir olta üret.', 'warn'); return; }
    if (spot.minTier && tier < spot.minTier) { G.ui.toast('Buradan atış için Gelişmiş Olta gerekli.', 'warn'); return; }
    this.spot = spot;
    this.state = 'cast';
    this.power = 0; this.powerDir = 1; this.charging = false;
    G.mode = 'fishing';
    G.player.vx = 0;
    G.player.rig.facing = spot.face ?? G.player.rig.facing;
    this.render();
  }

  stop(msg) {
    this.state = 'idle';
    this.bobber.visible = false; this.line.visible = false;
    G.mode = 'play';
    this.el.classList.remove('show');
    if (msg) G.ui.toast(msg, 'info');
  }

  update(dt, t) {
    if (this.state === 'idle') return;
    if (Input.wasPressed('Escape', 'KeyE') && this.state !== 'fight') { this.stop(); return; }
    const sp = this.spot;
    const S = G.state;
    const hold = Input.isDown('Space') || Input.mouseHeld;
    const tip = new THREE.Vector3();
    G.player.rodTip.getWorldPosition(tip);

    if (this.state === 'cast') {
      if (hold) {
        this.charging = true;
        this.power += this.powerDir * dt * 1.25;
        if (this.power > 1) { this.power = 1; this.powerDir = -1; }
        if (this.power < 0) { this.power = 0; this.powerDir = 1; }
      } else if (this.charging) {
        // fırlat
        this.charging = false;
        this.far = this.power > 0.7;
        const dist = sp.minDist + this.power * (sp.maxDist - sp.minDist);
        this.bx = G.player.x + G.player.rig.facing * randRange(0.3, 1.2);
        this.bz = sp.dirZ * dist;
        this.state = 'wait';
        let wait = randRange(2.5, 8);
        if (S.bait === 'solucan') wait *= 0.65; else if (S.bait) wait *= 0.85;
        if (S.weather === 'yagmur') wait *= 0.85;
        this.timer = wait;
        this.nibbles = Math.floor(randRange(0, 3));
        this.nibbleT = randRange(0.6, wait * 0.8);
        G.audio.splash();
        this.bobber.visible = true; this.line.visible = true;
      }
    } else if (this.state === 'wait') {
      this.timer -= dt;
      this.nibbleT -= dt;
      if (this.nibbleT <= 0 && this.nibbles > 0) { this.nibbles--; this.nibbleT = randRange(0.6, 1.4); this.dip = 0.12; G.audio.reel(); }
      if (Input.wasPressed('Space')) { this.stop('Çok erken çektin. Balık ürktü.'); return; }
      if (this.timer <= 0) {
        const cands = fishCandidates(sp.zone, this.far);
        this.fishId = weightedPick(cands) ?? 'yosun';
        this.fish = FISH_BY_ID[this.fishId];
        if (S.bait) { G.inv.remove(S.bait, 1); }
        this.state = 'bite';
        const lvl = G.skills.level('balikcilik');
        this.timer = Math.max(0.35, 0.75 + (lvl >= 3 ? 0.25 : 0) - this.fish.diff * 0.035);
        this.dip = 0.35;
        G.audio.splash();
      }
    } else if (this.state === 'bite') {
      this.timer -= dt;
      this.dip = 0.3 + Math.sin(t * 40) * 0.08;
      if (Input.wasPressed('Space') || (Input.mouseHeld && !this.mouseWas)) {
        this.beginFight();
      } else if (this.timer <= 0) {
        this.stop('Balık yemi alıp kaçtı...');
        return;
      }
    } else if (this.state === 'fight') {
      this.fight(dt, hold);
    } else if (this.state === 'done') {
      this.timer -= dt;
      if (this.timer <= 0 || Input.wasPressed('Space', 'KeyE', 'Escape')) this.stop();
    }
    this.mouseWas = Input.mouseHeld;

    // şamandıra & misina
    if (this.bobber.visible) {
      let wy;
      if (sp.water) wy = sp.water(this.bx, this.bz);
      else wy = waveHeight(this.bx, this.bz, G.sea.t);
      this.dip = Math.max(0, (this.dip ?? 0) - dt * 0.8);
      let bx = this.bx, bz = this.bz;
      if (this.state === 'fight') {
        bx += Math.sin(t * 7) * 0.25 * (this.burst ? 2 : 1);
        bz = this.bz * (0.25 + (1 - this.progress) * 0.75);
      }
      this.bobber.position.set(bx, wy + 0.04 - this.dip, bz);
      const p = this.line.geometry.attributes.position;
      p.setXYZ(0, tip.x, tip.y, tip.z); p.setXYZ(1, bx, wy + 0.08 - this.dip, bz);
      p.needsUpdate = true;
    }
    this.render(t);
  }

  beginFight() {
    const f = this.fish, tier = G.inv.rodTier(), lvl = G.skills.level('balikcilik');
    this.state = 'fight';
    this.tension = 0.15; this.progress = 0.3;
    this.limit = 1 + (tier - 1) * 0.12 + (lvl >= 10 ? 0.15 : 0);
    this.reel = Math.max(0.07, 0.15 + tier * 0.04 - f.diff * 0.009);
    this.burst = false; this.warn = false;
    this.nextBurst = randRange(0.8, 2.2);
    this.warnTime = 0.35 + (lvl >= 5 ? 0.3 : 0);
    this.tensionMul = 1 - lvl * 0.025 - (lvl >= 5 ? 0.08 : 0);
    G.audio.splash(true);
  }

  fight(dt, hold) {
    const f = this.fish;
    const d = f.diff;
    // çekiş döngüsü
    this.nextBurst -= dt;
    this.warn = !this.burst && this.nextBurst < this.warnTime && this.nextBurst > 0;
    if (!this.burst && this.nextBurst <= 0) { this.burst = true; this.burstT = randRange(0.5, 1.1) + d * 0.05; this.strength = 0.6 + d * 0.14; G.audio.splash(); }
    if (this.burst) { this.burstT -= dt; if (this.burstT <= 0) { this.burst = false; this.nextBurst = randRange(1.0, 3.2) / (1 + d * 0.08); } }
    if (hold) {
      this.progress += this.reel * dt;
      this.tension += (0.25 + (this.burst ? this.strength * 1.1 : 0)) * dt * this.tensionMul;
      if (Math.random() < dt * 14) G.audio.reel();
    } else {
      this.tension -= 0.55 * dt;
      this.progress -= (this.burst ? this.strength * 0.16 : 0.02) * dt;
    }
    this.tension = Math.max(0, this.tension);
    if (this.tension > this.limit) {
      G.audio.snap();
      this.finish(false, 'Misina koptu!');
    } else if (this.progress >= 1) {
      this.finish(true);
    } else if (this.progress <= 0) {
      this.finish(false, 'Balık kaçtı...');
    }
  }

  finish(ok, msg) {
    this.state = 'done';
    this.timer = 2.6;
    this.bobber.visible = false; this.line.visible = false;
    const S = G.state;
    if (!ok) { this.result = { ok: false, msg }; G.audio.fail(); return; }
    const f = this.fish;
    const size = f.size ? Math.round(randRange(f.size[0], f.size[1])) : null;
    const firstTime = !S.stats.fish[f.id];
    const left = G.inv.add(f.id, 1, { silent: true });
    if (left) { this.result = { ok: false, msg: 'Envanterin dolu! Balığı denize geri bıraktın.' }; return; }
    S.stats.fish[f.id] = (S.stats.fish[f.id] ?? 0) + 1;
    if (!f.junk) S.stats.totalFish = (S.stats.totalFish ?? 0) + 1;
    G.skills.add('balikcilik', f.junk ? 1 : Math.round(6 + f.diff * 5 + (firstTime ? 10 : 0)));
    this.result = { ok: true, f, size, firstTime };
    G.audio.success();
    if (f.id === 'hayalet_balik' && !S.flags.ghostFish) { S.flags.ghostFish = true; G.ui.toast('Balık elinde soluk bir ışıkla parlıyor. Gözleri... insan gözüne benziyor.', 'mystery', 6); }
    G.quests.check();
  }

  render(t = 0) {
    const el = this.el;
    if (this.state === 'idle') { el.classList.remove('show'); return; }
    el.classList.add('show');
    const S = G.state;
    const baitTxt = S.bait ? `${ITEMS[S.bait].icon} ${ITEMS[S.bait].name} (${G.inv.count(S.bait)})` : 'Yem yok';
    let html = `<div class="fz">${ZONE_FISH_NAMES[this.spot.zone]} · ${baitTxt}</div>`;
    if (this.state === 'cast') {
      html += `<div class="fs">Atış gücü</div><div class="bar cast"><i style="width:${this.power * 100}%"></i><b style="left:70%"></b></div>
        <div class="fh">[Boşluk] basılı tut → bırak: oltayı at · %70 üstü <em>uzak atış</em> (nadir balık) · [Esc] vazgeç</div>`;
    } else if (this.state === 'wait') {
      html += `<div class="fs wait">Bekle${'.'.repeat(1 + Math.floor(t * 2) % 3)}</div><div class="fh">Şamandıra tamamen batınca [Boşluk] ile kancala. Erken çekme!</div>`;
    } else if (this.state === 'bite') {
      html += `<div class="fs bite">VURDU! [Boşluk]</div>`;
    } else if (this.state === 'fight') {
      const tn = clamp(this.tension / this.limit, 0, 1);
      html += `<div class="fs ${this.burst ? 'pull' : this.warn ? 'warnp' : ''}">${this.burst ? 'BALIK ÇEKİYOR! Gevşet!' : this.warn ? 'Çekiş geliyor...' : 'Sar!'}</div>
        <div class="lbl">Gerilim</div><div class="bar tension ${tn > 0.8 ? 'danger' : ''}"><i style="width:${tn * 100}%"></i></div>
        <div class="lbl">Mesafe</div><div class="bar prog"><i style="width:${this.progress * 100}%"></i><span class="fishico" style="left:${(1 - this.progress) * 92}%">${this.fish.junk ? '❔' : '🐟'}</span></div>
        <div class="fh">[Boşluk] / fare basılı: makarayı sar · bırak: misinayı gevşet</div>`;
    } else if (this.state === 'done') {
      const r = this.result;
      if (r.ok) html += `<div class="catch"><span class="ci">${r.f.icon}</span><div><b>${r.f.name}</b>${r.size ? ` · ${r.size} cm` : ''}${r.firstTime && !r.f.junk ? ' <em>Yeni tür!</em>' : ''}<br><small>${r.f.junk ? 'Hm. Pek değerli değil.' : `Değer: ${r.f.price} altın`}</small></div></div>`;
      else html += `<div class="fs miss">${r.msg}</div>`;
    }
    el.innerHTML = html;
  }
}

// --------- Dalış ---------
export function startDive(zone) {
  if (!G.inv.has('dalis')) { G.ui.toast('Dalış takımı gerekli.', 'warn'); return; }
  const lvl = G.skills.level('dalis');
  G.mode = 'dive';
  const el = document.getElementById('dive');
  el.classList.add('show');
  const breath = 3.5 + lvl * 0.35;
  G.audio.splash(true);
  let t = 0;
  const loot = zone === 'batik'
    ? [['gemi_parcasi', 4], ['hazine', 2 + lvl * 0.3], ['gizemli_obje', 1 + (lvl >= 5 ? 1 : 0)], ['halat', 3], ['eski_esya', 2], ['demir', 2]]
    : [['deniz_kabugu', 4], ['deniz_cami', 4], ['hurda', 2], ['eski_esya', 1], ['hazine', 0.5 + lvl * 0.15]];
  const tick = () => {
    t += 0.05;
    el.innerHTML = `<div class="dv"><div>🤿 Dalış... nefes</div><div class="bar breath"><i style="width:${Math.max(0, 1 - t / breath) * 100}%"></i></div></div>`;
    if (t < breath) { setTimeout(tick, 50); return; }
    el.classList.remove('show');
    G.mode = 'play';
    const n = 1 + (lvl >= 5 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) G.inv.add(weightedPick(loot), 1);
    G.skills.add('dalis', 15 + (zone === 'batik' ? 10 : 0));
    G.day.advance(30);
    if (zone === 'batik' && lvl >= 3 && !G.state.flags.wreckBell) {
      G.state.flags.wreckBell = true;
      G.ui.toast('Batığın içinde bir çan buldun. Üzerinde "AURELIA 1926" yazıyor. Dokunduğunda... çaldı.', 'mystery', 7);
      G.audio.bell();
    }
  };
  tick();
}
