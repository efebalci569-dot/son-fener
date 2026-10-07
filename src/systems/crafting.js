import { G } from '../game.js';
import { RECIPES, LIGHTHOUSE_UPGRADES, BOAT_UPGRADES } from '../data/recipes.js';
import { ITEMS, itemName, itemIcon } from '../data/items.js';
import { chance } from '../core/utils.js';

export const Craft = {
  ctx() {
    const S = G.state;
    return { ...S, skillsLv: G.skills.all() };
  },
  needFor(r) {
    const disc = G.skills.level('crafting') >= 5;
    return r.in.map(([it, n]) => [it, disc ? Math.max(1, Math.ceil(n * 0.8)) : n]);
  },
  haveOf(it) { return typeof it === 'object' ? G.inv.countTag(it.tag) : G.inv.count(it); },
  labelOf(it) { return typeof it === 'object' ? (it.tag === 'balik' ? 'herhangi bir balık' : it.tag) : itemName(it); },
  iconOf(it) { return typeof it === 'object' ? '🐟' : itemIcon(it); },
  visible(station) {
    const c = this.ctx();
    return RECIPES.filter(r => r.unlock(c) && !(r.once && G.inv.has(r.out))
      && (station === 'soba' ? r.station === 'soba' : r.station !== 'soba')
      && (station !== 'atolye' || !['r_solucan', 'r_parlak'].includes(r.id)));
  },
  can(r) {
    return this.needFor(r).every(([it, n]) => this.haveOf(it) >= n) && G.inv.canAdd(r.out);
  },
  make(r) {
    if (!this.can(r)) { G.audio.fail(); return false; }
    for (const [it, n] of this.needFor(r)) {
      if (typeof it === 'object') G.inv.removeTag(it.tag, n); else G.inv.remove(it, n);
    }
    let n = r.n;
    if (G.skills.level('crafting') >= 10 && chance(0.2)) n *= 2;
    G.inv.add(r.out, n);
    if (r.out === 'sandik') { G.inv.remove('sandik', 1); G.state.hasChest = true; G.ui.toast('📦 Sandık fenerin zemin katına yerleştirildi.', 'info'); G.areas.fener_ic.refresh(G.state); }
    if (r.out === 'buyuk_canta') { /* kullanılınca */ }
    G.state.stats.crafted = (G.state.stats.crafted ?? 0) + 1;
    G.skills.add('crafting', r.xp);
    G.audio.craft();
    G.quests.check();
    return true;
  },

  // ---------- Fener geliştirme ----------
  nextLighthouse() {
    const L = G.state.lighthouse.level;
    return L >= 5 ? null : { level: L + 1, ...LIGHTHOUSE_UPGRADES[L + 1] };
  },
  canUpgrade(u, boatMul = 1) {
    if (!u) return false;
    if (G.state.money < Math.round(u.money * boatMul)) return false;
    return Object.entries(u.cost).every(([it, n]) => G.inv.has(it, n));
  },
  upgradeLighthouse() {
    const u = this.nextLighthouse();
    if (!this.canUpgrade(u)) { G.audio.fail(); return false; }
    for (const [it, n] of Object.entries(u.cost)) G.inv.remove(it, n);
    G.state.money -= u.money;
    G.state.lighthouse.level = u.level;
    G.areas.fener_ic.refresh(G.state);
    G.audio.levelUp();
    G.ui.toast(`🏠 Fener Seviye ${u.level}: ${u.title}!`, 'level', 6);
    G.skills.add('fener', 40);
    if (u.level >= 3 && !G.state.selinArrived) G.state.selinSoon = true;
    G.quests.check();
    return true;
  },

  // ---------- Tekne ----------
  nextBoat() {
    const L = G.state.boat.level;
    return L >= 5 ? null : { level: L + 1, ...BOAT_UPGRADES[L + 1] };
  },
  upgradeBoat() {
    const u = this.nextBoat();
    const mul = u?.level === 1 && G.state.flags.boatHalf ? 0.5 : 1;
    if (!this.canUpgrade(u, mul)) { G.audio.fail(); return false; }
    for (const [it, n] of Object.entries(u.cost)) G.inv.remove(it, n);
    G.state.money -= Math.round(u.money * mul);
    G.state.boat.level = u.level;
    if (u.level === 3) G.state.inv.slots += 6;
    G.audio.levelUp();
    G.ui.toast(`🛶 Tekne Seviye ${u.level}: ${u.title}`, 'level', 6);
    G.world.refreshBoat();
    G.quests.check();
    return true;
  },
  ITEMS,
};
