// Fener sandalı: sahil iskelesi ile fener adası arasında oyuncunun kendisi sürer
import * as THREE from 'three';
import { G } from '../game.js';
import * as M from '../world/models.js';
import { Input } from '../core/input.js';
import { waveHeight } from '../world/sea.js';
import { SANDAL_DOCK } from '../world/terrain.js';
import { damp, clamp } from '../core/utils.js';

function makeSandal() {
  const g = new THREE.Group();
  const hull = M.makeBoat({ L: 3.8, W: 1.55, color: '#e8e0cc', cabin: false });
  g.add(hull);
  // renk şeridi ve oturaklar
  g.add(M.box(3.4, 0.12, 1.5, '#a83a30', -0.05, 0.8, 0));
  for (const x of [-0.8, 0.5]) g.add(M.box(0.32, 0.08, 1.35, '#7a5a3a', x, 0.98, 0));
  // dıştan takma motor
  const motor = new THREE.Group();
  motor.add(M.box(0.42, 0.5, 0.36, '#2a2e34', 0, 0.3, 0));
  motor.add(M.box(0.46, 0.14, 0.4, '#c8402e', 0, 0.58, 0));
  motor.add(M.cyl(0.05, 0.05, 1.1, '#3a3e44', 6, 0.05, -0.35, 0));
  motor.add(M.box(0.18, 0.1, 0.12, '#3a3e44', 0.12, -0.9, 0));
  const tiller = M.box(0.7, 0.05, 0.05, '#1a1a1e', 0.42, 0.42, 0); motor.add(tiller);
  motor.position.set(-2.0, 0.75, 0);
  g.add(motor);
  // pruva feneri (gece yanar)
  g.add(M.cyl(0.03, 0.03, 0.8, '#2a2a2e', 5, 1.55, 1.3, 0));
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: '#ffc060', emissiveIntensity: 0 });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), lampMat);
  lamp.position.set(1.55, 1.78, 0); g.add(lamp);
  // halat sargısı
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 5, 10), M.mat('#b8a070'));
  rope.rotation.x = Math.PI / 2; rope.position.set(0.95, 0.92, 0.35); g.add(rope);
  return { g, lampMat, motor };
}

export class Sandal {
  constructor() {
    const { g, lampMat, motor } = makeSandal();
    this.mesh = g; this.lampMat = lampMat; this.motor = motor;
    G.scene.add(g);
    this.light = new THREE.PointLight('#ffc070', 0, 10, 1.5);
    G.scene.add(this.light);
    this.x = SANDAL_DOCK.beach; this.vx = 0; this.dir = 1; this.yaw = 0; this.y = 0;
    this.driving = false;
    // köpük izi
    this.foam = [];
    const fm = new THREE.MeshBasicMaterial({ color: '#e8f2f4', transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 28; i++) {
      const f = new THREE.Mesh(new THREE.CircleGeometry(0.35, 8), fm.clone());
      f.rotation.x = -Math.PI / 2; f.visible = false; G.scene.add(f);
      this.foam.push({ m: f, life: 0 });
    }
    this.foamT = 0; this.fi = 0;
  }

  get side() { return G.state.sandalSide ?? 'beach'; }
  set side(v) { G.state.sandalSide = v; }

  // oyuncu yürüyerek (sandalsız) bir yere vardığında sandal onun tarafında bekler
  placeForPlayer(x) {
    if (this.driving) return;
    if (x > 137) this.side = 'island';
    else if (x < 122) this.side = 'beach';
    this.x = SANDAL_DOCK[this.side];
    this.dir = this.side === 'beach' ? 1 : -1;
    this.yaw = this.dir > 0 ? 0 : Math.PI;
    this.vx = 0;
  }

  board() {
    this.driving = true;
    this.x = SANDAL_DOCK[this.side];
    G.mode = 'drive';
    G.player.vx = 0;
    G.audio.splash();
    G.ui.driveHud(true);
    G.state.flags.usedSandal = true;
  }

  canLeave() {
    const nearA = Math.abs(this.x - SANDAL_DOCK.beach) < 1.0, nearB = Math.abs(this.x - SANDAL_DOCK.island) < 1.0;
    return (nearA || nearB) && Math.abs(this.vx) < 2.2;
  }

  leave() {
    const atBeach = Math.abs(this.x - SANDAL_DOCK.beach) < Math.abs(this.x - SANDAL_DOCK.island);
    this.side = atBeach ? 'beach' : 'island';
    this.x = SANDAL_DOCK[this.side]; this.vx = 0;
    this.driving = false;
    G.mode = 'play';
    G.ui.driveHud(false);
    G.player.setPos(atBeach ? SANDAL_DOCK.beach - 1.7 : SANDAL_DOCK.island + 1.8);
    G.player.rig.facing = atBeach ? -1 : 1;
    G.camSnap = false;
    G.audio.footstep('wood');
    G.audio.engine(0, false);
  }

  update(dt, t) {
    const A = SANDAL_DOCK.beach, B = SANDAL_DOCK.island;
    if (this.driving && G.mode === 'drive') {
      let thrust = 0;
      if (Input.left()) thrust -= 1;
      if (Input.right()) thrust += 1;
      const boost = Input.isDown('ShiftLeft', 'ShiftRight') ? 1.4 : 1;
      const max = 4.4 * boost;
      if (thrust) { this.vx += thrust * 3.4 * boost * dt; this.dir = thrust; }
      this.vx = clamp(this.vx, -max, max);
      this.vx = damp(this.vx, 0, thrust ? 0.15 : 0.9, dt); // su direnci
      this.x += this.vx * dt;
      if (this.x < A) { this.x = A; if (this.vx < -1.5) { G.audio.chop(); G.ui.shake(0.15); } this.vx = 0; }
      if (this.x > B) { this.x = B; if (this.vx > 1.5) { G.audio.chop(); G.ui.shake(0.15); } this.vx = 0; }
      G.audio.engine(this.vx, true);
      if (this.canLeave() && Input.wasPressed('KeyE')) { this.leave(); return; }
    }
    const tYaw = this.dir > 0 ? 0 : Math.PI;
    let d = tYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 2.5);
    const sea = G.sea.t;
    this.y = waveHeight(this.x, 0, sea) - 0.18;
    const ahead = waveHeight(this.x + 1.2, 0, sea), behind = waveHeight(this.x - 1.2, 0, sea);
    const w = G.weather.cur.waves;
    this.mesh.position.set(this.x, this.y, 0);
    this.mesh.rotation.set(Math.sin(t * 1.1) * 0.035 * w, this.yaw, (ahead - behind) * 0.35 * Math.cos(this.yaw) - this.vx * 0.012 * Math.cos(this.yaw));
    this.motor.rotation.y = this.driving ? Math.sin(t * 30) * 0.01 * Math.min(1, Math.abs(this.vx)) : 0;

    // pruva feneri: gece yanar
    const night = G.env.night;
    this.lampMat.emissiveIntensity = night * 1.6;
    const bow = new THREE.Vector3(1.55, 1.78, 0).applyEuler(this.mesh.rotation).add(this.mesh.position);
    this.light.position.copy(bow);
    this.light.intensity = G.area.id === 'world' ? night * 5 : 0;
    this.light.distance = 9;

    // köpük izi
    this.foamT -= dt;
    if (Math.abs(this.vx) > 1 && this.foamT <= 0) {
      this.foamT = 0.07;
      const f = this.foam[this.fi++ % this.foam.length];
      f.life = 1.3;
      f.m.position.set(this.x - Math.sign(this.vx) * 2.0, this.y + 0.2, (Math.random() - 0.5) * 0.6);
      f.m.scale.setScalar(0.6);
      f.m.visible = true;
    }
    for (const f of this.foam) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.m.material.opacity = Math.max(0, f.life / 1.3) * 0.55;
      f.m.scale.addScalar(dt * 1.3);
      f.m.position.y = waveHeight(f.m.position.x, f.m.position.z, sea) + 0.03;
      if (f.life <= 0) f.m.visible = false;
    }
  }

  // oyuncunun oturduğu yer (kıç tarafında, motorun önü)
  seat() {
    return new THREE.Vector3(-0.85, 0.64, 0).applyEuler(this.mesh.rotation).add(this.mesh.position);
  }

  // kayıttan yüklenince sandalı kayıtlı tarafa koy
  syncSide() {
    this.x = SANDAL_DOCK[this.side];
    this.dir = this.side === 'beach' ? 1 : -1;
    this.yaw = this.dir > 0 ? 0 : Math.PI;
    this.vx = 0;
  }

  stopDriving() {
    if (!this.driving) return;
    this.driving = false; this.vx = 0;
    G.ui.driveHud(false);
    G.audio.engine(0, false);
  }
}
