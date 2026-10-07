// Gündüz/gece paleti, ışıklandırma, sis ve ışık havuzu
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/utils.js';
import { WINDOW_MATS, LAMP_MAT } from './models.js';

const NIGHT = { top: '#04070f', hor: '#1a2a44', bot: '#06080e', sun: '#9ab4e8', sunI: 0.95, hemiS: '#3a5282', hemiG: '#141820', hemiI: 0.95, fog: '#141f33', sea: '#15324a', cloud: '#1c2436' };
const KEYS = [
  { h: 0, ...NIGHT },
  { h: 4.6, ...NIGHT },
  { h: 5.6, top: '#1a2448', hor: '#6a4a6a', bot: '#141420', sun: '#c08080', sunI: 0.5, hemiS: '#4a4a70', hemiG: '#1a1418', hemiI: 0.55, fog: '#4a3a50', sea: '#1a2a3a', cloud: '#5a4a60' },
  { h: 6.6, top: '#4a6aa0', hor: '#f2b08a', bot: '#2a2a30', sun: '#ffb070', sunI: 1.5, hemiS: '#90a8d0', hemiG: '#4a3a30', hemiI: 0.85, fog: '#c8a898', sea: '#3a5a70', cloud: '#f2c4a4' },
  { h: 8.2, top: '#5a8fd0', hor: '#cfe0ee', bot: '#3a4a50', sun: '#fff0d8', sunI: 2.6, hemiS: '#b0d0f0', hemiG: '#5a5040', hemiI: 1.0, fog: '#b8cad8', sea: '#2a6478', cloud: '#ffffff' },
  { h: 13, top: '#4a84d4', hor: '#d8eaf6', bot: '#3a4a50', sun: '#ffffff', sunI: 3.0, hemiS: '#b8d8f8', hemiG: '#5a5442', hemiI: 1.05, fog: '#c0d2e0', sea: '#2a6a80', cloud: '#ffffff' },
  { h: 16.8, top: '#5a80c0', hor: '#f0d4ac', bot: '#3a3a40', sun: '#ffd8a0', sunI: 2.4, hemiS: '#b0c0e0', hemiG: '#5a4a38', hemiI: 0.95, fog: '#d0c0b0', sea: '#2f5a70', cloud: '#fff0e0' },
  { h: 18.6, top: '#3a4078', hor: '#f28a5a', bot: '#2a2028', sun: '#ff8040', sunI: 1.3, hemiS: '#a08098', hemiG: '#3a2a28', hemiI: 0.75, fog: '#a07078', sea: '#3a4a68', cloud: '#f09070' },
  { h: 19.8, top: '#161b3a', hor: '#4a3a62', bot: '#100c18', sun: '#a0a8d8', sunI: 0.7, hemiS: '#3a4268', hemiG: '#141218', hemiI: 0.8, fog: '#26283e', sea: '#1a2c44', cloud: '#3a3050' },
  { h: 21, ...NIGHT },
  { h: 24, ...NIGHT },
];
const KEYC = KEYS.map(k => {
  const o = { h: k.h, sunI: k.sunI, hemiI: k.hemiI };
  for (const f of ['top', 'hor', 'bot', 'sun', 'hemiS', 'hemiG', 'fog', 'sea', 'cloud']) o[f] = new THREE.Color(k[f]);
  return o;
});

const GRAY = new THREE.Color('#7a8088');
const tmp = new THREE.Color();

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.hemi = new THREE.HemisphereLight('#b0d0f0', '#5a5040', 1);
    scene.add(this.hemi);
    this.dir = new THREE.DirectionalLight('#ffffff', 2.5);
    this.dir.castShadow = true;
    this.dir.shadow.mapSize.set(2048, 2048);
    const sc = this.dir.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 24; sc.bottom = -14; sc.near = 1; sc.far = 160;
    this.dir.shadow.bias = -0.0006;
    this.dir.shadow.normalBias = 0.03;
    scene.add(this.dir); scene.add(this.dir.target);
    this.amb = new THREE.AmbientLight('#ffffff', 0.05);
    scene.add(this.amb);
    // Gece/şafakta karakterlerin önü tamamen kararmasın diye gölgesiz dolgu ışığı
    this.fill = new THREE.DirectionalLight('#8fa8d8', 0);
    scene.add(this.fill); scene.add(this.fill.target);
    scene.fog = new THREE.FogExp2('#b8cad8', 0.004);

    // Nokta ışık havuzu
    this.pool = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight('#ffb060', 0, 12, 1.6);
      scene.add(l);
      this.pool.push(l);
    }
    this.sources = [];

    this.p = {
      skyTop: new THREE.Color(), skyHorizon: new THREE.Color(), skyBottom: new THREE.Color(), fogColor: new THREE.Color(),
      sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), sunGlowColor: new THREE.Color(), cloudColor: new THREE.Color(),
      seaColor: new THREE.Color(), sunGlow: 0, skyFog: 0, stars: 0, sunVisible: 0, moonVisible: 0, cloudOpacity: 1, wind: 0,
    };
    this.night = 0; // 0 gündüz – 1 gece
    this.dark = 0;  // oynanış için karanlık düzeyi
  }

  addLight(src) { this.sources.push(src); return src; }

  sample(h) {
    h = ((h % 24) + 24) % 24;
    let a = KEYC[0], b = KEYC[1];
    for (let i = 0; i < KEYC.length - 1; i++) if (h >= KEYC[i].h && h <= KEYC[i + 1].h) { a = KEYC[i]; b = KEYC[i + 1]; break; }
    const t = smoothstep(0, 1, (h - a.h) / Math.max(0.001, b.h - a.h));
    const o = {};
    for (const f of ['top', 'hor', 'bot', 'sun', 'hemiS', 'hemiG', 'fog', 'sea', 'cloud']) o[f] = a[f].clone().lerp(b[f], t);
    o.sunI = lerp(a.sunI, b.sunI, t); o.hemiI = lerp(a.hemiI, b.hemiI, t);
    return o;
  }

  update(dt, hour, weather, area, focus, opts = {}) {
    const k = this.sample(hour);
    const p = this.p;
    const w = weather.cur;
    const fogT = weather.fogTotal;
    const desat = Math.max(w.clouds - 0.4, 0) * 0.6 + fogT * 0.35;

    // gece faktörü
    const hh = ((hour % 24) + 24) % 24;
    this.night = 1 - clamp(smoothstep(4.8, 6.8, hh) - smoothstep(18.2, 20.6, hh), 0, 1);

    p.skyTop.copy(k.top).lerp(tmp.copy(GRAY).multiplyScalar(lerp(1, 0.15, this.night)), desat);
    p.skyHorizon.copy(k.hor).lerp(tmp.copy(GRAY).multiplyScalar(lerp(1.15, 0.2, this.night)), desat);
    p.skyBottom.copy(k.bot);
    p.fogColor.copy(k.fog).lerp(tmp.copy(GRAY).multiplyScalar(lerp(1.1, 0.16, this.night)), Math.min(1, desat * 1.2));
    p.cloudColor.copy(k.cloud).lerp(tmp.copy(GRAY).multiplyScalar(lerp(1, 0.2, this.night)), desat);
    p.cloudOpacity = 0.35 + w.clouds * 0.6;
    p.skyFog = Math.min(1, fogT * 1.1 + w.rain * 0.3);
    p.stars = this.night * (1 - w.clouds * 0.85) * (1 - fogT);
    p.wind = w.wind;

    // Güneş yayı: sabah solda doğar, akşam sağda batar, denizin (arka) üzerinde
    const sunT = (hh - 6) / 12.5;
    const el = Math.sin(clamp(sunT, -0.1, 1.1) * Math.PI);
    p.sunDir.set(lerp(-0.85, 0.85, clamp(sunT, 0, 1)), el * 0.75 - 0.03, -0.6).normalize();
    const moonT = ((hh + 24 - 19) % 24) / 11;
    p.moonDir.set(lerp(-0.7, 0.7, clamp(moonT, 0, 1)), 0.22 + Math.sin(clamp(moonT, 0, 1) * Math.PI) * 0.4, -0.75).normalize();
    p.sunVisible = clamp(el * 4, 0, 1) * (1 - Math.max(w.clouds - 0.5, 0) * 1.6) * (1 - fogT);
    p.moonVisible = this.night * (1 - Math.max(w.clouds - 0.5, 0) * 1.4) * (1 - fogT * 0.9);
    p.sunGlowColor.copy(k.sun);
    p.sunGlow = clamp(el * 3, 0, 1) * (1 - desat) + this.night * 0.2 * p.moonVisible;
    p.seaColor.copy(k.sea).lerp(tmp.copy(GRAY).multiplyScalar(lerp(0.55, 0.1, this.night)), desat * 0.6);

    const darkMul = 1 - w.dark * 0.55;
    const flash = weather.flash;

    if (area.indoor) {
      const cave = area.id === 'magara';
      this.hemi.color.set(cave ? '#203040' : '#e8c8a0');
      this.hemi.groundColor.set(cave ? '#050608' : '#3a2a20');
      this.hemi.intensity = cave ? 0.05 : 0.55 + (1 - this.night) * 0.35;
      this.dir.intensity = cave ? 0 : 0.6 * (1 - this.night) + 0.1;
      this.dir.color.copy(k.sun);
      this.amb.intensity = cave ? 0.015 : 0.08;
      this.scene.fog.color.set(cave ? '#020304' : '#2a2018');
      this.scene.fog.density = cave ? 0.035 : 0.004;
      this.dark = cave ? 1 : 0.2;
    } else {
      this.hemi.color.copy(k.hemiS);
      this.hemi.groundColor.copy(k.hemiG);
      this.hemi.intensity = k.hemiI * darkMul + flash * 2.5;
      this.dir.color.copy(k.sun);
      this.dir.intensity = k.sunI * darkMul * (1 - fogT * 0.5) * (1 - w.clouds * 0.25);
      this.amb.intensity = 0.05 + flash * 1.5;
      this.scene.fog.color.copy(p.fogColor);
      const baseD = lerp(0.0035, 0.009, this.night);
      this.scene.fog.density = (baseD + fogT * 0.03 + w.rain * 0.006) * (opts.farView ? 0.45 : 1);
      this.dark = clamp(this.night * 0.85 + w.dark * 0.25 + fogT * 0.1, 0, 1);
    }

    // Yönlü ışık konumu: güneş/ay hangisi aktifse, önden-yukarıdan
    const lx = this.night > 0.5 ? p.moonDir.x : p.sunDir.x;
    const ly = Math.max(0.35, this.night > 0.5 ? p.moonDir.y + 0.3 : p.sunDir.y + 0.15);
    // Gece ay ışığı arkadan gelir: denizde parıltı, karakterlerde kenar ışığı
    this.dir.position.set(focus.x + lx * 40, focus.y + ly * 50, focus.z + lerp(30, -26, this.night));
    this.dir.target.position.copy(focus);
    this.fill.position.set(focus.x + 4, focus.y + 8, focus.z + 30);
    this.fill.target.position.copy(focus);
    this.fill.intensity = area.indoor ? 0 : 0.18 + this.night * 0.32;

    this.renderer.toneMappingExposure = lerp(1.0, 1.25, this.night);

    // Pencere ve sokak lambaları
    const winOn = area.indoor && area.id !== 'magara' ? 0.6 : 1;
    WINDOW_MATS[0].emissiveIntensity = smoothstep(0.25, 0.6, this.night) * 1.6 * winOn;
    WINDOW_MATS[1].emissiveIntensity = smoothstep(0.35, 0.7, this.night) * 1.4 * winOn * (hh > 1 && hh < 5 ? 0.2 : 1);
    WINDOW_MATS[2].emissiveIntensity = smoothstep(0.45, 0.8, this.night) * 1.7 * winOn * (hh > 23 || hh < 5 ? 0.3 : 1);
    LAMP_MAT.emissiveIntensity = smoothstep(0.35, 0.6, this.night) * 3.2;

    this.updatePool(focus, area, hh);
  }

  updatePool(focus, area, hh) {
    const cands = [];
    for (const s of this.sources) {
      if (s.area !== area.id) continue;
      const on = typeof s.on === 'function' ? s.on(this.night, hh) : (s.on === 'night' ? this.night > 0.35 : true);
      if (!on) continue;
      const d = Math.abs(s.pos.x - focus.x) + Math.abs(s.pos.y - focus.y) * 0.5;
      if (d > 40) continue;
      cands.push([d, s]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i], c = cands[i];
      if (c) {
        const s = c[1];
        l.position.copy(s.pos);
        l.color.set(s.color ?? '#ffb060');
        const fade = 1 - smoothstep(28, 40, c[0]);
        const flick = s.flicker ? (0.88 + Math.random() * 0.12) : 1;
        l.intensity = (typeof s.intensity === 'function' ? s.intensity(this.night) : (s.intensity ?? 8)) * fade * flick;
        l.distance = s.distance ?? 12;
      } else l.intensity = 0;
    }
  }
}
