// Gün döngüsü: saat, saat başı olaylar, uyku, bayılma, sabah raporu
import { G, timeRuns } from '../game.js';
import { saveGame } from '../core/state.js';
import { weightedPick, WEEKDAYS, chance } from '../core/utils.js';
import { WEATHER } from '../world/weather.js';
import { respawnNodes } from '../entities/nodes.js';

export const SEC_PER_MIN = 0.6; // gerçek saniye / oyun dakikası
export const DAY_END = 20 * 60; // 02:00

function rollWeather(day) {
  if (day <= 2) return day === 1 ? 'acik' : 'bulutlu';
  return weightedPick([['acik', 40], ['bulutlu', 22], ['yagmur', 18], ['sis', 12], ['firtina', 8]]);
}

export const Day = {
  lastHour: null,
  acc: 0,

  weekday() { return WEEKDAYS[(G.state.day - 1) % 7]; },
  phase() {
    const h = G.hour;
    if (h < 12) return 'Sabah';
    if (h < 18) return 'Öğlen';
    if (h < 22) return 'Akşam';
    return 'Gece';
  },

  // dakika ilerlet (dalış vb.)
  advance(min) {
    G.state.time = Math.min(DAY_END, G.state.time + min);
    G.lamp.tick(min);
  },

  update(dt) {
    if (!timeRuns()) return;
    const S = G.state;
    this.acc += dt * G.timeScale / SEC_PER_MIN;
    if (this.acc >= 1) {
      const m = Math.floor(this.acc);
      this.acc -= m;
      S.time += m;
      G.lamp.tick(m);
    }
    const h = Math.floor(G.hour);
    if (h !== this.lastHour) { this.onHour(h); this.lastHour = h; }
    if (S.time >= DAY_END) this.passOut();
  },

  onHour(h) {
    const S = G.state;
    if ((h === 6 || h === 12 || h === 18) && G.area.id === 'world') setTimeout(() => G.audio.bell(), 200);
    if (h === 21) G.night.roll();
    if (h === 22) G.night.begin();
    if (h === 24 && S.lighthouse.lit === false && S.flags.lampRepaired && G.area.id === 'world' && G.player.x > 40) G.ui.ambientLine('Fener karanlık. Deniz de öyle.');
    if (h === 20 && !S.lighthouse.lit && S.flags.lampRepaired && S.lighthouse.fuel > 0) G.ui.toast('🔆 Hava karardı. Feneri yakmayı unutma.', 'lamp', 4);
    if (h === 23 && G.area.id === 'world' && !G.player.lanternOn && G.inv.has('el_feneri') && G.env.night > 0.8) G.ui.toast('İpucu: [L] ile el fenerini yakabilirsin.', 'info');
  },

  sleep() {
    if (G.hour < 18 && G.state.day > 0) {
      G.ui.confirm('Daha erken. Yine de uyumak istiyor musun?', () => this.endDay('sleep'));
      return;
    }
    this.endDay('sleep');
  },

  passOut() {
    if (G.mode === 'cutscene') return;
    this.endDay('passout');
  },

  endDay(kind) {
    const S = G.state;
    G.mode = 'cutscene';
    if (G.fishing.state !== 'idle') G.fishing.stop();
    G.ui.closeAll();
    const report = [];
    // fener ödemesi
    const L = S.lighthouse;
    const lightMin = Math.min(240, L.nightLit ?? 0);
    const cov = lightMin / 240;
    let pay = 0;
    if (S.flags.lampRepaired) {
      if (L.lit && S.time < DAY_END) {
        // erken uyunduysa kalan gece için yakıtı say
        const remain = Math.min(240 - lightMin, Math.max(0, L.fuel * 60), DAY_END - Math.max(S.time, 16 * 60));
        L.nightLit = lightMin + Math.max(0, remain);
      }
      const coverage = Math.min(1, (L.nightLit ?? 0) / 240);
      const base = 40 + 15 * (L.level - 1);
      pay = Math.round(coverage * base * (1 + (S.payBonus ?? 0)) * (G.skills.level('fener') >= 10 ? 1.25 : 1));
      if (coverage >= 0.75) {
        S.stats.nightsLit = (S.stats.nightsLit ?? 0) + 1;
        S.stats.litStreak = (S.stats.litStreak ?? 0) + 1;
        G.skills.add('fener', 20);
        report.push(`🔆 Fener gece boyunca yandı (%${Math.round(coverage * 100)}). Gemiler güvenle geçti.`);
      } else if (coverage > 0) {
        S.stats.litStreak = 0;
        report.push(`🔅 Fener gecenin yalnızca %${Math.round(coverage * 100)}'inde yandı.`);
      } else {
        S.stats.litStreak = 0;
        report.push('⚫ Fener bu gece yanmadı.');
      }
      if (coverage < 0.4 && chance(0.5)) {
        report.push('⚓ Gece bir balıkçı teknesi kayalara çarptı. Mürettebat kurtuldu ama kasaba tedirgin. Sahile enkaz vurdu.');
        for (const id of Object.keys(S.npcs)) G.rel.addPts(id, -8);
        for (const n of G.nodes) if (n.type === 'wreckage' || n.type === 'driftwood') S.nodes[n.id] = 0;
      }
      if (pay > 0) report.push(`💰 Liman ödemesi: +${pay} altın`);
    }
    S.money += pay;
    // ağ
    if (S.net && !S.netCatch) {
      const n1 = 1 + Math.floor(Math.random() * 3), n2 = Math.floor(Math.random() * 3);
      S.netCatch = [['yengec', n1], ['sardalya', n2], ['yosun', Math.random() < 0.4 ? 1 : 0]].filter(x => x[1] > 0);
    }
    if (kind === 'passout') {
      const lost = Math.min(S.money, Math.round(S.money * 0.1));
      S.money -= lost;
      report.unshift(`Saat 02:00'de yorgunluktan bayıldın. Biri seni bulup fenere taşıdı.${lost ? ` (${lost} altın kayıp)` : ''}`);
    }
    // gece kayıtları
    const seen = S.nightLog.filter(l => l.day === S.day).map(l => '🌙 ' + l.text);
    report.push(...seen);

    // yeni gün
    S.day += 1;
    S.time = 0;
    S.weather = S.tomorrowWeather ?? rollWeather(S.day);
    S.tomorrowWeather = rollWeather(S.day + 1);
    L.lit = false; L.nightLit = 0;
    S.flags.sawKeeperTonight = false;
    G.night.morning();
    for (const npc of G.npcs) if (npc.wasMissing && npc.missingDay < S.day) npc.wasMissing = false;
    respawnNodes();
    if (S.selinSoon && !S.selinArrived && S.day >= 4) {
      S.selinArrived = true; S.selinSoon = false;
      report.push('🏠 Kasabaya yeni biri taşındı: Deniz biyoloğu Selin, sahildeki eski kulübeye yerleşti.');
    }
    if (S.netCatch) report.push('🕸️ Ağında bir şeyler var. İskeleye uğra.');
    G.weather.set(S.weather);
    report.push(`${WEATHER[S.weather].icon} Bugün hava: ${WEATHER[S.weather].name}.`);

    G.ui.dayReport(S.day, this.weekday(), report, () => {
      // fenerde uyan
      G.setArea('fener_ic', 3000 + 1.4, 0);
      for (const npc of G.npcs) npc.teleport(6);
      this.lastHour = 6;
      saveGame(S);
      G.mode = 'play';
      G.ui.toast('💾 Oyun kaydedildi.', 'info', 2);
    });
  },
};
