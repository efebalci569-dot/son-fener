import { G } from '../game.js';
import { ITEMS, itemName, itemIcon } from '../data/items.js';

export const Inv = {
  get items() { return G.state.inv.items; },
  count(id) { return this.items[id] ?? 0; },
  has(id, n = 1) { return this.count(id) >= n; },
  slotsUsed() { return Object.keys(this.items).filter(k => this.items[k] > 0 && ITEMS[k]?.cat !== 'alet' && ITEMS[k]?.cat !== 'hikaye').length; },
  slotsMax() { return G.state.inv.slots; },
  canAdd(id) {
    const cat = ITEMS[id]?.cat;
    if (cat === 'alet' || cat === 'hikaye') return true;
    return this.count(id) > 0 || this.slotsUsed() < this.slotsMax();
  },
  // eklenmeyen miktarı döndürür
  add(id, n = 1, { silent = false } = {}) {
    if (n <= 0) return 0;
    if (!this.canAdd(id)) {
      if (!silent) G.ui.toast(`Envanter dolu! ${itemIcon(id)} ${itemName(id)} alınamadı.`, 'warn');
      return n;
    }
    this.items[id] = this.count(id) + n;
    if (!silent) G.ui.toast(`+${n} ${itemIcon(id)} ${itemName(id)}`, 'item');
    G.quests?.check();
    return 0;
  },
  remove(id, n = 1) {
    if (this.count(id) < n) return false;
    this.items[id] -= n;
    if (this.items[id] <= 0) delete this.items[id];
    if (G.state.bait === id && !this.has(id)) G.state.bait = null;
    return true;
  },
  countTag(tag) {
    let n = 0;
    for (const [k, v] of Object.entries(this.items)) if (ITEMS[k]?.cat === tag) n += v;
    return n;
  },
  removeTag(tag, n) {
    // en ucuzdan başlayarak sil
    const list = Object.entries(this.items).filter(([k]) => ITEMS[k]?.cat === tag).sort((a, b) => ITEMS[a[0]].price - ITEMS[b[0]].price);
    for (const [k, v] of list) {
      const take = Math.min(v, n);
      this.remove(k, take); n -= take;
      if (n <= 0) break;
    }
    return n <= 0;
  },
  rodTier() {
    if (this.has('olta3')) return 3;
    if (this.has('olta2')) return 2;
    if (this.has('olta1')) return 1;
    return 0;
  },
  addMoney(n) {
    G.state.money = Math.max(0, G.state.money + n);
    if (n > 0) G.ui.toast(`+${n} altın`, 'money');
  },
};
