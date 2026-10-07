// Oyuncu ayarları (grafik, ses, oyun). Kayıttan bağımsız olarak saklanır.
const KEY = 'sonfener_settings_v1';

export const PRESETS = {
  dusuk: { resScale: 0.6, shadows: 'kapali', bloom: false, grain: false },
  orta: { resScale: 0.8, shadows: 'dusuk', bloom: true, grain: true },
  yuksek: { resScale: 1, shadows: 'yuksek', bloom: true, grain: true },
  ultra: { resScale: 1.25, shadows: 'ultra', bloom: true, grain: true },
};

export const DEFAULTS = {
  quality: 'yuksek', resScale: 1, shadows: 'yuksek', bloom: true, grain: true, shake: true, fps: false,
  master: 80, music: 60, sfx: 80, ambient: 80,
  dayLength: 'normal',
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

export const Settings = {
  data: { ...DEFAULTS, ...load() },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* yoksay */ } },
  set(key, value) {
    this.data[key] = value;
    if (key === 'quality' && PRESETS[value]) Object.assign(this.data, PRESETS[value]);
    else if (['resScale', 'shadows', 'bloom', 'grain'].includes(key)) this.data.quality = 'ozel';
    this.save();
  },
  reset() { this.data = { ...DEFAULTS }; this.save(); },
  // oyun dakikası başına gerçek saniye
  secPerMin() { return { kisa: 0.4, normal: 0.6, uzun: 0.9 }[this.data.dayLength] ?? 0.6; },
};
