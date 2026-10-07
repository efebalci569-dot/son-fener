// Tamamen prosedürel ses motoru (WebAudio). Hiçbir ses dosyası kullanılmaz.
import { randRange, pick, chance } from './utils.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.musicOn = true;
    this.musicTimer = 0;
    this.droneOn = false;
    this.target = { waves: 0.5, wind: 0.2, rain: 0, indoor: 0, night: 0, cave: 0 };
    this.t = 0;
    this.vol = { master: 80, music: 60, sfx: 80, ambient: 80 };
  }

  // 0–100 arası ses düzeyleri
  setVolumes(v) {
    Object.assign(this.vol, v);
    if (!this.ctx) return;
    const now = this.ctx.currentTime, k = x => Math.pow(x / 100, 1.6);
    this.master.gain.setTargetAtTime(k(this.vol.master), now, 0.05);
    this.sfx.gain.setTargetAtTime(k(this.vol.sfx) * 1.25, now, 0.05);
    this.musicBus.gain.setTargetAtTime(k(this.vol.music) * 0.37, now, 0.05);
    this.ambBus.gain.setTargetAtTime(k(this.vol.ambient) * 1.25, now, 0.05);
  }

  // Sandal motoru (sürekli ses, hıza göre)
  engine(speed, on) {
    if (!this.enabled) return;
    const ctx = this.ctx, now = ctx.currentTime;
    if (!this.eng) {
      const g = ctx.createGain(); g.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 42;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 21;
      const o2g = ctx.createGain(); o2g.gain.value = 0.35;
      o1.connect(f); o2.connect(o2g).connect(f); f.connect(g).connect(this.sfx);
      o1.start(); o2.start();
      this.eng = { g, f, o1, o2 };
    }
    const s = Math.min(1, Math.abs(speed) / 7);
    this.eng.g.gain.setTargetAtTime(on ? 0.05 + s * 0.09 : 0, now, 0.15);
    this.eng.o1.frequency.setTargetAtTime(38 + s * 34, now, 0.2);
    this.eng.o2.frequency.setTargetAtTime(19 + s * 17, now, 0.2);
    this.eng.f.frequency.setTargetAtTime(300 + s * 500, now, 0.2);
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.enabled = true;

    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);

    // Gürültü tamponları
    this.white = this._noiseBuffer('white');
    this.brown = this._noiseBuffer('brown');
    this.pink = this._noiseBuffer('pink');

    // Yankı
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.5, 2.2);
    this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.55;
    this.reverb.connect(this.reverbGain).connect(this.master);

    // Ortam veriyolu (iç mekânda alçak geçiren filtre)
    this.ambBus = ctx.createGain();
    this.ambFilter = ctx.createBiquadFilter(); this.ambFilter.type = 'lowpass'; this.ambFilter.frequency.value = 18000;
    this.ambBus.connect(this.ambFilter).connect(this.master);

    // Dalgalar
    this.waves = this._loop(this.brown, 'lowpass', 520, 0.6);
    this.waves2 = this._loop(this.pink, 'bandpass', 900, 0.5);
    // Rüzgâr
    this.wind = this._loop(this.white, 'bandpass', 600, 2.2);
    // Yağmur
    this.rain = this._loop(this.white, 'highpass', 1400, 0.5);

    // Müzik veriyolu
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.22;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);

    // Gece dronu
    this.drone = ctx.createGain(); this.drone.gain.value = 0;
    const d1 = ctx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 55;
    const d2 = ctx.createOscillator(); d2.type = 'sine'; d2.frequency.value = 82.6;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 300;
    d1.connect(dl); d2.connect(dl); dl.connect(this.drone).connect(this.musicBus);
    d1.start(); d2.start();
    this.setVolumes({});
  }

  _noiseBuffer(type) {
    const ctx = this.ctx, len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.9; }
    }
    return buf;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx, len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _loop(buffer, ftype, freq, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    src.playbackRate.value = randRange(0.9, 1.1);
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(this.ambBus);
    src.start(0, Math.random() * 2);
    return { src, f, g };
  }

  setAmbient(params) { Object.assign(this.target, params); }

  update(dt) {
    if (!this.enabled) return;
    this.t += dt;
    const now = this.ctx.currentTime, T = this.target;
    const swell = 0.65 + 0.35 * Math.sin(this.t * 0.45) * Math.sin(this.t * 0.17 + 1);
    this.waves.g.gain.setTargetAtTime(T.waves * 0.55 * swell, now, 0.3);
    this.waves2.g.gain.setTargetAtTime(T.waves * 0.12 * (1.2 - swell), now, 0.3);
    this.wind.f.frequency.setTargetAtTime(380 + 420 * (0.5 + 0.5 * Math.sin(this.t * 0.3)) + T.wind * 300, now, 0.5);
    this.wind.g.gain.setTargetAtTime(T.wind * 0.22, now, 0.6);
    this.rain.g.gain.setTargetAtTime(T.rain * 0.16, now, 0.5);
    this.ambFilter.frequency.setTargetAtTime(T.indoor ? 700 : 18000, now, 0.25);
    this.drone.gain.setTargetAtTime(this.musicOn ? (T.night * 0.06 + T.cave * 0.08) : 0, now, 2);

    // Üretken müzik
    if (this.musicOn) {
      this.musicTimer -= dt;
      if (this.musicTimer <= 0) {
        const night = T.night > 0.5 || T.cave;
        this.musicTimer = night ? randRange(2.2, 4.5) : randRange(1.1, 2.4);
        if (chance(night ? 0.55 : 0.7)) this._note(night);
      }
    }
  }

  _note(night) {
    const day = [220, 246.9, 277.2, 329.6, 370, 440, 493.9, 554.4, 659.3];
    const nightScale = [146.8, 174.6, 220, 261.6, 293.7, 329.6, 349.2];
    const f = pick(night ? nightScale : day);
    this.tone(f, { type: night ? 'sine' : 'triangle', attack: night ? 0.4 : 0.01, decay: night ? 3.5 : 1.6, gain: night ? 0.16 : 0.12, bus: this.musicBus });
    if (!night && chance(0.25)) setTimeout(() => this.tone(f * 1.5, { type: 'sine', attack: 0.01, decay: 1.2, gain: 0.06, bus: this.musicBus }), 180);
  }

  tone(freq, { type = 'sine', attack = 0.01, decay = 0.5, gain = 0.2, bus = null, glide = null, pan = 0, delay = 0 } = {}) {
    if (!this.enabled) return;
    const ctx = this.ctx, t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + attack + decay * 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    o.connect(g).connect(p).connect(bus ?? this.sfx);
    o.start(t0); o.stop(t0 + attack + decay + 0.05);
    return g;
  }

  noise({ buffer = 'white', type = 'bandpass', freq = 1000, q = 1, attack = 0.01, decay = 0.3, gain = 0.3, pan = 0, reverb = 0, delay = 0, rate = 1 } = {}) {
    if (!this.enabled) return;
    const ctx = this.ctx, t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = this[buffer]; src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(f).connect(g).connect(p);
    p.connect(this.sfx);
    if (reverb) { const rg = ctx.createGain(); rg.gain.value = reverb; p.connect(rg).connect(this.reverb); }
    src.start(t0, Math.random() * 2); src.stop(t0 + attack + decay + 0.1);
    return { f, g };
  }

  // --- Ses efektleri ---
  pickup() { this.tone(660, { type: 'triangle', decay: 0.12, gain: 0.12 }); this.tone(990, { type: 'triangle', decay: 0.2, gain: 0.1, delay: 0.07 }); }
  click() { this.tone(520, { type: 'square', decay: 0.04, gain: 0.03 }); }
  blip() { this.tone(880 + Math.random() * 120, { type: 'square', decay: 0.03, gain: 0.015 }); }
  success() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, { type: 'triangle', decay: 0.4, gain: 0.1, delay: i * 0.09 })); }
  fail() { this.tone(220, { type: 'sawtooth', decay: 0.35, gain: 0.06, glide: 140 }); }
  clue() { [392, 466, 587, 698].forEach((f, i) => this.tone(f, { type: 'sine', attack: 0.05, decay: 1.6, gain: 0.1, delay: i * 0.18, bus: this.reverb })); }
  heart() { this.tone(784, { type: 'sine', decay: 0.25, gain: 0.1 }); this.tone(1047, { type: 'sine', decay: 0.4, gain: 0.1, delay: 0.12 }); }
  levelUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, { type: 'triangle', decay: 0.5, gain: 0.09, delay: i * 0.07 })); }

  footstep(surface) {
    const cfg = {
      wood: { type: 'bandpass', freq: 380, q: 2.5, gain: 0.12, decay: 0.09 },
      stone: { type: 'highpass', freq: 1800, q: 0.7, gain: 0.05, decay: 0.05 },
      sand: { type: 'lowpass', freq: 900, q: 0.5, gain: 0.06, decay: 0.12 },
      grass: { type: 'bandpass', freq: 2200, q: 0.6, gain: 0.04, decay: 0.08 },
      rock: { type: 'bandpass', freq: 800, q: 1.5, gain: 0.07, decay: 0.06 },
    }[surface] ?? { type: 'lowpass', freq: 900, q: 0.5, gain: 0.05, decay: 0.08 };
    this.noise({ ...cfg, attack: 0.005, pan: randRange(-0.1, 0.1) });
  }

  splash(big = false) { this.noise({ buffer: 'white', type: 'bandpass', freq: big ? 700 : 1400, q: 0.8, attack: 0.01, decay: big ? 0.8 : 0.35, gain: big ? 0.3 : 0.18 }); }
  reel() { this.noise({ type: 'highpass', freq: 3500, q: 1, attack: 0.002, decay: 0.03, gain: 0.04 }); }
  snap() { this.tone(1800, { type: 'square', decay: 0.08, gain: 0.08, glide: 400 }); this.noise({ type: 'highpass', freq: 2500, decay: 0.15, gain: 0.15 }); }
  chop() { this.noise({ buffer: 'brown', type: 'bandpass', freq: 300, q: 3, attack: 0.002, decay: 0.15, gain: 0.5 }); this.tone(180, { type: 'triangle', decay: 0.1, gain: 0.08 }); }
  mine() { this.tone(1400 + Math.random() * 300, { type: 'triangle', decay: 0.25, gain: 0.08 }); this.noise({ type: 'highpass', freq: 3000, decay: 0.08, gain: 0.12 }); }
  craft() { [0, 0.12, 0.24].forEach(d => this.noise({ type: 'bandpass', freq: 2000, q: 4, decay: 0.06, gain: 0.15, delay: d })); setTimeout(() => this.success(), 350); }

  gull(pan = 0) {
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = randRange(1500, 2100);
      this.tone(f, { type: 'sawtooth', attack: 0.02, decay: 0.22, gain: 0.018, glide: f * 0.62, pan, delay: i * 0.28 });
      this.tone(f * 0.5, { type: 'triangle', attack: 0.02, decay: 0.2, gain: 0.02, glide: f * 0.31, pan, delay: i * 0.28 });
    }
  }

  horn(pan = 0) {
    if (!this.enabled) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.6);
    g.gain.setValueAtTime(0.18, t0 + 2.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    for (const fr of [58, 58.6, 87.3]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
      o.connect(f); o.start(t0); o.stop(t0 + 5.1);
    }
    f.connect(g).connect(p);
    p.connect(this.reverb);
    const dry = ctx.createGain(); dry.gain.value = 0.25; p.connect(dry).connect(this.sfx);
  }

  bell() {
    const base = 196;
    [1, 2.0, 2.4, 3.0, 4.2, 5.4].forEach((m, i) => this.tone(base * m, { type: 'sine', attack: 0.005, decay: 4 - i * 0.5, gain: 0.07 / (i + 1), bus: this.reverb }));
    [1, 2.4].forEach((m) => this.tone(base * m, { type: 'sine', attack: 0.005, decay: 2.5, gain: 0.04 }));
  }

  whisper(pan = 0) {
    for (let i = 0; i < 5; i++) {
      this.noise({ buffer: 'white', type: 'bandpass', freq: randRange(2600, 4200), q: 2.5, attack: randRange(0.1, 0.3), decay: randRange(0.3, 0.7), gain: randRange(0.05, 0.1), pan, reverb: 0.6, delay: i * randRange(0.18, 0.32) });
    }
  }

  thunder() {
    this.noise({ buffer: 'brown', type: 'lowpass', freq: 180, q: 0.5, attack: 0.05, decay: 3.5, gain: 0.9, reverb: 0.5, rate: 0.6 });
    this.noise({ buffer: 'white', type: 'lowpass', freq: 600, q: 0.5, attack: 0.01, decay: 0.6, gain: 0.25 });
  }

  rumble() {
    this.tone(32, { type: 'sine', attack: 1.2, decay: 4, gain: 0.35 });
    this.tone(41, { type: 'sine', attack: 1.5, decay: 3.5, gain: 0.2 });
    this.noise({ buffer: 'brown', type: 'lowpass', freq: 120, attack: 1, decay: 4, gain: 0.4 });
  }

  knock() {
    [0, 0.45, 0.9].forEach(d => {
      this.tone(95, { type: 'sine', attack: 0.003, decay: 0.18, gain: 0.35, delay: d });
      this.noise({ buffer: 'brown', type: 'lowpass', freq: 400, attack: 0.003, decay: 0.1, gain: 0.3, delay: d });
    });
  }

  ignite() {
    this.noise({ buffer: 'white', type: 'bandpass', freq: 600, q: 0.6, attack: 0.3, decay: 1.2, gain: 0.2 });
    this.tone(110, { type: 'sine', attack: 0.5, decay: 2.5, gain: 0.12, glide: 220 });
  }

  radio() {
    this.noise({ buffer: 'white', type: 'bandpass', freq: 1800, q: 0.4, attack: 0.05, decay: 2.5, gain: 0.08 });
    [440, 415, 392].forEach((f, i) => this.tone(f, { type: 'sine', attack: 0.4, decay: 1.4, gain: 0.025, delay: 1 + i * 0.7, bus: this.reverb }));
  }

  sting() {
    // Gerilim vurgusu
    this.tone(70, { type: 'sawtooth', attack: 0.01, decay: 1.8, gain: 0.08 });
    this.tone(74, { type: 'sawtooth', attack: 0.01, decay: 1.8, gain: 0.08 });
    this.tone(1244, { type: 'sine', attack: 0.3, decay: 2.5, gain: 0.03, bus: this.reverb });
  }

  flare() { this.noise({ type: 'bandpass', freq: 900, q: 0.4, attack: 0.02, decay: 1.5, gain: 0.25 }); }
}

export const Audio = new AudioEngine();
