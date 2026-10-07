import * as THREE from 'three';
import { G } from '../game.js';
import { createCharacter, animateCharacter } from './character.js';
import { LOCATIONS } from '../data/npcs.js';
import { groundY, terrainHeight } from '../world/terrain.js';
import { damp } from '../core/utils.js';

const WORK = ['market', 'bar', 'atolye', 'belediye'];

export class NPC {
  constructor(def) {
    this.def = def;
    this.rig = createCharacter(def.look);
    G.scene.add(this.rig.root);
    this.x = 0; this.z = -1; this.y = 0;
    this.locKey = null;
    this.visible = true;
    this.arrived = false;
    this.wasMissing = false; this.missingTalked = false;
    this.pose = 'idle';
    this.vx = 0;
    // balık tutma pozunda görünen olta
    this.rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 2.4, 5), new THREE.MeshStandardMaterial({ color: '#5a3a1a' }));
    this.rod.geometry.translate(0, 1.1, 0);
    this.rod.rotation.z = -1.0;
    this.rod.visible = false;
    this.rig.handSlot.add(this.rod);
  }

  get atWork() { return this.arrived && WORK.includes(this.locKey); }

  scheduleKey(hour) {
    const S = G.state, d = this.def;
    if (d.movesIn && !S.selinArrived) return null;
    if (d.id === 'hale' && !S.flags.hasKey) return 'giris';
    // kayıp NPC: gece yok, sabah sahilde
    if (S.missingNpc === d.id && hour >= 22) {
      return hour >= 23.5 && !this.nightGone ? 'sahil_gece' : null;
    }
    if (this.wasMissing && S.day === this.missingDay && hour < 9.5) return 'sahil_kayip';
    const rain = (S.weather === 'yagmur' || S.weather === 'firtina') && d.rainSchedule;
    const sch = rain ? d.rainSchedule : d.schedule;
    for (const [a, b, k] of sch) if (hour >= a && hour < b) return k;
    return sch[sch.length - 1][2];
  }

  loc(key) {
    if (key === 'giris') return { x: -60, z: -1.4 };
    return LOCATIONS[key];
  }

  teleport(hour) {
    const key = this.scheduleKey(hour);
    this.locKey = key;
    if (!key) { this.visible = false; return; }
    const L = this.loc(key);
    this.x = L.x; this.z = L.indoor ? -1.2 : (L.z ?? -1.2);
    this.visible = !L.indoor;
    this.arrived = true;
  }

  update(dt, hour, t) {
    const key = this.scheduleKey(hour);
    if (key !== this.locKey) {
      // yeni hedef: içerideyse kapıdan çık
      const prev = this.locKey ? this.loc(this.locKey) : null;
      if (!this.visible && key) {
        this.visible = true;
        if (prev) this.x = prev.x;
        else this.x = this.loc(key).x;
        this.z = -1.2;
      }
      if (!key) this.visible = false;
      this.locKey = key;
      this.arrived = false;
    }
    if (!key) { this.rig.root.visible = false; return; }
    const L = this.loc(key);
    const walkZ = -1.15;
    const dx = L.x - this.x;
    if (!this.arrived) {
      // önce yürüme hattına, sonra hedefe
      this.z = damp(this.z, Math.abs(dx) > 0.6 ? walkZ : (L.z ?? walkZ), 4, dt);
      const sp = 2.1;
      if (Math.abs(dx) > 0.08) {
        this.vx = Math.sign(dx) * sp;
        this.x += this.vx * dt;
        if (Math.sign(L.x - this.x) !== Math.sign(dx)) this.x = L.x;
        this.rig.facing = Math.sign(dx);
        this.pose = 'walk';
      } else {
        this.vx = 0;
        if (Math.abs(this.z - (L.z ?? walkZ)) < 0.08 || L.indoor) {
          this.arrived = true;
          if (L.indoor) this.visible = false;
        }
        this.pose = 'idle';
      }
    } else {
      this.vx = 0;
      this.z = damp(this.z, L.indoor ? walkZ : (L.z ?? walkZ), 4, dt);
      this.pose = L.pose ?? 'idle';
      if (L.pose === 'fish' || key === 'sahil_agnes' || key === 'sahil_kayip' || key === 'sahil_selin' || key === 'sahil_gece') {
        this.pose = L.pose === 'fish' ? 'fish' : 'look';
      }
      // dükkân sahipleri müşteriye döner
      if (WORK.includes(key)) { this.pose = L.pose ?? 'idle'; this.rig.facing = G.player.x > this.x ? 1 : -1; }
    }
    // Oyuncu konuşurken ona dön
    if (G.ui?.talkingTo === this) { this.rig.facing = G.player.x > this.x ? 1 : -1; if (this.pose !== 'sit') this.pose = 'idle'; }

    const inside = this.z < -2.6 && this.x > -54 && this.x < 4;
    this.y = inside ? 0.2 : (this.x > 9.6 && this.x < 42.4 && Math.abs(this.z) < 1.65 ? 0.62 : terrainHeight(this.x, Math.max(-2.2, this.z)));
    if (L.pose === 'sit' && this.arrived) this.y += 0.2;
    if (this.x <= 9.6 && this.x > 8) this.y = groundY(this.x);

    this.rig.root.visible = this.visible && G.area.id === 'world';
    this.rod.visible = this.pose === 'fish';
    animateCharacter(this.rig, dt, Math.abs(this.vx), this.pose, t);
    this.rig.root.position.set(this.x, this.y, this.z);
  }
}
