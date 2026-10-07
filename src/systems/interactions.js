// Etkileşim noktaları ve [E] tuşu
import { G, canAct } from '../game.js';
import { Input } from '../core/input.js';
import { CAVE_X, SEA_X, caveGround } from '../world/interiors.js';
import { LIGHTHOUSE_X } from '../world/world.js';
import { SANDAL_DOCK } from '../world/terrain.js';
import { startDive } from './fishing.js';
import { Rel } from './relations.js';
import { WEATHER } from '../world/weather.js';
import { NIGHT_EVENTS } from './night.js';
import { itemName } from '../data/items.js';

const list = [];
const add = (o) => { list.push({ range: 1.3, area: 'world', ...o }); };

function needItems(cost) {
  return Object.entries(cost).every(([it, n]) => G.inv.has(it, n));
}

function fishSpot(x, zone, opts = {}) {
  add({ x, area: opts.area ?? 'world', label: () => G.inv.rodTier() ? '🎣 Balık tut' : '🎣 Balık tut (olta yok)', action: () => G.fishing.start({ zone, dirZ: -1, minDist: opts.minDist ?? 4, maxDist: opts.maxDist ?? 12, minTier: opts.minTier, water: opts.water, face: opts.face }), range: 1.2 });
}

export function buildInteractions() {
  const S = () => G.state;
  // ---------------- DÜNYA ----------------
  add({
    x: LIGHTHOUSE_X, label: () => G.inv.has('fener_anahtari') ? '🚪 Fenere gir' : '🚪 Fener (kilitli)',
    action: () => {
      if (!G.inv.has('fener_anahtari')) { G.ui.toast('Kapı kilitli. Anahtar belediyede olmalı.', 'warn'); return; }
      const e = G.areas.fener_ic.entrance();
      G.setArea('fener_ic', e.x, 0, e.z);
      G.player.rig.faceYaw = Math.PI / 2;
      S().flags.enteredLighthouse = true;
      G.quests.check();
    },
  });
  add({ x: -35.4, label: '📜 Anma tahtasını oku', action: () => G.ui.dialog({ speaker: null, lines: ['"DENİZDE KAYBOLANLARIN ANISINA"', '1927 — Aurelia mürettebatı (31 kişi)', '1947 — Balıkçı Tom Erling', '1967 — Kaptan Rudi Hale', '1987 — Jonas Varga · Bekçi Aron Lind', 'Hepsi Kasım ayında. Yirmi yılda bir.'], onEnd: () => G.mystery.addClue('c08') }) });
  add({
    x: -118, label: () => G.inv.has('el_feneri') ? '🕳️ Mağaraya gir' : '🕳️ Mağara (zifiri karanlık)',
    action: () => {
      if (!G.inv.has('el_feneri')) { G.ui.toast('İçerisi zifiri karanlık. Bir el feneri olmadan giremezsin.', 'warn'); return; }
      G.player.lanternOn = true;
      G.setArea('magara', CAVE_X + 1.6);
      S().flags.enteredCave = true; G.quests.check();
    },
  });
  add({
    x: -69.6, enabled: () => !S().flags.forestOpen, label: () => G.inv.has('balta') ? '🪓 Devrilmiş ağacı kes' : '🌲 Devrilmiş ağaç (balta gerekli)', range: 1.6,
    action: () => {
      if (!G.inv.has('balta')) { G.ui.toast('Yol devrilmiş bir ağaçla kapalı. Bir balta gerekli.', 'warn'); return; }
      G.player.doAction(1.6); [0, 400, 800, 1200].forEach(d => setTimeout(() => G.audio.chop(), d));
      setTimeout(() => { S().flags.forestOpen = true; G.world.gates.forest.visible = false; G.inv.add('odun', 6); G.skills.add('kesif', 15); G.quests.check(); G.ui.toast('Orman yolu açıldı!', 'quest'); }, 1600);
    },
  });
  add({
    x: -139.2, enabled: () => !S().flags.shipyardOpen, label: () => G.inv.has('kazma') ? '⛏️ Molozu temizle' : '🪨 Moloz yığını (kazma gerekli)', range: 1.6,
    action: () => {
      if (!G.inv.has('kazma')) { G.ui.toast('Moloz yolu kapatıyor. Bir kazma gerekli.', 'warn'); return; }
      G.player.doAction(1.6); [0, 450, 900, 1350].forEach(d => setTimeout(() => G.audio.mine(), d));
      setTimeout(() => { S().flags.shipyardOpen = true; G.world.gates.shipyard.visible = false; G.inv.add('tas', 6); G.skills.add('kesif', 15); G.quests.check(); G.ui.toast('Eski tersanenin yolu açıldı!', 'quest'); }, 1600);
    },
  });
  add({
    x: -149, label: '🏚️ Tersane ofisi', action: () => {
      if (G.quests.isActive('q_tomas') && !S().flags.foundLog) {
        G.ui.dialog({ speaker: null, lines: ['Paslı bir dolabın arkasında, muşamba bir pakete sarılmış bir defter buluyorsun.', 'Kapağında: "V. Brandt — Liman Müdürü — Özel".'], onEnd: () => { S().flags.foundLog = true; G.mystery.addClue('c13'); G.quests.check(); } });
      } else G.ui.dialog({ speaker: null, lines: ['Paslı dolaplar, ıslak kâğıtlar. Duvarda 1927 tarihli bir gelgit çizelgesi asılı.', '14 Kasım\'ın üzeri kırmızı kalemle defalarca çizilmiş.'] });
    },
  });
  add({
    x: -196.2, label: '🛖 Denizci kulübesi', action: () => {
      if (G.quests.isActive('q_jonas') && !G.inv.has('jonas_agi') && !S().flags.gaveNet) {
        G.ui.dialog({ speaker: null, lines: ['Kulübenin köşesinde katlanmış bir balık ağı duruyor. Hâlâ ıslak.', 'Ağın kurşununa "J.V." harfleri kazınmış.'], onEnd: () => { G.inv.add('jonas_agi', 1); G.quests.check(); } });
      } else G.ui.dialog({ speaker: null, lines: ['Duvara bir isim kazınmış: J. VARGA.', 'Altında, daha yeni bir el yazısıyla: "Işığı gördüm. Gidiyorum."'] });
    },
  });
  // Fener sandalı: sahil ↔ ada
  add({ x: SANDAL_DOCK.beach - 1.5, range: 1.5, enabled: () => G.sandal.side === 'beach' && !G.sandal.driving, label: '⛵ Sandala bin — Fener Adası\'na', action: () => G.sandal.board() });
  add({ x: SANDAL_DOCK.island + 1.6, range: 1.5, enabled: () => G.sandal.side === 'island' && !G.sandal.driving, label: '⛵ Sandala bin — Sahile', action: () => G.sandal.board() });
  add({ x: -65.2, label: '🚗 Araban', action: () => G.ui.dialog({ speaker: null, lines: ['Yolculuktan kalma eski araban.', 'Torpidoda bir harita var. "Son Fener" kasabası kırmızı kalemle daire içine alınmış. Bunu sen mi yaptın? Hatırlamıyorsun.'] }) });
  fishSpot(41.2, 'iskele', { minDist: 3, maxDist: 10 });
  fishSpot(78, 'sahil', { minDist: 4.5, maxDist: 12 });
  fishSpot(108.5, 'sahil', { minDist: 4.5, maxDist: 12 });
  fishSpot(-171, 'sahil', { minDist: 4.5, maxDist: 12 });
  fishSpot(197.5, 'derin', { minDist: 11, maxDist: 20, minTier: 2 });
  add({
    x: 24, enabled: () => G.inv.has('ag'),
    label: () => !S().net ? '🕸️ Ağı kur' : (S().netCatch ? '🕸️ Ağı topla' : '🕸️ Ağ kurulu (yarın topla)'),
    action: () => {
      const s = S();
      if (!s.net) { s.net = { day: s.day }; G.audio.splash(); G.ui.toast('Ağı kurdun. Yarın sabah topla.', 'info'); return; }
      if (s.netCatch) {
        for (const [it, n] of s.netCatch) G.inv.add(it, n);
        s.net = null; s.netCatch = null; G.audio.pickup(); G.skills.add('balikcilik', 6);
      } else G.ui.toast('Ağ hâlâ suda. Yarın sabah topla.', 'info');
    },
  });
  add({
    x: 37.6, range: 1.1,
    label: () => S().boat.level >= 1 ? '⛵ Tekneye bin' : (S().flags.boatQuest ? '🔧 Tekneyi onar' : '🛶 Eski tekne'),
    action: () => {
      const s = S();
      if (s.boat.level >= 1) { boatMenu(); return; }
      if (s.flags.boatQuest) { G.ui.openBoat(); return; }
      G.ui.dialog({ speaker: null, lines: ['Yarı batık, eski bir balıkçı teknesi. Kıç tarafında silik harflerle "JONAS" yazıyor.', 'Atölyedeki İvo belki onarabilir. (İvo ile en az 3 kalp)'] });
    },
  });
  add({ x: 113.2, enabled: () => S().nightEvent === 'ayak_izleri' && G.night.prints.visible && !S().clues.includes('c05'), label: '👣 Islak ayak izleri', action: () => G.night.inspectPrints() });
  add({ x: 110.8, label: '🤿 Sığ resif (dalış)', enabled: () => G.inv.has('dalis'), action: () => { G.ui.toast('Dalıyorsun...', 'info'); startDive('sahil'); } });

  // ---------------- MAĞARA ----------------
  add({ area: 'magara', x: CAVE_X + 1.2, label: '🌤️ Mağaradan çık', action: () => G.setArea('world', -117.4) });
  fishSpot(CAVE_X + 40.5, 'magara', { area: 'magara', minDist: 3, maxDist: 6.5, water: () => caveGround(CAVE_X + 40) - 0.55 });
  add({ area: 'magara', x: CAVE_X + 70, enabled: () => !S().clues.includes('c11'), label: '🧿 Parlayan pusula', action: () => G.ui.dialog({ speaker: null, lines: ['Bir kayanın üzerinde, mavi bir ışıkla parlayan kristal bir pusula.', 'İbresi kuzeyi göstermiyor. Denizi gösteriyor. Hep aynı noktayı.', 'Kasasının içine kazınmış: "AURELIA – K.L."'], onEnd: () => { G.inv.add('kristal_pusula', 1); G.mystery.addClue('c11'); G.areas.magara.refresh(S()); } }) });

  // ---------------- DENİZ ----------------
  add({ area: 'deniz', x: SEA_X + 0.6, range: 0.9, label: '⚓ Dümen', action: () => boatMenu(true) });
  add({ area: 'deniz', x: SEA_X - 2.0, range: 0.9, label: '🎣 Balık tut', action: () => G.fishing.start({ zone: G.areas.deniz.dest === 'batik' ? 'batik' : 'derin', dirZ: -1, minDist: 5, maxDist: 16 }) });
  add({ area: 'deniz', x: SEA_X + 2.4, range: 0.9, enabled: () => G.areas.deniz.dest === 'batik', label: '🤿 Batığa dal', action: () => startDive('batik') });
  add({ area: 'deniz', x: SEA_X + 2.4, range: 0.9, enabled: () => G.areas.deniz.dest === 'ada', label: '🏝️ Adaya çık', action: () => G.ui.ending() });

  return list;
}

function boatMenu(atSea = false) {
  const S = G.state, b = S.boat.level;
  const travel = b >= 2 ? 30 : 60;
  const go = (dest) => {
    G.ui.fade(() => {
      G.day.advance(travel);
      G.areas.deniz.setDest(dest);
      G.setArea('deniz', SEA_X);
    });
  };
  const opts = [];
  if (atSea) opts.push({ label: `🏠 Limana dön (${travel} dk)`, onSelect: () => G.ui.fade(() => { G.day.advance(travel); G.setArea('world', 37); }) });
  if (!atSea || G.areas.deniz.dest !== 'acik') opts.push({ label: `🌊 Açık deniz — Derin Su balıkları (${travel} dk)`, onSelect: () => go('acik') });
  if (b >= 4 && (!atSea || G.areas.deniz.dest !== 'batik')) opts.push({ label: `⚓ Batık gemi bölgesi (${travel} dk)`, onSelect: () => go('batik') });
  else if (b < 4) opts.push({ label: '🔒 Batık gemi (Tekne Seviye 4)', onSelect: () => G.ui.toast('Batığa ulaşmak için dalış platformu gerekli (Tekne Seviye 4).', 'info') });
  const islandOk = b >= 5 && S.lighthouse.level >= 5 && S.deductions.includes('d6');
  if (islandOk && (!atSea || G.areas.deniz.dest !== 'ada')) opts.push({ label: `🏝️ Uzak Ada (${travel * 2} dk)`, onSelect: () => { G.day.advance(travel); go('ada'); } });
  else if (!islandOk) opts.push({ label: '🔒 Uzak Ada (Tekne 5 · Fener 5 · "Koordinatlar" çıkarımı)', onSelect: () => G.ui.toast('Uzak adaya rota çizmek için Tekne Seviye 5, Fener Seviye 5 ve "Koordinatlar" çıkarımı gerekli.', 'info') });
  if (!atSea) opts.push({ label: '🔧 Tekneyi geliştir', onSelect: () => G.ui.openBoat() });
  if (G.hour >= 21) opts.unshift({ label: '⚠️ Gece denize açılmak... (riskli)', onSelect: () => G.ui.toast('Elias\'ın sesi kulağında: "Denizde bazı geceler balık tutulmaz." Belki sabahı beklemelisin.', 'mystery', 5) });
  opts.push({ label: 'Vazgeç', onSelect: () => { } });
  G.ui.dialog({ speaker: null, lines: [atSea ? 'Nereye?' : `Tekne Seviye ${b}. Nereye açılmak istersin?`], options: opts });
}

export function lampMenu() {
  const S = G.state, L = S.lighthouse, lamp = G.lamp;
  if (!S.flags.lampRepaired) {
    const cost = { hurda: 4, deniz_cami: 3, odun: 2 };
    if (!needItems(cost)) {
      G.ui.dialog({ speaker: null, lines: ['Lambanın camları kırık, mekanizması paslanmış.', `Onarım için gerekenler: 4 ${itemName('hurda')} (${G.inv.count('hurda')}), 3 ${itemName('deniz_cami')} (${G.inv.count('deniz_cami')}), 2 ${itemName('odun')} (${G.inv.count('odun')}).`, 'Sahilde bunların hepsini bulabilirsin.'] });
      return;
    }
    for (const [it, n] of Object.entries(cost)) G.inv.remove(it, n);
    G.player.doAction(2.0);
    [0, 500, 1000, 1500].forEach(d => setTimeout(() => G.audio.mine(), d));
    setTimeout(() => {
      S.flags.lampRepaired = true;
      G.areas.fener_ic.refresh(S);
      G.skills.add('fener', 30);
      G.ui.dialog({ speaker: null, lines: ['Camları yerine oturttun, dişlileri temizledin.', 'Mekanizma inleyerek döndü. Yirmi yıl sonra ilk kez.', 'Akşam olunca lambaya yağ koyup yakabilirsin.'] });
      G.quests.check();
    }, 2000);
    return;
  }
  const cap = lamp.capacity();
  const opts = [];
  if (L.broken) opts.push({ label: '🔧 Arızayı onar (2 Hurda Metal)', onSelect: () => lamp.repairBreak() });
  opts.push({ label: `🛢️ Yağ ekle (${L.fuel.toFixed(1)}/${cap.toFixed(1)} saat · elde ${G.inv.count('lamba_yagi')})`, onSelect: () => { lamp.addOil(); lampMenu(); } });
  if (!L.lit) opts.push({ label: '🔥 Feneri yak', onSelect: () => lamp.light() });
  else {
    opts.push({ label: '🔦 Feneri yönet (ışığı elle çevir)', onSelect: () => lamp.enterControl() });
    opts.push({ label: '💨 Feneri söndür', onSelect: () => lamp.extinguish() });
  }
  opts.push({ label: 'Kapat', onSelect: () => { } });
  const status = L.broken ? 'Lamba arızalı!' : L.lit ? 'Lamba yanıyor. Işık dönüyor.' : 'Lamba sönük.';
  G.ui.dialog({ speaker: null, lines: [`${status} Yakıt: ${L.fuel.toFixed(1)} saat.`], options: opts, menu: true });
}

// --------- her kare: en yakın etkileşim ---------
export function updateInteractions() {
  const P = G.player, area = G.area.id;
  let best = null, bd = 1e9;
  const topdown = G.area.topdown;
  if (canAct()) {
    const list = topdown ? [...G.interactables, ...G.decor.interactables(P.floor)] : G.interactables;
    for (const it of list) {
      if (it.area !== area) continue;
      if (it.floor !== undefined && it.floor !== P.floor) continue;
      if (it.enabled && !it.enabled()) continue;
      // kuş bakışında iki boyutlu mesafe
      const d = topdown ? Math.hypot(it.x - P.x, (it.z ?? 0) - P.z) : Math.abs(it.x - P.x);
      if (d <= it.range && d < bd) { bd = d; best = it; }
    }
    if (area === 'world') {
      for (const npc of G.npcs) {
        if (!npc.rig.root.visible) continue;
        const d = Math.abs(npc.x - P.x);
        if (d <= 1.5 && d < bd + 0.3) { bd = d; best = { npc, label: `💬 ${npc.def.name} (${'❤'.repeat(Rel.hearts(npc.def.id)) || '♡'})`, x: npc.x, y: 2.4 }; }
      }
    }
    for (const n of G.nodes) {
      if (n.area !== area || !n.available) continue;
      if (n.def.hidden && Math.abs(n.x - P.x) > (n.def.range ?? 1.1)) continue;
      const d = Math.abs(n.x - P.x);
      if (d <= (n.def.range ?? 1.3) && d < bd) { bd = d; best = { node: n, label: `${n.def.hidden ? '✨' : '✋'} ${n.def.verb}: ${n.def.name}${n.def.tool && !G.inv.has(n.def.tool) ? ` (${itemName(n.def.tool)} gerekli)` : ''}`, x: n.x }; }
    }
  }
  G.ui.prompt(best);
  if (best && Input.wasPressed('KeyE')) {
    Input.consume('KeyE');
    G.audio.click();
    if (best.npc) { G.ui.talkingTo = best.npc; Rel.talk(best.npc); }
    else if (best.node) best.node.harvest();
    else best.action();
  }
}

export { NIGHT_EVENTS };
