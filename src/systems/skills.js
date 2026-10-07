import { G } from '../game.js';

export const SKILL_INFO = {
  balikcilik: { name: 'Balıkçılık', icon: '🎣', perks: { 3: 'Balık vurma süresi uzar.', 5: 'Daha kolay balık yakalama: gerilim daha yavaş artar, çekişler önceden sezilir.', 8: 'Nadir balık şansı artar.', 10: 'Usta balıkçı: misina neredeyse kopmaz.' } },
  kesif: { name: 'Keşif', icon: '🧭', perks: { 3: 'Biraz daha hızlı yürürsün.', 5: 'Haritada gizli noktaları görürsün.', 8: 'Toplarken ekstra kaynak şansı.', 10: 'Kaşif: gizli noktalar daha sık yenilenir.' } },
  crafting: { name: 'Üretim', icon: '🔨', perks: { 2: 'İşaret fişeği tarifi.', 3: 'Gelişmiş olta tarifi.', 4: 'Dalış takımı tarifi.', 5: 'Tarifler %20 daha az kaynak kullanır.', 7: 'Usta olta tarifi.', 10: 'Bazen çift ürün çıkar.' } },
  dalis: { name: 'Dalış', icon: '🤿', perks: { 3: 'Nefesin uzar.', 5: 'Dip ganimetleri daha değerli.', 10: 'Batıktaki sırrı bulabilirsin.' } },
  fener: { name: 'Fener Bakımı', icon: '🔆', perks: { 3: 'Fener arızası daha seyrek.', 5: 'Fener %50 daha uzun süre yanar.', 8: 'Işık hüzmesi genişler.', 10: 'Fener ustası: ödeme +%25.' } },
};

// Seviye N için gereken toplam deneyim
const TABLE = [0, 0, 40, 100, 190, 310, 470, 680, 950, 1300, 1750];

export const Skills = {
  level(id) {
    const xp = G.state.skills[id] ?? 0;
    let lv = 1;
    for (let i = 2; i <= 10; i++) if (xp >= TABLE[i]) lv = i;
    return lv;
  },
  progress(id) {
    const lv = this.level(id), xp = G.state.skills[id] ?? 0;
    if (lv >= 10) return { lv, cur: 1, need: 1, frac: 1 };
    const a = TABLE[lv], b = TABLE[lv + 1];
    return { lv, cur: xp - a, need: b - a, frac: (xp - a) / (b - a) };
  },
  add(id, n) {
    if (!n) return;
    const before = this.level(id);
    G.state.skills[id] = (G.state.skills[id] ?? 0) + n;
    const after = this.level(id);
    if (after > before) {
      const info = SKILL_INFO[id];
      const perk = info.perks[after];
      G.ui.toast(`${info.icon} ${info.name} seviye ${after}!${perk ? ' — ' + perk : ''}`, 'level', 5);
      G.audio.levelUp();
    }
  },
  all() {
    const o = {};
    for (const k of Object.keys(SKILL_INFO)) o[k] = this.level(k);
    return o;
  },
};
