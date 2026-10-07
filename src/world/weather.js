import * as THREE from 'three';
import { damp, randRange } from '../core/utils.js';

export const WEATHER = {
  acik: { name: 'Açık', icon: '☀️', rain: 0, fog: 0, wind: 0.2, clouds: 0.35, dark: 0, waves: 1 },
  bulutlu: { name: 'Bulutlu', icon: '☁️', rain: 0, fog: 0.15, wind: 0.4, clouds: 0.9, dark: 0.15, waves: 1.2 },
  yagmur: { name: 'Yağmurlu', icon: '🌧️', rain: 0.65, fog: 0.3, wind: 0.55, clouds: 1, dark: 0.35, waves: 1.5 },
  sis: { name: 'Sisli', icon: '🌫️', rain: 0, fog: 0.85, wind: 0.1, clouds: 0.6, dark: 0.2, waves: 0.7 },
  firtina: { name: 'Fırtına', icon: '⛈️', rain: 1, fog: 0.4, wind: 1, clouds: 1, dark: 0.55, waves: 2.6 },
};

function fogTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 40; i++) {
    const px = 30 + Math.random() * 196, py = 45 + Math.random() * 40, r = 20 + Math.random() * 36;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  }
  // kenarları yumuşakça sıfıra indir (sert dikdörtgen görünmesin)
  x.globalCompositeOperation = 'destination-in';
  const h = x.createLinearGradient(0, 0, 256, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.25, 'rgba(0,0,0,1)'); h.addColorStop(0.75, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = h; x.fillRect(0, 0, 256, 128);
  const v = x.createLinearGradient(0, 0, 0, 128);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.35, 'rgba(0,0,0,1)'); v.addColorStop(0.7, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = v; x.fillRect(0, 0, 256, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export class Weather {
  constructor(scene) {
    this.cur = { rain: 0, fog: 0, wind: 0.2, clouds: 0.3, dark: 0, waves: 1 };
    this.target = { ...WEATHER.acik };
    this.extraFog = 0; // gece olayı sisi
    this.flash = 0;
    this.nextLightning = 8;
    this.type = 'acik';

    // Yağmur
    this.N = 2600;
    this.drops = new Float32Array(this.N * 3);
    this.vel = new Float32Array(this.N);
    const lp = new Float32Array(this.N * 6);
    for (let i = 0; i < this.N; i++) {
      this.drops[i * 3] = randRange(-30, 30); this.drops[i * 3 + 1] = randRange(-2, 24); this.drops[i * 3 + 2] = randRange(-14, 10);
      this.vel[i] = randRange(22, 30);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    this.rainMat = new THREE.LineBasicMaterial({ color: '#a8b8c8', transparent: true, opacity: 0, depthWrite: false });
    this.rain = new THREE.LineSegments(g, this.rainMat);
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    // Sis kartları
    this.fogCards = [];
    const tex = fogTexture();
    for (let i = 0; i < 16; i++) {
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: '#c8d0d8', fog: false });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), m);
      p.position.set(randRange(-60, 60), randRange(0, 4), -3.5 - (i % 8) * 5 - (i > 7 ? 2.5 : 0));
      p.userData.speed = randRange(0.5, 1.5);
      p.renderOrder = 5;
      this.fogCards.push(p);
      scene.add(p);
    }
  }

  set(type) {
    this.type = type;
    this.target = { ...WEATHER[type] };
  }

  get fogTotal() { return Math.min(1, this.cur.fog + this.extraFog); }

  update(dt, center, ground, indoor, audio, fogColor, nightF) {
    for (const k of ['rain', 'fog', 'wind', 'clouds', 'dark', 'waves']) this.cur[k] = damp(this.cur[k], this.target[k], 0.4, dt);
    const rainA = indoor ? 0 : this.cur.rain;

    // Yağmur damlaları
    this.rainMat.opacity = rainA * 0.55;
    this.rain.visible = rainA > 0.01;
    if (this.rain.visible) {
      const lp = this.rain.geometry.attributes.position.array;
      const wind = this.cur.wind * 9;
      const active = Math.floor(this.N * Math.min(1, rainA * 1.2));
      for (let i = 0; i < this.N; i++) {
        let x = this.drops[i * 3], y = this.drops[i * 3 + 1], z = this.drops[i * 3 + 2];
        const v = this.vel[i];
        y -= v * dt; x += wind * dt;
        if (y < ground - 1 || x - center.x > 32 || x - center.x < -32) {
          y = randRange(18, 26) + center.y; x = center.x + randRange(-30, 30); z = randRange(-14, 10);
        }
        this.drops[i * 3] = x; this.drops[i * 3 + 1] = y; this.drops[i * 3 + 2] = z;
        const k = i * 6;
        if (i < active) {
          lp[k] = x; lp[k + 1] = y; lp[k + 2] = z;
          lp[k + 3] = x - wind * 0.035; lp[k + 4] = y + v * 0.035; lp[k + 5] = z;
        } else { lp[k] = lp[k + 3] = 0; lp[k + 1] = lp[k + 4] = -999; lp[k + 2] = lp[k + 5] = 0; }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // Sis kartları
    const fogA = indoor ? 0 : this.fogTotal;
    for (const c of this.fogCards) {
      c.material.opacity = fogA * 0.55;
      c.material.color.copy(fogColor);
      c.visible = fogA > 0.02;
      c.position.x += c.userData.speed * dt * (0.5 + this.cur.wind * 3);
      if (c.position.x - center.x > 70) c.position.x -= 140;
      if (c.position.x - center.x < -70) c.position.x += 140;
      c.position.y = center.y - 1 + Math.sin(c.position.x * 0.05) * 0.8;
    }

    // Şimşek
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.type === 'firtina' && !indoor) {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.nextLightning = randRange(6, 18);
        this.flash = 1;
        setTimeout(() => audio.thunder(), randRange(300, 1500));
      }
    }

    audio.setAmbient({ rain: rainA, wind: indoor ? this.cur.wind * 0.3 : 0.15 + this.cur.wind * 0.85 });
  }
}
