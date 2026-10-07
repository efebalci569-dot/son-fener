// Gece olayları: "Burada bir şeyler yanlış" hissi
import * as THREE from 'three';
import { G } from '../game.js';
import * as M from '../world/models.js';
import { waveHeight } from '../world/sea.js';
import { terrainHeight } from '../world/terrain.js';
import { weightedPick, randRange, pick, chance, clamp, damp } from '../core/utils.js';
import { NPC_BY_ID } from '../data/npcs.js';

export const NIGHT_EVENTS = {
  normal: { w: 20, name: 'Sakin gece' },
  sis: { w: 15, name: 'Yoğun sis' },
  sesler: { w: 10, name: 'Garip sesler' },
  ayak_izleri: { w: 10, name: 'Sahilde ayak izleri' },
  siluet: { w: 10, name: 'Denizde siluet' },
  uzak_isik: { w: 15, name: 'Uzak ışık' },
  hayalet_gemi: { w: 5, name: 'Hayalet gemi' },
  npc_kayip: { w: 5, name: 'Kaybolan komşu' },
  fener_ariza: { w: 5, name: 'Fener arızası' },
  yaratik: { w: 3, name: 'Derinlerdeki şey' },
  ozel: { w: 2, name: 'Özel olay' },
};

export class Night {
  constructor() {
    this.objs = [];
    this.active = false;
    this.whisperT = 0;
    this.hornT = 0;
    this.turnCheck = null;
    // kalıcı objeler (gerektiğinde gösterilir)
    this.ship = M.makeGhostShip(); this.ship.group.visible = false; G.scene.add(this.ship.group);
    this.sil = M.makeSilhouette(); this.sil.visible = false; G.scene.add(this.sil);
    this.creature = M.makeCreature(); this.creature.visible = false; G.scene.add(this.creature);
    this.keeper = M.makeSilhouette(); this.keeper.visible = false; G.scene.add(this.keeper);
    const lm = new THREE.SpriteMaterial({ map: G.lamp.haloTex(), color: '#bfefff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
    this.farLight = new THREE.Sprite(lm); this.farLight.scale.set(6, 6, 1); this.farLight.visible = false; G.scene.add(this.farLight);
    this.prints = new THREE.Group(); G.scene.add(this.prints);
  }

  get S() { return G.state; }

  log(text) {
    const S = this.S;
    if (S.nightLog.some(l => l.day === S.day && l.text === text)) return;
    S.nightLog.push({ day: S.day, text });
    if (S.nightLog.length > 60) S.nightLog.shift();
  }

  roll() {
    const S = this.S;
    if (S.nightEvent) return;
    if (S.day === 1 && !S.flags.litOnce) { S.nightEvent = 'sesler'; return; }
    const entries = Object.entries(NIGHT_EVENTS).map(([k, v]) => [k, v.w]);
    let e = weightedPick(entries);
    if (e === 'fener_ariza' && G.skills.level('fener') >= 3 && chance(0.5)) e = 'normal';
    S.nightEvent = e;
  }

  onFirstLight() {
    // İlk yakılan gece hikâye olayıdır: hayalet gemi
    const S = this.S;
    if (!S.flags.ghostSeen) {
      if (this.active) this.cleanup();
      S.nightEvent = 'hayalet_gemi';
      this.begin();
    }
  }

  // 22:00'de başlar
  begin() {
    const S = this.S;
    if (this.active || !S.nightEvent) return;
    this.active = true;
    this.t = 0;
    const e = S.nightEvent;
    this.whisperT = randRange(8, 20);
    this.hornT = randRange(5, 15);
    this.silState = null;
    this.breakAt = randRange(23, 25);
    if (e === 'sis') { G.weather.extraFog = 0; this.fogTarget = 0.8; G.ui.ambientLine('Denizden yoğun bir sis yükseliyor...'); }
    if (e === 'hayalet_gemi') this.setupShip();
    if (e === 'uzak_isik') this.setupFarLight();
    if (e === 'ayak_izleri') this.setupPrints();
    if (e === 'yaratik') this.setupCreature();
    if (e === 'npc_kayip') {
      const cands = ['elias', 'marta', 'tomas', 'ivo', 'agnes'];
      S.missingNpc = pick(cands);
    }
    if (e === 'ozel') this.special = G.area.id === 'fener_ic' || chance(0.5) ? 'kapi' : 'bekci';
  }

  cleanup() {
    this.active = false;
    this.ship.group.visible = false;
    this.sil.visible = false;
    this.creature.visible = false;
    this.farLight.visible = false;
    this.keeper.visible = false;
    this.prints.clear();
    this.fogTarget = 0;
    for (const t of this.targets ?? []) G.lamp.removeTarget(t);
    this.targets = [];
    this.knock = null;
    this.keeperState = null;
    this.silState = null;
  }

  // sabah: sonuçlar
  morning() {
    const S = this.S;
    if (S.missingNpc) {
      const npc = G.npcs.find(n => n.def.id === S.missingNpc);
      if (npc) { npc.wasMissing = true; npc.missingTalked = false; npc.missingDay = S.day; npc.nightGone = false; }
      G.ui.toast(`Kasabada fısıltılar: ${NPC_BY_ID[S.missingNpc].name} dün gece evinde değilmiş...`, 'mystery', 6);
      this.log(`${NPC_BY_ID[S.missingNpc].name} bir gece boyunca kayboldu. Sabah sahilde, denize bakarken bulundu.`);
      S.missingNpc = null;
    }
    if (S.nightEvent === 'yaratik' && S.flags.sawCreatureToday) {
      S.nodes['gizli_0'] = 0; // sahile bir şey vurdu
      S.flags.sawCreatureToday = false;
    }
    S.nightEvent = null;
    this.cleanup();
    G.weather.extraFog = 0;
  }

  outdoorsNear(minX, maxX) {
    return G.area.id === 'world' && G.player.x >= minX && G.player.x <= maxX;
  }
  canSeeSea() { return G.mode === 'beam' || this.outdoorsNear(9, 172) || this.outdoorsNear(-205, -138); }

  // ---------------- kurulumlar ----------------
  setupShip() {
    const o = G.lamp.origin;
    const b = Math.PI / 2 + randRange(-0.7, 0.7);
    const d = 88;
    const g = this.ship.group;
    g.position.set(o.x + Math.cos(b) * d, -1.0, o.z - Math.sin(b) * d);
    g.rotation.y = b + Math.PI / 2 + randRange(-0.3, 0.3);
    g.visible = true;
    this.shipReveal = 0; this.shipSeen = false; this.shipGone = false; this.shipHits = 0;
    for (const m of this.ship.mats) m.opacity = 0;
    const tg = G.lamp.addTarget({
      bearing: b, active: () => !this.shipGone,
      onBeam: (a, dt) => {
        if (a > 0.05) {
          this.shipReveal = Math.min(1, this.shipReveal + dt * 2.5 * a);
          if (this.shipReveal > 0.6 && !this.shipSeen && this.canSeeSea()) {
            this.shipSeen = true;
            G.audio.sting();
            G.state.flags.ghostSeen = true;
            G.mystery.addClue('c09');
            this.log('Fenerin ışığı denizde üç direkli bir gemiyi aydınlattı: AURELIA. Işık döndüğünde gemi yoktu.');
            if (G.state.deductions.includes('d1')) this.answer();
          }
        } else if (this.shipSeen) {
          this.shipReveal = Math.max(0, this.shipReveal - dt * 0.8);
          if (this.shipReveal <= 0) this.shipGone = true;
        } else this.shipReveal = Math.max(0, this.shipReveal - dt * 0.5);
      },
    });
    this.targets = [...(this.targets ?? []), tg];
  }

  setupFarLight() {
    const o = G.lamp.origin;
    const b = Math.PI / 2 + randRange(-0.9, 0.9);
    this.farLight.position.set(o.x + Math.cos(b) * 170, 0.8, o.z - Math.sin(b) * 170);
    this.farLight.visible = true;
    this.farAnswer = 0; this.farAnswered = false;
    const tg = G.lamp.addTarget({
      bearing: b, active: () => true,
      onBeam: (a) => {
        if (a > 0.3 && this.farAnswer <= 0) {
          this.farAnswer = 3;
          if (this.canSeeSea()) {
            this.log('Ufukta bir ışık, fenerin ışığına cevap verdi: üç kısa, bir uzun.');
            if (G.state.deductions.includes('d1') && G.mode === 'beam') this.answer();
          }
        }
      },
    });
    this.targets = [...(this.targets ?? []), tg];
  }

  answer() {
    if (G.state.flags.answeredLight) return;
    G.state.flags.answeredLight = true;
    G.ui.toast('Işık cevap verdi. Bir an için denizden şarkı söyleyen sesler duydun...', 'mystery', 6);
    G.audio.whisper(0);
    G.quests.check();
  }

  setupPrints() {
    this.prints.clear();
    const pts = [];
    for (let i = 0; i < 46; i++) {
      const u = i / 45;
      const x = 104 + u * 42;
      const z = -5.2 + Math.min(1, u * 2.2) * 4.6 + Math.sin(u * 9) * 0.25;
      pts.push([x, z, i]);
    }
    for (const [x, z, i] of pts) {
      const f = M.makeFootprint();
      const side = i % 2 ? 0.14 : -0.14;
      f.position.set(x, terrainHeight(x, z + side) + 0.03, z + side);
      f.rotation.z = Math.PI / 2;
      this.prints.add(f);
    }
    this.printsFound = false;
  }

  setupCreature() {
    const o = G.lamp.origin;
    const b = Math.PI / 2 + randRange(-0.6, 0.6);
    const g = this.creature;
    g.position.set(o.x + Math.cos(b) * 75, -6, o.z - Math.sin(b) * 75);
    g.rotation.y = b;
    g.visible = true;
    this.crReveal = 0; this.crDone = false;
    const tg = G.lamp.addTarget({
      bearing: b, active: () => !this.crDone,
      onBeam: (a, dt) => {
        if (a > 0.2 && !this.crDone) {
          this.crReveal = Math.min(1, this.crReveal + dt * 1.5);
          if (this.crReveal > 0.5 && !this.crSeen && this.canSeeSea()) {
            this.crSeen = true; G.audio.rumble(); G.ui.shake(0.6);
            G.state.flags.sawCreatureToday = true;
            this.log('Işık suyun altında bir şeyi yakaladı. Bir ada kadar büyüktü. Ve bir gözü vardı.');
          }
        } else if (this.crSeen) { this.crReveal -= dt * 0.6; if (this.crReveal <= 0) { this.crDone = true; } }
      },
    });
    this.targets = [...(this.targets ?? []), tg];
  }

  // ---------------- her kare ----------------
  update(dt, t) {
    const S = this.S, h = G.hour, P = G.player;
    G.weather.extraFog = damp(G.weather.extraFog, this.active ? (this.fogTarget ?? 0) : 0, 0.3, dt);
    if (!this.active) {
      if (h >= 22 && S.nightEvent) this.begin();
      // Geri Dönenler görevi: iskele ucunda bekçi
      return;
    }
    this.t += dt;
    const e = S.nightEvent;
    const outdoors = G.area.id === 'world';

    // Bekçi figürü (görev ya da özel olay)
    if ((G.quests.isActive('q_donenler') || (e === 'ozel' && this.special === 'bekci')) && h >= 23 && !S.flags.sawKeeperTonight) this.updateKeeper(dt);

    if (e === 'sis') {
      this.hornT -= dt;
      if (this.hornT <= 0) { this.hornT = randRange(25, 55); G.audio.horn(randRange(-0.6, 0.6)); }
    }

    if (e === 'sesler' && outdoors) {
      this.whisperT -= dt;
      if (this.whisperT <= 0) {
        this.whisperT = randRange(25, 45);
        const behind = -P.rig.facing;
        G.audio.whisper(behind * 0.8);
        G.ui.subtitle('şşşş...');
        this.turnCheck = { t: 2.2, facing: P.rig.facing };
        if (P.x > 9 && P.x < 122 && !this.silState) this.silDelay = 6;
      }
      if (this.turnCheck) {
        this.turnCheck.t -= dt;
        if (P.rig.facing !== this.turnCheck.facing) { G.ui.subtitle('...Kimse yok.'); this.turnCheck = null; this.log('Gece arkandan bir fısıltı duydun. Döndüğünde kimse yoktu.'); }
        else if (this.turnCheck.t <= 0) this.turnCheck = null;
      }
      if (this.silDelay !== undefined && this.silDelay !== null) { this.silDelay -= dt; if (this.silDelay <= 0) { this.silDelay = null; this.spawnSil(); } }
    }

    if (e === 'siluet' && outdoors && P.x > 9 && P.x < 122 && !this.silState && this.t > 4) this.spawnSil();
    if (this.silState) this.updateSil(dt);

    if (e === 'hayalet_gemi') {
      for (const m of this.ship.mats) m.opacity = this.shipReveal * (m.map ? 1 : 0.85);
      this.ship.group.position.y = -1.0 + Math.sin(t * 0.5) * 0.3;
      this.ship.group.visible = !this.shipGone;
    }
    if (e === 'uzak_isik') {
      // 3 kısa 1 uzun
      let on;
      if (this.farAnswer > 0) { this.farAnswer -= dt; on = Math.sin(this.farAnswer * 25) > 0; }
      else { const c = (t % 7); on = (c < 0.3) || (c > 0.6 && c < 0.9) || (c > 1.2 && c < 1.5) || (c > 2.0 && c < 3.0); }
      this.farLight.material.opacity = on ? 0.95 : 0.05;
    }
    if (e === 'yaratik') {
      const [m, eye] = this.creature.userData.mats;
      m.opacity = clamp(this.crReveal, 0, 1) * 0.95; eye.opacity = clamp(this.crReveal * 1.5 - 0.3, 0, 1);
      this.creature.position.y = -6 + this.crReveal * 4;
    }
    if (e === 'ayak_izleri') this.prints.visible = h >= 22.3;
    if (e === 'npc_kayip' && S.missingNpc) {
      const npc = G.npcs.find(n => n.def.id === S.missingNpc);
      if (npc && !npc.nightGone && h >= 23.5 && outdoors && Math.abs(P.x - 110) < 8) {
        npc.nightGone = true;
        G.audio.whisper(0);
        this.log(`Gece ${npc.def.name}'yı sahilde, suyun kenarında denize bakarken gördün. Yaklaştığında yoktu.`);
        S.flags.beachNightSeen = true;
      }
    }
    if (e === 'fener_ariza' && S.lighthouse.lit && h >= this.breakAt && !S.lighthouse.broken) {
      S.lighthouse.broken = true; S.lighthouse.lit = false;
      if (G.area.id === 'fener_ic') G.ui.toast('⚠️ Lamba odasından bir çatırtı geldi! Fener söndü.', 'warn', 6);
      else if (outdoors) G.ui.toast('⚠️ Uzakta fenerin ışığı birden söndü...', 'warn', 6);
      G.audio.snap();
      this.log('Fener gece yarısı arıza yaptı.');
    }
    if (e === 'ozel' && this.special === 'kapi' && G.area.id === 'fener_ic' && h >= 23 && !this.knock) {
      this.knock = { state: 'knocking', t: 0 };
      G.audio.knock();
      G.ui.toast('Kapı çalınıyor...', 'mystery', 5);
    }
  }

  spawnSil() {
    const P = G.player;
    const x = clamp(P.x + P.rig.facing * randRange(8.5, 11), 12, 120);
    this.sil.position.set(x, waveHeight(x, -7.5, G.sea.t) - 0.85, -7.5);
    this.sil.rotation.y = -Math.PI / 2;
    this.sil.visible = true;
    this.silState = { x, op: 0, fading: false };
  }

  updateSil(dt) {
    const s = this.silState, P = G.player;
    if (!s || s === 'done') return;
    const m = this.sil.userData.mat;
    if (!s.fading) {
      this.sil.position.y = waveHeight(s.x, -7.5, G.sea.t) - 0.85;
      s.op = Math.min(0.95, s.op + dt * 0.5);
      if (G.area.id === 'world' && Math.abs(P.x - s.x) < 5) {
        s.fading = true;
        G.audio.whisper(0);
        this.S.flags.beachNightSeen = true;
        this.log('Denizde, belden aşağısı suyun içinde bir insan silueti gördün. Yaklaştığında kayboldu.');
      }
    } else {
      s.op -= dt * 1.4;
      this.sil.position.y -= dt * 0.8;
      if (s.op <= 0) { this.sil.visible = false; this.silState = 'done'; }
    }
    m.opacity = Math.max(0, s.op);
  }

  updateKeeper(dt) {
    const k = this.keeper, P = G.player;
    if (!this.keeperState) {
      this.keeperState = { x: 41.4, op: 0, walking: false };
      k.position.set(41.4, 0.62, 0.3); k.rotation.y = -Math.PI / 2; k.visible = true;
    }
    const s = this.keeperState;
    const m = k.userData.mat;
    if (!s.walking) {
      s.op = Math.min(0.95, s.op + dt * 0.4);
      if (G.area.id === 'world' && Math.abs(P.x - s.x) < 6.5) { s.walking = true; G.audio.sting(); }
    } else {
      k.position.z -= dt * 0.9;
      k.position.y -= dt * 0.35;
      s.op -= dt * 0.3;
      if (s.op <= 0) {
        k.visible = false; this.keeperState = null;
        this.S.flags.sawKeeper = true; this.S.flags.sawKeeperTonight = true;
        this.log('İskelenin ucunda bekçi paltolu bir adam gördün. Arkasını dönüp denize yürüdü. Su onu yuttu.');
        G.quests.check();
        return;
      }
    }
    m.opacity = Math.max(0, s.op);
  }

  // Fener kapısı olayı
  doorEvent() {
    if (!this.knock || this.knock.state !== 'knocking') return false;
    this.knock.state = 'opened';
    G.ui.dialog({
      speaker: null, lines: ['Kapıyı açıyorsun.', 'Kimse yok. Sadece rüzgâr.', 'Eşikte ıslak ayak izleri var. Denizden gelip... burada bitiyorlar.'],
      onEnd: () => { G.mystery.addClue('c05'); this.log('Gece fenerin kapısı çalındı. Açtığında eşikte ıslak ayak izlerinden başka bir şey yoktu.'); },
    });
    return true;
  }

  inspectPrints() {
    G.ui.dialog({
      speaker: null, lines: ['Islak, çıplak ayak izleri.', 'Ama bir tuhaflık var: izler denize gitmiyor. Denizden geliyor.', 'Fenerin kapısına doğru uzanıyorlar.'],
      onEnd: () => { G.mystery.addClue('c05'); this.log('Sahilde denizden gelen ıslak ayak izleri buldun. Fenerin kapısına uzanıyorlardı.'); },
    });
  }
}
