import * as THREE from 'three';
import { G, canAct } from '../game.js';
import { createCharacter, animateCharacter } from './character.js';
import { Input } from '../core/input.js';
import { damp } from '../core/utils.js';
import { surfaceAt, STRAIT } from '../world/terrain.js';

export class Player {
  constructor() {
    this.rig = createCharacter({ coat: '#2b3a55', pants: '#2a2a33', skin: '#e2b48e', hair: '#4a3020', hat: 'beanie', hatColor: '#8a2f2f', boots: '#1e1814', scarf: '#d9a441' });
    G.scene.add(this.rig.root);
    this.x = -63; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0;
    this.onGround = true; this.floor = 0;
    this.lock = 0; this.lockPose = 'work';
    this.pose = 'idle';
    this.lanternOn = false;
    this.lastStep = 0;

    // El feneri (kemerde)
    this.lantern = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.4 }));
    this.lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: '#ffb050', emissiveIntensity: 0 }));
    this.lantern.add(body, this.lanternGlass);
    this.lantern.position.y = -0.12;
    this.rig.hipSlot.add(this.lantern);
    this.light = new THREE.PointLight('#ffb35a', 0, 12, 1.4);
    this.light.castShadow = false;
    G.scene.add(this.light);

    // Olta (balık tutarken)
    this.rod = new THREE.Group();
    const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 2.4, 5), new THREE.MeshStandardMaterial({ color: '#5a3a1a' }));
    rodMesh.position.y = 1.1; this.rod.add(rodMesh);
    this.rodTip = new THREE.Object3D(); this.rodTip.position.y = 2.3; this.rod.add(this.rodTip);
    this.rod.rotation.z = -1.0;
    this.rod.visible = false;
    this.rig.handSlot.add(this.rod);
  }

  get area() { return G.area; }

  setPos(x, floor = 0) {
    this.x = x; this.floor = floor;
    this.y = G.area.ground(x, this);
    this.vx = 0; this.vy = 0;
  }

  doAction(seconds, pose = 'work') { this.lock = seconds; this.lockPose = pose; }

  speed() {
    const kesif = G.skills.level('kesif');
    return 1 + (kesif >= 3 ? 0.04 : 0) + kesif * 0.006;
  }

  update(dt, t) {
    const area = G.area;
    // sandal sürerken oyuncu sandalın kıçında oturur
    if (G.mode === 'drive' && G.sandal?.driving) {
      const s = G.sandal, p = s.seat();
      this.x = p.x; this.y = p.y; this.vx = s.vx; this.vy = 0; this.onGround = true;
      this.rig.facing = s.dir;
      this.pose = 'drive';
      animateCharacter(this.rig, dt, 0, 'drive', t);
      this.rig.root.position.copy(p);
      this.rig.root.rotation.set(s.mesh.rotation.x, 0, s.mesh.rotation.z * Math.cos(s.yaw));
      this.updateLantern(dt, t);
      return;
    }
    this.rig.root.rotation.set(0, 0, 0);
    const control = canAct() && this.lock <= 0;
    let target = 0, running = false;
    if (control) {
      if (Input.left()) target -= 1;
      if (Input.right()) target += 1;
      running = Input.isDown('ShiftLeft', 'ShiftRight');
      if (target !== 0) this.rig.facing = target;
      if (Input.wasPressed('Space', 'KeyW', 'ArrowUp') && this.onGround && area.id !== 'fener_ic') {
        this.vy = 8.2; this.onGround = false;
      }
    }
    const max = (running ? 7.6 : 4.3) * this.speed();
    this.vx = damp(this.vx, target * max, target ? 10 : 14, dt);
    let nx = this.x + this.vx * dt;

    // kapılar / sınırlar
    if (area.id === 'world') {
      if (!G.state.flags.forestOpen && nx < -68.4) nx = -68.4;
      if (!G.state.flags.shipyardOpen && nx < -137.8) nx = -137.8;
      // boğaz yüzülerek geçilemez: sandal gerekir
      if (nx > STRAIT.from && nx < STRAIT.to) nx = this.x < 137 ? STRAIT.from : STRAIT.to;
    }
    nx = Math.max(area.minX, Math.min(area.maxX, nx));
    if (nx !== this.x + this.vx * dt) this.vx = 0;
    this.x = nx;

    // dikey
    const gy = area.ground(this.x, this);
    this.vy -= 24 * dt;
    this.y += this.vy * dt;
    if (this.y <= gy) {
      if (!this.onGround && this.vy < -6) G.audio.footstep(this.surface());
      this.y = gy; this.vy = 0; this.onGround = true;
    } else if (this.y - gy > 0.05) this.onGround = false;
    if (this.onGround) this.y = gy;
    if (this.lock > 0) this.lock -= dt;

    // poz
    const spd = Math.abs(this.vx);
    if (G.mode === 'fishing') this.pose = 'fish';
    else if (this.lock > 0) this.pose = this.lockPose;
    else if (!this.onGround) this.pose = 'jump';
    else if (spd > 5.2) this.pose = 'run';
    else if (spd > 0.3) this.pose = 'walk';
    else this.pose = 'idle';
    animateCharacter(this.rig, dt, spd, this.pose, t);
    this.rig.root.position.set(this.x, this.y, this.z);

    // ayak sesleri
    if ((this.pose === 'walk' || this.pose === 'run') && this.onGround) {
      const ph = Math.floor(this.rig.phase / Math.PI);
      if (ph !== this.lastStep) { this.lastStep = ph; G.audio.footstep(this.surface()); }
    }

    this.updateLantern(dt, t);
  }

  updateLantern(dt, t) {
    const area = G.area;
    const hasLantern = G.inv.has('el_feneri');
    this.lantern.visible = hasLantern;
    const on = hasLantern && this.lanternOn;
    const base = area.id === 'magara' ? 26 : G.mode === 'drive' ? 5 : 16;
    const want = on ? base * (0.92 + Math.sin(t * 13) * 0.04 + Math.sin(t * 7.3) * 0.04) : 0;
    this.light.intensity = damp(this.light.intensity, want, 8, dt);
    this.lanternGlass.material.emissiveIntensity = on ? 2.5 : 0;
    this.light.position.set(this.x + this.rig.facing * 0.4, this.y + 1.3, this.z + 0.9);
    this.rod.visible = G.mode === 'fishing';
  }

  surface() {
    const a = G.area;
    if (a.id === 'world') return surfaceAt(this.x);
    return a.surface ?? 'stone';
  }

  toggleLantern() {
    if (!G.inv.has('el_feneri')) { G.ui.toast('El fenerin yok. Atölyede üretebilirsin.', 'warn'); return; }
    this.lanternOn = !this.lanternOn;
    G.audio.click();
  }
}
