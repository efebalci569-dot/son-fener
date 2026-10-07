// Fener lambası: yağ, yakma, dönen hüzme, elle yönetim ve hüzme hedefleri
import * as THREE from 'three';
import { G } from '../game.js';
import { Input } from '../core/input.js';
import { damp, clamp } from '../core/utils.js';

const BEAM_LEN = 150;

function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color('#fff2c8') }, intensity: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `
      varying float vLen; varying vec3 vN; varying vec3 vV;
      void main(){
        vLen = position.x / ${BEAM_LEN.toFixed(1)};
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform float intensity;
      varying float vLen; varying vec3 vN; varying vec3 vV;
      void main(){
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 0.9);
        float fall = pow(1.0 - smoothstep(0.0, 1.0, vLen), 1.4);
        float a = intensity * fall * (0.35 + 0.65 * smoothstep(0.0, 0.03, vLen)) * edge * 0.75;
        gl_FragColor = vec4(color * a, a);
      }`,
  });
}

export class Lamp {
  constructor() {
    const lh = G.world.lighthouse;
    this.lh = lh;
    this.origin = lh.worldLamp.clone();
    this.mat = beamMaterial();
    const geo = new THREE.CylinderGeometry(0.35, 11, BEAM_LEN, 28, 1, true);
    geo.translate(0, -BEAM_LEN / 2, 0);
    geo.rotateZ(Math.PI / 2);
    this.pivot = new THREE.Group();
    this.pivot.position.copy(this.origin);
    const b1 = new THREE.Mesh(geo, this.mat); b1.rotation.z = -0.085;
    const b2 = new THREE.Mesh(geo, this.mat);
    b2.rotation.order = 'YXZ'; b2.rotation.y = Math.PI; b2.rotation.z = -0.085;
    for (const b of [b1, b2]) { b.frustumCulled = false; b.renderOrder = 10; }
    this.pivot.add(b1, b2);
    this.b2 = b2;
    G.scene.add(this.pivot);
    // gerçek aydınlatma
    this.spot = new THREE.SpotLight('#fff0c8', 0, 170, 0.15, 0.55, 0.55);
    this.spot.position.copy(this.origin);
    G.scene.add(this.spot); G.scene.add(this.spot.target);
    this.glow = new THREE.PointLight('#ffe6a0', 0, 30, 1.2);
    this.glow.position.copy(this.origin);
    G.scene.add(this.glow);
    // parlama halesi
    const sm = new THREE.SpriteMaterial({ map: this.haloTex(), color: '#fff0c0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
    this.halo = new THREE.Sprite(sm); this.halo.scale.set(9, 9, 1); this.halo.position.copy(this.origin);
    G.scene.add(this.halo);

    this.level = 0; // görsel yoğunluk 0..1
    this.targets = [];
    this.controlYaw = Math.PI / 2;
    this.flicker = 0;
  }

  haloTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,240,200,0.5)'); g.addColorStop(1, 'rgba(255,220,160,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  get S() { return G.state.lighthouse; }
  hoursPerOil() { return (2 + this.S.level * 0.5) * (G.skills.level('fener') >= 5 ? 1.5 : 1); }
  capacity() { return (this.S.level + 1) * this.hoursPerOil(); }

  addOil() {
    if (!G.inv.has('lamba_yagi')) { G.ui.toast('Lamba yağın yok. Balıktan ya da reçineden üretebilir, Marta\'dan alabilirsin.', 'warn'); return false; }
    const per = this.hoursPerOil();
    if (this.S.fuel + per > this.capacity() + 0.01) { G.ui.toast('Hazne dolu.', 'info'); return false; }
    G.inv.remove('lamba_yagi', 1);
    this.S.fuel += per;
    G.audio.click();
    G.ui.toast(`🛢️ Yağ eklendi. Yakıt: ${this.S.fuel.toFixed(1)} saat`, 'info');
    return true;
  }

  light() {
    const S = this.S, F = G.state.flags;
    if (!F.lampRepaired) { G.ui.toast('Lamba kırık. Önce onarmalısın.', 'warn'); return; }
    if (S.broken) { G.ui.toast('Lamba arızalı! Onarman gerekiyor.', 'warn'); return; }
    if (S.fuel <= 0.01) { G.ui.toast('Haznede yağ yok.', 'warn'); return; }
    const h = G.hour;
    if (h < 17) { G.ui.toast('Gün ışığında feneri yakmak yağ israfı olur. (17:00 sonrası)', 'info'); return; }
    S.lit = true;
    G.audio.ignite();
    G.ui.toast('🔆 Fener yandı. Işık denize uzanıyor.', 'lamp', 4);
    if (!F.litOnce) { F.litOnce = true; G.night.onFirstLight(); }
    G.skills.add('fener', 8);
    G.quests.check();
  }

  extinguish() { this.S.lit = false; G.audio.click(); }

  repairBreak() {
    if (!G.inv.has('hurda', 2)) { G.ui.toast('Onarım için 2 Hurda Metal gerekli.', 'warn'); return; }
    G.inv.remove('hurda', 2);
    this.S.broken = false;
    G.player.doAction(1.2);
    G.audio.mine();
    G.skills.add('fener', 25);
    G.ui.toast('Lamba onarıldı. Tekrar yakabilirsin.', 'lamp');
  }

  // oyun dakikası geçtikçe
  tick(gm) {
    const S = this.S;
    if (!S.lit) return;
    S.fuel -= gm / 60;
    if (G.hour >= 22) S.nightLit = (S.nightLit ?? 0) + gm;
    if (S.fuel <= 0) {
      S.fuel = 0; S.lit = false;
      G.ui.toast('⚠️ Fenerin yağı bitti! Işık söndü.', 'warn', 5);
    }
  }

  enterControl() {
    if (!this.S.lit) { G.ui.toast('Önce feneri yakmalısın.', 'warn'); return; }
    G.mode = 'beam';
    this.controlYaw = Math.PI / 2;
    G.ui.beamHud(true);
  }
  exitControl() { G.mode = 'play'; G.ui.beamHud(false); }

  // hüzme hedefi: { bearing, active(), onBeam(amount, dt) }
  addTarget(t) { this.targets.push(t); return t; }
  removeTarget(t) { this.targets = this.targets.filter(x => x !== t); }

  update(dt, t) {
    const S = this.S;
    const on = S.lit && !S.broken;
    this.flicker = S.lit && S.fuel < 0.5 ? (Math.random() < 0.15 ? 0.3 : 1) : 1;
    this.level = damp(this.level, on ? this.flicker : 0, on ? 2.5 : 4, dt);
    const night = G.env.night;
    const vis = this.level * (0.25 + night * 0.75);
    const L = G.state.lighthouse.level;

    if (G.mode === 'beam') {
      if (Input.left()) this.controlYaw += dt * 0.7;
      if (Input.right()) this.controlYaw -= dt * 0.7;
      this.controlYaw = clamp(this.controlYaw, Math.PI / 2 - 1.25, Math.PI / 2 + 1.25);
      S.yaw = damp(S.yaw, this.controlYaw, 6, dt);
      if (Input.wasPressed('Escape', 'KeyE')) this.exitControl();
    } else if (on) {
      S.yaw = (S.yaw + dt * (0.42 + L * 0.03)) % (Math.PI * 2);
    }
    this.pivot.rotation.y = S.yaw;
    this.b2.visible = G.mode !== 'beam';
    const range = 1 + (L - 1) * 0.12 + (G.skills.level('fener') >= 8 ? 0.15 : 0);
    this.pivot.scale.set(range, 1 + (L - 1) * 0.1, 1 + (L - 1) * 0.1);
    this.mat.uniforms.intensity.value = vis * (1 + G.weather.fogTotal * 0.8);
    const dir = new THREE.Vector3(Math.cos(S.yaw), -0.06, -Math.sin(S.yaw));
    this.spot.target.position.copy(this.origin).addScaledVector(dir, 70);
    this.spot.intensity = vis * 140 * range;
    this.spot.angle = 0.13 + L * 0.012;
    this.glow.intensity = vis * 25;
    this.halo.material.opacity = vis * 0.9;
    this.halo.visible = G.mode !== 'beam';
    this.lh.glassMat.emissiveIntensity = this.level * 2.5;
    this.lh.lampCore.material.color.set(this.level > 0.3 ? '#fff6d8' : '#3a3020');

    // hedefler
    for (const tg of this.targets) {
      if (tg.active && !tg.active()) continue;
      let diff = Math.abs(((S.yaw - tg.bearing) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const amount = on ? clamp(1 - diff / (0.13 + L * 0.01), 0, 1) * this.level : 0;
      tg.onBeam(amount, dt);
    }
  }

  // hüzme yönetiminde kamera
  beamCamera(cam) {
    const S = this.S;
    const fwd = new THREE.Vector3(Math.cos(S.yaw), 0, -Math.sin(S.yaw));
    // galerinin önünden, ışığın biraz üstünden denize bak
    cam.position.copy(this.origin).addScaledVector(fwd, 2.6).add(new THREE.Vector3(0, 1.4, 0));
    const look = this.origin.clone().addScaledVector(fwd, 70).add(new THREE.Vector3(0, -9, 0));
    cam.lookAt(look);
  }

  bearingTo(x, z) { return Math.atan2(-(z - this.origin.z), x - this.origin.x); }
}
