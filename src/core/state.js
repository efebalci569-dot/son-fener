import { NPCS } from '../data/npcs.js';

const SAVE_KEY = 'sonfener_save_v1';

export function newState() {
  const npcs = {};
  for (const n of NPCS) npcs[n.id] = { pts: 0, talkedDay: 0, giftedDay: 0, met: false, topics: {} };
  return {
    version: 1,
    day: 1,
    time: 120, // 06:00'dan itibaren dakika (120 = 08:00)
    money: 60,
    inv: { items: {}, slots: 18 },
    chest: {},
    hasChest: false,
    bait: null,
    lighthouse: { level: 1, lit: false, broken: false, fuel: 0, nightLit: 0, yaw: 0 },
    boat: { level: 0 },
    sandalSide: 'beach',
    skills: { balikcilik: 0, kesif: 0, crafting: 0, dalis: 0, fener: 0 },
    npcs,
    clues: [],
    deductions: [],
    unread: 0,
    quests: { active: { q_start: {} }, done: [] },
    flags: { visited: {} },
    weather: 'acik',
    tomorrowWeather: 'acik',
    nightEvent: null,
    nightLog: [],
    nodes: {}, // nodeId → yeniden doğacağı gün
    net: null, // { day }
    player: { area: 'world', x: -63, floor: 0 },
    stats: { fish: {}, totalFish: 0, nightsLit: 0, litStreak: 0, crafted: 0 },
    decor: { '-1': [], 0: [{ uid: 1, item: 'masa', x: 1.8, z: 2.4, rot: 0 }, { uid: 2, item: 'sandalye', x: 3.15, z: 2.5, rot: 3 }], 1: [], 2: [], 3: [] },
    decorUid: 10,
    selinArrived: false,
    payBonus: 0,
    discount: 0,
  };
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Eksik alanları varsayılanlarla tamamla
    const base = newState();
    for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
    for (const id of Object.keys(base.npcs)) if (!s.npcs[id]) s.npcs[id] = base.npcs[id];
    return s;
  } catch { return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* yoksay */ }
}
