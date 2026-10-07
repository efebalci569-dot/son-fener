import { ITEMS } from './items.js';

// zones: iskele | sahil | derin | magara | batik
// time: gunduz (06-18) | aksam (17-22) | gece (21-26) | any
// weather: any | yagmur | sis | acik | firtina
// diff: 1 (kolay) – 9 (efsanevi). rarity: ağırlık (yüksek = yaygın)
export const FISH = [
  { id: 'sardalya', name: 'Sardalya', icon: '🐟', zones: ['iskele', 'sahil', 'derin'], time: ['any'], weather: ['any'], rarity: 60, diff: 1, price: 12, size: [12, 20] },
  { id: 'istavrit', name: 'İstavrit', icon: '🐟', zones: ['iskele'], time: ['gunduz', 'aksam'], weather: ['any'], rarity: 50, diff: 1.5, price: 15, size: [15, 25] },
  { id: 'kefal', name: 'Kefal', icon: '🐟', zones: ['iskele', 'sahil'], time: ['any'], weather: ['any'], rarity: 40, diff: 2, price: 18, size: [25, 45] },
  { id: 'cipura', name: 'Çipura', icon: '🐠', zones: ['sahil'], time: ['gunduz', 'aksam'], weather: ['acik', 'bulutlu'], rarity: 28, diff: 2.5, price: 32, size: [20, 35] },
  { id: 'mezgit', name: 'Mezgit', icon: '🐟', zones: ['iskele', 'derin'], time: ['gece', 'aksam'], weather: ['any'], rarity: 35, diff: 2, price: 22, size: [20, 35] },
  { id: 'levrek', name: 'Levrek', icon: '🐠', zones: ['sahil', 'iskele'], time: ['aksam', 'gece'], weather: ['yagmur', 'bulutlu', 'firtina'], rarity: 22, diff: 3, price: 48, size: [30, 60] },
  { id: 'ahtapot', name: 'Ahtapot', icon: '🐙', zones: ['iskele', 'batik'], time: ['gece'], weather: ['any'], rarity: 14, diff: 3.5, price: 58, size: [40, 90] },
  { id: 'lufer', name: 'Lüfer', icon: '🐠', zones: ['sahil', 'derin'], time: ['aksam'], weather: ['any'], rarity: 16, diff: 4, price: 65, size: [30, 70] },
  { id: 'kalkan', name: 'Kalkan', icon: '🐡', zones: ['derin', 'batik'], time: ['gunduz'], weather: ['any'], rarity: 10, diff: 5, price: 95, size: [35, 70] },
  { id: 'kor_balik', name: 'Kör Mağara Balığı', icon: '🐟', zones: ['magara'], time: ['any'], weather: ['any'], rarity: 40, diff: 3, price: 50, size: [8, 15] },
  { id: 'kristal_balik', name: 'Kristal Balık', icon: '🐠', zones: ['magara'], time: ['gece'], weather: ['any'], rarity: 10, diff: 5.5, price: 130, size: [10, 22] },
  { id: 'kara_yilan', name: 'Kara Yılanbalığı', icon: '🐍', zones: ['sahil', 'derin'], time: ['gece'], weather: ['sis'], rarity: 9, diff: 6, price: 150, size: [60, 140], note: 'Yalnızca sisli gecelerde.' },
  { id: 'fener_baligi', name: 'Fener Balığı', icon: '🐡', zones: ['iskele', 'derin', 'sahil'], time: ['gece'], weather: ['any'], rarity: 7, diff: 6.5, price: 180, size: [30, 60], needLamp: true, note: 'Fener yanarken ışığa yükselir.' },
  { id: 'gumus_ruh', name: 'Gümüş Ruh', icon: '🐠', zones: ['batik', 'derin'], time: ['gece'], weather: ['any'], rarity: 6, diff: 7, price: 260, size: [40, 80] },
  { id: 'hayalet_balik', name: 'Hayalet Balığı', icon: '👻', zones: ['iskele', 'sahil', 'derin', 'batik'], time: ['gece'], weather: ['any'], rarity: 12, diff: 8, price: 420, size: [50, 110], event: 'hayalet_gemi', note: 'Yalnızca hayalet geminin göründüğü gecelerde.' },
  // Çöp
  { id: 'yosun', name: 'Yosun', icon: '🌱', zones: ['iskele', 'sahil', 'derin', 'batik'], time: ['any'], weather: ['any'], rarity: 8, diff: 0.5, price: 1, junk: true },
  { id: 'eski_bot', name: 'Eski Bot', icon: '🥾', zones: ['iskele', 'sahil'], time: ['any'], weather: ['any'], rarity: 4, diff: 0.5, price: 1, junk: true },
  { id: 'yengec', name: 'Yengeç', icon: '🦀', zones: [], time: ['any'], weather: ['any'], rarity: 0, diff: 1, price: 20, netOnly: true },
];

export const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]));

// Balıkları eşya tablosuna kaydet (çöpler zaten var)
for (const f of FISH) {
  if (f.junk) continue;
  ITEMS[f.id] = { name: f.name, icon: f.icon, cat: 'balik', price: f.price, desc: f.note ?? 'Taze yakalanmış.' };
}

export const ZONE_FISH_NAMES = {
  iskele: 'İskele', sahil: 'Sahil', derin: 'Derin Su', magara: 'Mağara Gölü', batik: 'Batık Gemi',
};
