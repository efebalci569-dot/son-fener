import { G } from '../game.js';
import { QUESTS, CLUES, DEDUCTIONS } from '../data/story.js';
import { itemName } from '../data/items.js';

export const Quests = {
  isActive(id) { return !!G.state.quests.active[id]; },
  isDone(id) { return G.state.quests.done.includes(id); },
  start(id, silent = false) {
    const q = QUESTS[id];
    if (!q || this.isActive(id) || this.isDone(id)) return;
    G.state.quests.active[id] = { started: G.state.day };
    if (!silent) { G.ui.toast(`📜 Yeni görev: ${q.title}`, 'quest', 4.5); G.audio.blip(); }
    this.check();
  },
  steps(id) {
    const q = QUESTS[id];
    return q.steps.map(st => ({ text: st.text + (st.progress ? st.progress(G.state) : ''), done: !!st.done(G.state, G) }));
  },
  check() {
    if (!G.state) return;
    for (const id of Object.keys(G.state.quests.active)) {
      const q = QUESTS[id];
      if (!q) { delete G.state.quests.active[id]; continue; }
      if (q.steps.every(st => st.done(G.state, G))) this.complete(id);
    }
  },
  complete(id) {
    const q = QUESTS[id];
    delete G.state.quests.active[id];
    if (!G.state.quests.done.includes(id)) G.state.quests.done.push(id);
    G.ui.toast(`✅ Görev tamamlandı: ${q.title}`, 'quest', 4.5);
    G.audio.success();
    const r = q.reward ?? {};
    if (r.money) G.inv.addMoney(r.money);
    if (r.items) for (const [it, n] of r.items) G.inv.add(it, n);
    if (r.xp) G.skills.add(r.xp[0], r.xp[1]);
    if (r.pts) for (const [npc, n] of Object.entries(r.pts)) G.rel.addPts(npc, n);
    for (const n of q.next ?? []) this.start(n);
  },
};

export const Mystery = {
  has(id) { return G.state.clues.includes(id); },
  addClue(id) {
    if (this.has(id) || !CLUES[id]) return false;
    G.state.clues.push(id);
    G.state.unread = (G.state.unread ?? 0) + 1;
    G.audio.clue();
    G.ui.clueReveal(CLUES[id], G.state.clues.length);
    G.quests.check();
    return true;
  },
  combine(a, b) {
    if (a === b) return { ok: false, msg: 'Aynı ipucunu kendisiyle birleştiremezsin.' };
    const d = DEDUCTIONS.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!d) return { ok: false, msg: 'Bu ikisi arasında bir bağ bulamadın... henüz.' };
    if (G.state.deductions.includes(d.id)) return { ok: false, msg: 'Bu bağlantıyı zaten kurdun.' };
    G.state.deductions.push(d.id);
    G.audio.clue();
    G.skills.add('kesif', 25);
    if (d.quest) Quests.start(d.quest);
    Quests.check();
    return { ok: true, d };
  },
  progress() {
    const total = Object.keys(CLUES).length + DEDUCTIONS.length;
    return Math.round((G.state.clues.length + G.state.deductions.length) / total * 100);
  },
};

export { itemName };
