import * as THREE from 'three';
import { G } from '../game.js';
import { Input } from '../core/input.js';
import { ITEMS, itemName, itemIcon } from '../data/items.js';
import { FISH } from '../data/fish.js';
import { NPCS, NPC_BY_ID } from '../data/npcs.js';
import { CLUES, DEDUCTIONS, QUESTS } from '../data/story.js';
import { LIGHTHOUSE_UPGRADES, BOAT_UPGRADES } from '../data/recipes.js';
import { ZONES, zoneAt } from '../world/terrain.js';
import { WEATHER } from '../world/weather.js';
import { SKILL_INFO } from '../systems/skills.js';
import { HEART_NAMES, Rel } from '../systems/relations.js';
import { NIGHT_EVENTS } from '../systems/night.js';
import { fmtClock, clamp } from '../core/utils.js';
import { saveGame, hasSave, deleteSave } from '../core/state.js';

const $ = id => document.getElementById(id);
const v3 = new THREE.Vector3();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const heartsStr = n => '❤'.repeat(n) + '♡'.repeat(6 - n);

const ZONE_SUB = {
  tersane: 'Paslı vinçler ve unutulmuş gemiler', orman: 'Çam kokusu ve eski bir maden', kasaba: 'Küçük, sessiz, bir şeyler saklayan',
  iskele: 'Balıkçıların sabırla beklediği yer', sahil: 'Denizin getirdiği her şey', fener: 'Yirmi yıldır karanlık',
};

export class UI {
  constructor() {
    this.dlg = null; this.panel = null; this.talkingTo = null;
    this.nbTab = 'envanter'; this.selClues = [];
    this.hudT = 0; this.lastZone = null; this.labelEls = new Map();
    $('dialog').addEventListener('click', e => { if (!e.target.closest('.opt')) this.advance(); });
    $('panel').addEventListener('mousedown', e => { if (e.target.id === 'panel') this.closePanel(); });
  }

  // ------------------------------------------------ yardımcılar
  project(x, y, z) {
    v3.set(x, y, z).project(G.camera);
    return { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, ok: v3.z < 1 };
  }
  toast(msg, kind = 'info', dur = 3.2) {
    const box = $('toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + kind; d.textContent = msg;
    box.appendChild(d);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 450); }, dur * 1000);
  }
  subtitle(text) { const s = $('subtitle'); s.textContent = text; s.classList.add('show'); clearTimeout(this._st); this._st = setTimeout(() => s.classList.remove('show'), 2600); }
  ambientLine(text) { const s = $('ambient'); s.textContent = text; s.classList.add('show'); clearTimeout(this._at); this._at = setTimeout(() => s.classList.remove('show'), 4200); }
  shake(a) { G.camShake = Math.max(G.camShake ?? 0, a); }
  zoneTitle(name, sub) {
    const z = $('zonetitle');
    z.innerHTML = `<h2>${esc(name.toLocaleUpperCase('tr-TR'))}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}`;
    z.classList.add('show'); clearTimeout(this._zt);
    this._zt = setTimeout(() => z.classList.remove('show'), 2800);
  }
  clueReveal(c, n) {
    const el = $('clue');
    el.innerHTML = `<div class="n">YENİ İPUCU · #${String(n).padStart(2, '0')}</div><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>`;
    el.classList.add('show'); clearTimeout(this._ct);
    this._ct = setTimeout(() => el.classList.remove('show'), 7000);
    this.toast('🔍 Gizem Defteri\'ne yeni ipucu eklendi. [J]', 'mystery', 4);
  }
  fade(cb) {
    const f = $('fade'); f.classList.add('on');
    setTimeout(() => { cb?.(); setTimeout(() => f.classList.remove('on'), 120); }, 650);
  }
  beamHud(on) { $('beamhud').classList.toggle('show', on); }

  // ------------------------------------------------ diyalog
  dialog(o) {
    this.dlg = { ...o, lines: o.lines ?? [], idx: 0, shown: 0, sel: 0, showOpts: !(o.lines?.length) || (o.options?.length > 0 && o.lines.length === 1) };
    G.mode = 'dialogue';
    this.renderDialog();
  }
  renderDialog() {
    const d = this.dlg, el = $('dialog');
    if (!d) { el.classList.remove('show'); return; }
    el.classList.add('show');
    const sp = d.speaker;
    let opts = '';
    if (d.showOpts && d.options?.length) {
      opts = `<div class="opts">${d.options.map((o, i) => `<button class="opt ${i === d.sel ? 'sel' : ''}" data-i="${i}"><kbd>${i + 1}</kbd>${esc(o.label)}</button>`).join('')}</div>`;
    }
    el.innerHTML = `<div class="box">${sp ? `<div class="portrait" style="background:${sp.color}">${esc(sp.name[0])}</div>` : ''}
      <div style="flex:1;min-width:0">
        ${sp ? `<div class="who">${esc(sp.name)}<small>${esc(sp.title)}</small></div><div class="hearts">${heartsStr(sp.hearts)} <small style="color:var(--ink-dim);letter-spacing:0">${HEART_NAMES[sp.hearts]}</small></div>` : ''}
        <div class="text ${sp ? '' : 'narr'}"></div>
        ${opts || (d.lines.length ? '<div class="more">▼ [E]</div>' : '')}
      </div></div>`;
    this.dlgText = el.querySelector('.text');
    if (d.showOpts) this.dlgText.textContent = d.lines.length ? d.lines[d.lines.length - 1] : (sp ? 'Ne konuşmak istersin?' : '');
    el.querySelectorAll('.opt').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.choose(+b.dataset.i); }));
  }
  advance() {
    const d = this.dlg;
    if (!d || d.showOpts) return;
    const line = d.lines[d.idx] ?? '';
    if (d.shown < line.length) { d.shown = line.length; this.dlgText.textContent = line; return; }
    if (d.idx < d.lines.length - 1) { d.idx++; d.shown = 0; this.renderDialog(); return; }
    if (d.options?.length) { d.showOpts = true; this.renderDialog(); return; }
    this.closeDialog();
    d.onEnd?.();
  }
  choose(i) {
    const d = this.dlg; if (!d) return;
    const o = d.options[i]; if (!o) return;
    G.audio.click();
    this.closeDialog();
    o.onSelect?.();
  }
  closeDialog() {
    this.dlg = null;
    $('dialog').classList.remove('show');
    if (G.mode === 'dialogue') G.mode = 'play';
  }
  updateDialog(dt) {
    const d = this.dlg; if (!d) return;
    if (!d.showOpts) {
      const line = d.lines[d.idx] ?? '';
      if (d.shown < line.length) {
        const before = Math.floor(d.shown);
        d.shown = Math.min(line.length, d.shown + dt * 52);
        if (Math.floor(d.shown / 3) !== Math.floor(before / 3) && d.speaker) G.audio.blip();
        this.dlgText.textContent = line.slice(0, Math.floor(d.shown));
      }
      if (Input.wasPressed('KeyE', 'Space', 'Enter')) this.advance();
      else if (Input.wasPressed('Escape')) { d.shown = 1e9; this.advance(); }
    } else {
      const n = d.options?.length ?? 0;
      if (!n) { if (Input.wasPressed('KeyE', 'Space', 'Enter', 'Escape')) this.closeDialog(); return; }
      if (Input.wasPressed('ArrowDown', 'KeyS')) { d.sel = (d.sel + 1) % n; this.renderDialog(); }
      if (Input.wasPressed('ArrowUp', 'KeyW')) { d.sel = (d.sel + n - 1) % n; this.renderDialog(); }
      for (let i = 0; i < Math.min(9, n); i++) if (Input.wasPressed('Digit' + (i + 1))) { this.choose(i); return; }
      if (Input.wasPressed('KeyE', 'Enter', 'Space')) this.choose(d.sel);
      else if (Input.wasPressed('Escape')) this.choose(n - 1);
    }
  }

  // ------------------------------------------------ paneller
  openPanel(kind, render, small = false) {
    this.panel = { kind, render, small };
    G.mode = 'panel';
    this.renderPanel();
  }
  renderPanel() {
    const p = this.panel, el = $('panel');
    if (!p) { el.classList.remove('show'); return; }
    el.classList.add('show');
    const { title, tabs, body, foot } = p.render();
    el.innerHTML = `<div class="pn ${p.small ? 'small' : ''}"><header><h2>${title}</h2>${foot ?? ''}<button class="x" data-act="close">✕</button></header>${tabs ?? ''}<div class="body">${body}</div></div>`;
    el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.onAct(b.dataset.act, b.dataset.arg, b); }));
    if (this._scroll !== undefined && this._scrollKind === p.kind + this.nbTab) el.querySelector('.body').scrollTop = this._scroll;
  }
  rerender() {
    const b = $('panel').querySelector('.body');
    this._scroll = b?.scrollTop; this._scrollKind = this.panel?.kind + this.nbTab;
    this.renderPanel();
  }
  closePanel() {
    this.panel = null; $('panel').classList.remove('show'); $('panel').innerHTML = '';
    if (G.mode === 'panel') G.mode = 'play';
  }
  closeAll() { this.closePanel(); if (this.dlg) this.closeDialog(); $('pause').classList.remove('show'); }

  onAct(act, arg) {
    const S = G.state;
    switch (act) {
      case 'close': this.closePanel(); G.audio.click(); return;
      case 'tab': this.nbTab = arg; this._scroll = 0; this.renderPanel(); G.audio.click(); return;
      case 'item': this.useItem(arg); break;
      case 'clue': {
        const i = this.selClues.indexOf(arg);
        if (i >= 0) this.selClues.splice(i, 1); else { this.selClues.push(arg); if (this.selClues.length > 2) this.selClues.shift(); }
        G.audio.click(); break;
      }
      case 'combine': {
        const [a, b] = this.selClues;
        const r = G.mystery.combine(a, b);
        if (r.ok) { this.toast(`🧩 Yeni çıkarım: ${r.d.title}`, 'mystery', 5); this.selClues = []; }
        else { this.toast(r.msg, 'warn'); G.audio.fail(); }
        break;
      }
      case 'craft': { const r = G.craft.visible(this.panel.station).find(x => x.id === arg); if (r) G.craft.make(r); break; }
      case 'buy': {
        const [id, nStr] = arg.split(':'); const n = +nStr;
        const it = this.panel.shop.find(x => x.id === id);
        if (S.money < it.price * n) { this.toast('Yeterli paran yok.', 'warn'); G.audio.fail(); break; }
        if (!G.inv.canAdd(id)) { this.toast('Envanter dolu.', 'warn'); break; }
        if (id === 'buyuk_canta' && (S.flags.bigBag ?? 0) >= 2) { this.toast('Daha fazla çanta taşıyamazsın.', 'warn'); break; }
        S.money -= it.price * n; G.inv.add(id, n); G.audio.pickup(); break;
      }
      case 'sell': {
        const [id, mode] = arg.split(':');
        const n = mode === 'all' ? G.inv.count(id) : 1;
        if (!n) break;
        G.inv.remove(id, n); S.money += ITEMS[id].price * n; G.audio.pickup();
        this.toast(`${itemIcon(id)} ${n}× ${itemName(id)} satıldı: +${ITEMS[id].price * n} altın`, 'money');
        break;
      }
      case 'tochest': { const n = G.inv.count(arg); if (n) { G.inv.remove(arg, n); S.chest[arg] = (S.chest[arg] ?? 0) + n; G.audio.click(); } break; }
      case 'fromchest': {
        const n = S.chest[arg] ?? 0;
        if (n && G.inv.canAdd(arg)) { delete S.chest[arg]; G.inv.items[arg] = G.inv.count(arg) + n; G.audio.click(); G.quests.check(); }
        else if (n) this.toast('Envanter dolu.', 'warn');
        break;
      }
      case 'upgrade': G.craft.upgradeLighthouse(); break;
      case 'boatup': G.craft.upgradeBoat(); break;
      case 'pick': { const cb = this.panel.cb; this.closePanel(); cb(arg); return; }
      case 'yes': { const cb = this.panel.yes; this.closePanel(); cb(); return; }
      case 'no': this.closePanel(); return;
      case 'report': this.finishReport(); return;
    }
    if (this.panel) this.rerender();
  }

  useItem(id) {
    const S = G.state, it = ITEMS[id];
    if (!it) return;
    if (it.cat === 'yem') { S.bait = S.bait === id ? null : id; this.toast(S.bait ? `${it.icon} ${it.name} aktif yem olarak takıldı.` : 'Yem çıkarıldı.', 'info'); G.audio.click(); return; }
    if (id === 'buyuk_canta') {
      G.inv.remove(id, 1); S.inv.slots += 6; S.flags.bigBag = (S.flags.bigBag ?? 0) + 1;
      this.toast('🎒 Envanter +6 yuva!', 'level'); G.audio.levelUp(); return;
    }
    if (id === 'fisek') { this.closePanel(); G.useFlare(); return; }
  }

  // --- defter
  openNotebook(tab) {
    if (tab) this.nbTab = tab;
    this.openPanel('notebook', () => this.renderNotebook());
  }
  renderNotebook() {
    const S = G.state;
    const tabs = [['envanter', '🎒 Envanter'], ['gorevler', '📜 Görevler'], ['gizem', '🔍 Gizem', S.unread], ['iliski', '❤️ İlişkiler'], ['yetenek', '⭐ Yetenekler'], ['koleksiyon', '🐟 Koleksiyon'], ['gece', '🌙 Gece Kayıtları'], ['harita', '🗺️ Harita']];
    const tabHtml = `<div class="tabs">${tabs.map(([k, l, b]) => `<button class="tab ${this.nbTab === k ? 'on' : ''}" data-act="tab" data-arg="${k}">${l}${b ? `<span class="badge">${b}</span>` : ''}</button>`).join('')}</div>`;
    if (this.nbTab === 'gizem') S.unread = 0;
    const body = this['tab_' + this.nbTab]();
    return { title: 'Bekçinin Defteri', tabs: tabHtml, body, foot: `<span class="hint">🪙 ${S.money} altın · Gün ${S.day}</span>` };
  }
  slotHtml(id, n, act = 'item', extra = '') {
    const it = ITEMS[id];
    const tip = `${it.name} — ${it.desc ?? ''}${it.price ? ` (Değer: ${it.price})` : ''}`;
    return `<div class="slot ${extra}" title="${esc(tip)}" data-act="${act}" data-arg="${id}">${it.icon}<div class="nm">${esc(it.name)}</div>${n > 1 ? `<span class="c">${n}</span>` : ''}</div>`;
  }
  tab_envanter() {
    const S = G.state, inv = G.inv.items;
    const tools = Object.keys(inv).filter(k => ITEMS[k]?.cat === 'alet');
    const story = Object.keys(inv).filter(k => ITEMS[k]?.cat === 'hikaye');
    const bag = Object.keys(inv).filter(k => ITEMS[k] && !['alet', 'hikaye'].includes(ITEMS[k].cat));
    let h = `<h3>Aletler</h3>${tools.length ? `<div class="grid">${tools.map(k => this.slotHtml(k, 1)).join('')}</div>` : '<p class="hint">Henüz aletin yok. Atölyede (İvo) üretim yapabilirsin.</p>'}`;
    h += `<h3>Çanta (${G.inv.slotsUsed()}/${G.inv.slotsMax()})</h3><div class="grid">`;
    h += bag.map(k => this.slotHtml(k, inv[k], 'item', S.bait === k ? 'active' : '')).join('');
    for (let i = bag.length; i < G.inv.slotsMax(); i++) h += '<div class="slot empty"></div>';
    h += '</div><p class="hint">Yemlere tıklayarak aktif yem seçebilirsin. Büyük Çanta ve İşaret Fişeği tıklanınca kullanılır.</p>';
    if (story.length) h += `<h3>Hikâye Eşyaları</h3><div class="grid">${story.map(k => this.slotHtml(k, 1)).join('')}</div>`;
    return h;
  }
  tab_gorevler() {
    const S = G.state;
    const act = Object.keys(S.quests.active);
    let h = '<h3>Aktif Görevler</h3>';
    if (!act.length) h += '<p class="hint">Şu an aktif görev yok. Kasabalılarla konuş, ipuçlarını birleştir.</p>';
    for (const id of act) {
      const q = QUESTS[id]; if (!q) continue;
      h += `<div class="quest"><div class="ttl">${esc(q.title)}</div><div class="giver">${esc(q.giver)}</div><div class="desc">${esc(q.desc)}</div>${G.quests.steps(id).map(s => `<div class="st ${s.done ? 'done' : ''}">${s.done ? '☑' : '☐'} ${esc(s.text)}</div>`).join('')}</div>`;
    }
    if (S.quests.done.length) h += `<h3>Tamamlananlar</h3><p class="hint">${S.quests.done.map(id => QUESTS[id]?.title).filter(Boolean).map(esc).join(' · ')}</p>`;
    return h;
  }
  tab_gizem() {
    const S = G.state;
    const [a, b] = this.selClues;
    let h = `<div class="combine"><span>Seçili: <b>${a ? esc(CLUES[a].title) : '—'}</b> + <b>${b ? esc(CLUES[b].title) : '—'}</b></span>
      <button class="btn" data-act="combine" ${a && b ? '' : 'disabled'}>🧩 Birleştir</button>
      <span class="hint">Gizem çözümü: %${G.mystery.progress()} · İpucu ${S.clues.length}/${Object.keys(CLUES).length}</span></div>`;
    h += '<div class="two"><div><h3>İpuçları</h3>';
    if (!S.clues.length) h += '<p class="hint">Henüz ipucu yok. Fenerde, kasabada ve gece denizde dikkatli bak.</p>';
    S.clues.forEach((id, i) => {
      const c = CLUES[id];
      h += `<div class="cluecard ${this.selClues.includes(id) ? 'sel' : ''}" data-act="clue" data-arg="${id}"><div class="n">İPUCU #${String(i + 1).padStart(2, '0')}</div><h4>${esc(c.title)}</h4><p>${esc(c.text)}</p><div class="src">Kaynak: ${esc(c.source)}</div></div>`;
    });
    h += '</div><div><h3>Çıkarımlar</h3>';
    if (!S.deductions.length) h += '<p class="hint">İki ipucunu seçip birleştir. Doğru bağlantılar yeni gerçekleri ve görevleri açar.</p>';
    for (const id of S.deductions) { const d = DEDUCTIONS.find(x => x.id === id); h += `<div class="deduct"><h4>🧩 ${esc(d.title)}</h4><div>${esc(d.text)}</div>${d.quest ? `<div class="hint" style="margin-top:6px">→ Görev: ${esc(QUESTS[d.quest].title)}</div>` : ''}</div>`; }
    const left = DEDUCTIONS.length - S.deductions.length;
    if (left) h += `<p class="hint">${left} bağlantı daha keşfedilmeyi bekliyor.</p>`;
    return h + '</div></div>';
  }
  tab_iliski() {
    const S = G.state;
    let h = '';
    for (const d of NPCS) {
      if (d.movesIn && !S.selinArrived) continue;
      const s = S.npcs[d.id], n = Rel.hearts(d.id);
      const pts = s.pts % 100;
      h += `<div class="npc"><div class="pp" style="background:${d.look.coat}">${d.name[0]}</div><div class="grow">
        <div><b style="font-size:17px">${esc(d.name)}</b> <span class="hint">· ${esc(d.title)}</span></div>
        <div class="hearts">${heartsStr(n)} <span class="hint" style="letter-spacing:0">${HEART_NAMES[n]}${n < 6 ? ` (${pts}/100)` : ''}</span></div>
        ${s.met ? `<div class="hint">${esc(d.personality)}</div>` : '<div class="hint">Henüz tanışmadınız.</div>'}
        ${n >= 2 ? `<div class="hint" style="margin-top:4px">Sevdikleri: ${d.loves.map(i => itemIcon(i) + ' ' + itemName(i)).join(', ')}</div>` : ''}
        <div class="hint">Bugün: ${s.talkedDay === S.day ? '💬 konuştunuz' : '— konuşmadınız'} · ${s.giftedDay === S.day ? '🎁 hediye verildi' : 'hediye verilmedi'}</div>
      </div></div>`;
    }
    return h + '<p class="hint">Her gün konuşmak ve sevdikleri hediyeler ilişkiyi güçlendirir. 4 kalpte sırlar, 5 kalpte özel görevler, 6 kalpte karakter hikâyeleri açılır.</p>';
  }
  tab_yetenek() {
    let h = '';
    for (const [k, info] of Object.entries(SKILL_INFO)) {
      const p = G.skills.progress(k);
      h += `<div class="skill"><div><b style="font-size:17px">${info.icon} ${info.name}</b> <span class="hint">Seviye ${p.lv}/10</span></div>
        <div class="bar"><i style="width:${p.frac * 100}%"></i></div>
        ${Object.entries(info.perks).map(([lv, t]) => `<div class="perk ${p.lv >= +lv ? 'on' : ''}">Lv.${lv}: ${esc(t)}</div>`).join('')}</div>`;
    }
    return h;
  }
  tab_koleksiyon() {
    const S = G.state;
    const list = FISH.filter(f => !f.junk);
    let h = `<h3>Balıklar (${list.filter(f => S.stats.fish[f.id]).length}/${list.length})</h3><div class="grid">`;
    for (const f of list) {
      const n = S.stats.fish[f.id] ?? 0;
      const tip = n ? `${f.name} — ${f.zones.join(', ')} · ${f.time.join('/')} · hava: ${f.weather.join('/')}${f.note ? ' · ' + f.note : ''}` : '???';
      h += `<div class="slot ${n ? '' : 'unknown'}" title="${esc(tip)}">${f.icon}<div class="nm">${n ? esc(f.name) : '???'}</div>${n ? `<span class="c">${n}</span>` : ''}</div>`;
    }
    h += '</div><p class="hint">Balıklar bölgeye, saate, havaya, yeme ve olta kalitesine göre değişir. Bazı nadir balıklar yalnızca özel gecelerde görünür.</p>';
    return h;
  }
  tab_gece() {
    const S = G.state;
    if (!S.nightLog.length) return '<p class="hint">Henüz kayda değer bir gece yaşamadın. Geceleri dışarıda, denize yakın ol. Bu gece ne olacak?</p>';
    return [...S.nightLog].reverse().map(l => `<div class="row"><div class="ic">🌙</div><div class="grow"><div class="ttl">Gün ${l.day}</div><div class="sub">${esc(l.text)}</div></div></div>`).join('');
  }
  tab_harita() {
    const S = G.state;
    const min = ZONES[0].from, max = ZONES[ZONES.length - 1].to, W = max - min;
    const cols = { tersane: '#6a5244', orman: '#355a2c', kasaba: '#77706a', iskele: '#7a5e42', sahil: '#c8b080', fener: '#6a6c70' };
    const locked = { tersane: !S.flags.shipyardOpen, orman: !S.flags.forestOpen };
    let h = '<div class="mapstrip">';
    for (const z of ZONES) h += `<div class="z ${locked[z.id] ? 'locked' : ''}" style="width:${(z.to - z.from) / W * 100}%;background:${cols[z.id]}">${esc(z.name)}</div>`;
    const mk = (x, ic, t) => `<span class="mk" style="left:${(x - min) / W * 100}%" title="${esc(t)}">${ic}</span>`;
    h += mk(150, '🗼', 'Deniz Feneri') + mk(-118, '🕳️', 'Mağara') + mk(-35.4, '⛪', 'Kilise');
    if (G.area.id === 'world') h += mk(G.player.x, '📍', 'Sen');
    if (G.skills.level('kesif') >= 5) for (const n of G.nodes) if (n.def.hidden && n.available && n.area === 'world') h += mk(n.x, '✨', 'Gizli nokta');
    for (const npc of G.npcs) if (npc.rig.root.visible || (npc.visible && G.area.id !== 'world')) h += mk(npc.x, `<b style="font-size:11px;background:${npc.def.look.coat};padding:1px 4px;border-radius:4px;color:#fff">${npc.def.name[0]}</b>`, npc.def.name);
    h += '</div>';
    h += '<h3>Bölgeler</h3>';
    const info = {
      tersane: 'Hurda, demir, eski sandıklar. Denizci kulübesi ve liman ofisi burada.', orman: 'Odun, reçine, mantar, bitki ve meyve. Eski maden mağarası (demir, bakır, kristal).',
      kasaba: 'Market (Marta), Martı Bar (Tomas), Atölye (İvo), Belediye (Hale), eski kilise.', iskele: 'Balık tutma, ağ kurma ve tekne.',
      sahil: 'Odun, kabuk, deniz camı, hurda ve gemi enkazları. Gece... dikkatli ol.', fener: 'Senin evin. Fener lambası, uçurumdan derin su balıkları.',
    };
    for (const z of ZONES) h += `<div class="row"><div class="grow"><div class="ttl">${esc(z.name)}${locked[z.id] ? ' 🔒' : ''}</div><div class="sub">${esc(info[z.id])}</div></div></div>`;
    if (G.skills.level('kesif') < 5) h += '<p class="hint">Keşif Lv.5 ile haritada gizli noktaları görebilirsin.</p>';
    return h;
  }

  // --- üretim
  openCraft(station) {
    this.openPanel('craft', () => {
      this.panel.station = station;
      const list = G.craft.visible(station);
      const S = G.state;
      let h = `<p class="hint">${station === 'atolye' ? 'İvo\'nun atölyesi.' : 'Fenerin çalışma masası.'} Üretim Lv.${G.skills.level('crafting')}${G.skills.level('crafting') >= 5 ? ' · %20 daha az kaynak' : ''}</p>`;
      for (const r of list) {
        const it = ITEMS[r.out];
        const need = G.craft.needFor(r).map(([i, n]) => { const have = G.craft.haveOf(i); return `<span class="need ${have >= n ? 'ok' : 'no'}">${G.craft.iconOf(i)} ${esc(G.craft.labelOf(i))} ${have}/${n}</span>`; }).join('');
        h += `<div class="row"><div class="ic">${it.icon}</div><div class="grow"><div class="ttl">${esc(r.label ?? it.name)}${r.n > 1 ? ` ×${r.n}` : ''}</div><div class="sub">${esc(it.desc ?? '')}</div><div>${need}</div></div><button class="btn" data-act="craft" data-arg="${r.id}" ${G.craft.can(r) ? '' : 'disabled'}>Üret</button></div>`;
      }
      if (!list.length) h += '<p class="hint">Şu an üretilebilecek yeni bir şey yok.</p>';
      h += '<p class="hint">Yeni tarifler Üretim seviyesi, fener seviyesi ve hikâye ilerledikçe açılır.</p>';
      return { title: '🔨 Üretim', body: h, foot: `<span class="hint">🪙 ${S.money}</span>` };
    });
  }

  // --- dükkân
  openShop(npc, list) {
    this.openPanel('shop', () => {
      this.panel.shop = list;
      let h = '';
      for (const s of list) {
        const it = ITEMS[s.id];
        h += `<div class="row"><div class="ic">${it.icon}</div><div class="grow"><div class="ttl">${esc(it.name)}</div><div class="sub">${esc(it.desc ?? '')} · Elde: ${G.inv.count(s.id)}</div></div><b style="color:var(--amber-2)">${s.price} 🪙</b><button class="btn" data-act="buy" data-arg="${s.id}:1">Al</button>${it.cat !== 'tuketim' || s.id === 'fisek' ? `<button class="btn ghost" data-act="buy" data-arg="${s.id}:5">×5</button>` : ''}</div>`;
      }
      return { title: `🛒 ${npc.def.name}`, body: h, foot: `<span class="hint">🪙 ${G.state.money}</span>` };
    }, true);
  }
  openSell(npc) {
    this.openPanel('sell', () => {
      const items = Object.keys(G.inv.items).filter(k => ITEMS[k] && !['alet', 'hikaye'].includes(ITEMS[k].cat) && ITEMS[k].price > 0);
      let h = items.length ? '' : '<p class="hint">Satacak bir şeyin yok.</p>';
      for (const id of items) {
        const it = ITEMS[id], n = G.inv.count(id);
        h += `<div class="row"><div class="ic">${it.icon}</div><div class="grow"><div class="ttl">${esc(it.name)} ×${n}</div><div class="sub">Birim: ${it.price} 🪙</div></div><button class="btn" data-act="sell" data-arg="${id}:1">Sat</button><button class="btn ghost" data-act="sell" data-arg="${id}:all">Hepsi (${it.price * n})</button></div>`;
      }
      return { title: `💰 ${npc.def.name}'ya sat`, body: h, foot: `<span class="hint">🪙 ${G.state.money}</span>` };
    }, true);
  }
  openChest() {
    this.openPanel('chest', () => {
      const S = G.state;
      const bag = Object.keys(G.inv.items).filter(k => ITEMS[k] && !['alet', 'hikaye'].includes(ITEMS[k].cat));
      const ch = Object.keys(S.chest).filter(k => S.chest[k] > 0);
      const h = `<div class="two"><div><h3>Çanta (${G.inv.slotsUsed()}/${G.inv.slotsMax()})</h3><div class="grid">${bag.map(k => this.slotHtml(k, G.inv.count(k), 'tochest')).join('') || '<p class="hint">Boş</p>'}</div></div>
        <div><h3>Sandık</h3><div class="grid">${ch.map(k => this.slotHtml(k, S.chest[k], 'fromchest')).join('') || '<p class="hint">Boş</p>'}</div></div></div><p class="hint">Bir yığına tıklayarak taşı.</p>`;
      return { title: '📦 Sandık', body: h };
    });
  }
  costHtml(cost, money, mul = 1) {
    const S = G.state;
    return Object.entries(cost).map(([i, n]) => `<span class="need ${G.inv.has(i, n) ? 'ok' : 'no'}">${itemIcon(i)} ${esc(itemName(i))} ${G.inv.count(i)}/${n}</span>`).join('') + `<span class="need ${S.money >= Math.round(money * mul) ? 'ok' : 'no'}">🪙 ${S.money}/${Math.round(money * mul)}</span>`;
  }
  openUpgrade() {
    this.openPanel('upgrade', () => {
      const S = G.state, L = S.lighthouse.level, u = G.craft.nextLighthouse();
      let h = `<p class="hint">Fener şu an <b>Seviye ${L}</b>. Her seviye feneri ve kasabayı büyütür.</p>`;
      for (let i = 2; i <= 5; i++) {
        const d = LIGHTHOUSE_UPGRADES[i];
        h += `<div class="row" style="${i <= L ? 'opacity:.55' : ''}"><div class="ic">${i <= L ? '✅' : i === L + 1 ? '⬆️' : '🔒'}</div><div class="grow"><div class="ttl">Seviye ${i}: ${esc(d.title)}</div><div class="sub">${d.perks.map(esc).join(' · ')}</div>${i === L + 1 ? `<div>${this.costHtml(d.cost, d.money)}</div>` : ''}</div>${i === L + 1 ? `<button class="btn" data-act="upgrade" ${G.craft.canUpgrade(u) ? '' : 'disabled'}>Geliştir</button>` : ''}</div>`;
      }
      return { title: '🗼 Fener Geliştirme', body: h, foot: `<span class="hint">🪙 ${S.money}</span>` };
    });
  }
  openBoat() {
    this.openPanel('boat', () => {
      const S = G.state, L = S.boat.level, u = G.craft.nextBoat();
      const mul = u?.level === 1 && S.flags.boatHalf ? 0.5 : 1;
      let h = `<p class="hint">Tekne ${L ? `Seviye ${L}` : 'henüz onarılmadı'}. Tekne dünyayı büyütür: derin sular, batık gemi ve uzak ada.</p>`;
      for (let i = 1; i <= 5; i++) {
        const d = BOAT_UPGRADES[i];
        h += `<div class="row" style="${i <= L ? 'opacity:.55' : ''}"><div class="ic">${i <= L ? '✅' : i === L + 1 ? '⬆️' : '🔒'}</div><div class="grow"><div class="ttl">Seviye ${i}: ${esc(d.title)}</div><div class="sub">${esc(d.perk)}</div>${i === L + 1 ? `<div>${this.costHtml(d.cost, d.money, mul)}</div>` : ''}</div>${i === L + 1 ? `<button class="btn" data-act="boatup" ${G.craft.canUpgrade(u, mul) ? '' : 'disabled'}>${L ? 'Geliştir' : 'Onar'}</button>` : ''}</div>`;
      }
      return { title: '🛶 Tekne', body: h, foot: `<span class="hint">🪙 ${S.money}</span>` };
    });
  }
  openItemPicker(title, filter, cb) {
    this.openPanel('pick', () => {
      this.panel.cb = cb;
      const items = Object.keys(G.inv.items).filter(k => ITEMS[k] && filter(k));
      const h = items.length ? `<div class="grid">${items.map(k => this.slotHtml(k, G.inv.count(k), 'pick')).join('')}</div>` : '<p class="hint">Verecek uygun bir eşyan yok.</p>';
      return { title, body: h + '<p style="margin-top:14px"><button class="btn ghost" data-act="pick" data-arg="">Vazgeç</button></p>' };
    }, true);
  }
  confirm(msg, yes) {
    this.openPanel('confirm', () => { this.panel.yes = yes; return { title: 'Emin misin?', body: `<p>${esc(msg)}</p><p><button class="btn" data-act="yes">Evet</button> <button class="btn ghost" data-act="no">Hayır</button></p>` }; }, true);
  }

  // ------------------------------------------------ gün raporu
  dayReport(day, wd, lines, cb) {
    this.reportCb = cb;
    const el = $('report');
    el.innerHTML = `<div class="in"><h1>Gün ${day}</h1><div class="wd">${esc(wd)} · 06:00</div><ul>${lines.map((l, i) => `<li style="animation-delay:${0.3 + i * 0.35}s">${esc(l)}</li>`).join('')}</ul><button class="btn" id="rep-go">Yeni güne başla [E]</button></div>`;
    $('fade').classList.add('on');
    setTimeout(() => { el.classList.add('show'); $('fade').classList.remove('on'); this.reportReady = performance.now() + 900; }, 700);
    el.querySelector('#rep-go').addEventListener('click', () => this.finishReport());
  }
  finishReport() {
    if (!this.reportCb || performance.now() < (this.reportReady ?? 0)) return;
    const cb = this.reportCb; this.reportCb = null;
    $('fade').classList.add('on');
    setTimeout(() => { $('report').classList.remove('show'); cb(); setTimeout(() => $('fade').classList.remove('on'), 150); }, 600);
  }

  // ------------------------------------------------ başlık & duraklat
  showTitle(onNew, onCont) {
    const el = $('title');
    const can = hasSave();
    el.innerHTML = `<div class="in"><h1>Son<br>Fener</h1>
      <div class="tag">Kıyıda sessiz bir kasaba. Yirmi yıldır karanlık bir fener.<br>Ve denizin seksen yıldır sakladığı bir sır.</div>
      <div class="menu">${can ? '<button id="t-cont">Devam Et</button>' : ''}<button id="t-new">Yeni Oyun</button></div>
      <div class="ctr"><kbd>A</kbd><kbd>D</kbd> yürü · <kbd>Shift</kbd> koş · <kbd>Boşluk</kbd> zıpla · <kbd>E</kbd> etkileşim<br>
      <kbd>Tab</kbd> defter · <kbd>J</kbd> gizem defteri · <kbd>L</kbd> el feneri · <kbd>G</kbd> işaret fişeği · <kbd>M</kbd> müzik · <kbd>Esc</kbd> menü</div>
      <div class="note">Kulaklıkla oynaman önerilir. Tüm sesler ve modeller gerçek zamanlı üretilir.</div></div>`;
    el.classList.add('show');
    const nb = el.querySelector('#t-new');
    nb.addEventListener('click', () => {
      // kayıt varsa iki adımlı onay
      if (can && !nb.dataset.sure) { nb.dataset.sure = '1'; nb.textContent = 'Kayıt silinecek — emin misin?'; nb.style.color = 'var(--red)'; return; }
      if (can) deleteSave();
      el.classList.remove('show'); onNew();
    });
    el.querySelector('#t-cont')?.addEventListener('click', () => { el.classList.remove('show'); onCont(); });
  }
  togglePause(on) {
    const el = $('pause');
    if (on) {
      G.prevMode = G.mode; G.mode = 'paused';
      el.innerHTML = `<div class="in"><h2>Duraklatıldı</h2>
        <button data-p="resume">Devam et</button><button data-p="save">Kaydet</button><button data-p="music">Müzik: ${G.audio.musicOn ? 'Açık' : 'Kapalı'}</button><button data-p="title">Ana menüye dön</button>
        <div class="ctr"><b>Kontroller</b><br>A/D yürü · Shift koş · Boşluk zıpla · E etkileşim · Tab defter · J gizem · L el feneri · G işaret fişeği · M müzik<br>
        Balık: Boşluk basılı tutup bırak (atış) → şamandıra batınca Boşluk (kancala) → Boşluk basılı sar, balık çekerken bırak.<br>
        Fener: Akşam lamba odasına çık → yağ ekle → yak. "Feneri yönet" ile ışığı A/D ile kendin çevir.</div></div>`;
      el.classList.add('show');
      el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
        const p = b.dataset.p;
        if (p === 'resume') this.togglePause(false);
        if (p === 'save') { saveGame(G.state); this.toast('💾 Kaydedildi.', 'info'); }
        if (p === 'music') { G.audio.musicOn = !G.audio.musicOn; this.togglePause(true); }
        if (p === 'title') { saveGame(G.state); location.reload(); }
      }));
    } else { el.classList.remove('show'); G.mode = G.prevMode ?? 'play'; }
  }

  ending() {
    G.mode = 'cutscene';
    G.state.flags.reachedIsland = true;
    G.quests.check();
    const el = $('report');
    el.innerHTML = `<div class="ending"><h1>Uzak Ada</h1>
      <p>Kumda yarı gömülü bir çan, kıyıda dizili otuz bir taş. Adanın tepesinde ikinci bir fener var — seninkinin ikizi. Sönük.</p>
      <p>Merdivenlerin dibinde bir defter: "Aurelia mürettebatı burada bekliyor. Işık iki taraftan yanarsa, yol açılır."</p>
      <p>Pusulanın ibresi ilk kez durdu. Rüzgâr isimler fısıldıyor: Tom, Rudi, Jonas, Aron...</p>
      <p style="color:var(--amber-2)">— Son Fener'in bu bölümü burada bitiyor. Hikâye devam edecek. —</p>
      <button class="btn" id="end-go">Kıyıya dön</button></div>`;
    el.classList.add('show');
    el.querySelector('#end-go').addEventListener('click', () => { el.classList.remove('show'); G.setArea('world', 37); G.mode = 'play'; });
  }

  // ------------------------------------------------ kare güncellemesi
  prompt(best) {
    const el = $('prompt');
    if (!best || G.mode !== 'play') { el.style.display = 'none'; return; }
    const label = typeof best.label === 'function' ? best.label() : best.label;
    const gy = best.node ? best.node.mesh.position.y + 1.4 : (best.npc ? best.npc.y + 2.5 : G.area.ground(best.x, G.player) + (best.y ?? 2.3));
    const z = best.npc ? best.npc.z : best.node ? best.node.z : 0;
    const p = this.project(best.x, gy, z);
    el.style.display = 'block';
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    el.innerHTML = `<kbd>E</kbd>${esc(label)}`;
  }

  handleInput() {
    const m = G.mode;
    if (m === 'dialogue') return;
    if (this.reportCb && Input.wasPressed('KeyE', 'Space', 'Enter')) { this.finishReport(); return; }
    if (m === 'paused') { if (Input.wasPressed('Escape')) this.togglePause(false); return; }
    if (m === 'panel') {
      if (Input.wasPressed('Escape') || (this.panel?.kind === 'notebook' && Input.wasPressed('Tab', 'KeyI', 'KeyJ'))) { this.closePanel(); G.audio.click(); }
      return;
    }
    if (m === 'play') {
      if (Input.wasPressed('Tab', 'KeyI')) { this.openNotebook(); G.audio.click(); }
      else if (Input.wasPressed('KeyJ')) { this.openNotebook('gizem'); G.audio.click(); }
      else if (Input.wasPressed('Escape')) this.togglePause(true);
      else if (Input.wasPressed('KeyL')) G.player.toggleLantern();
      else if (Input.wasPressed('KeyG')) G.useFlare();
      else if (Input.wasPressed('KeyM')) { G.audio.musicOn = !G.audio.musicOn; this.toast(`Müzik ${G.audio.musicOn ? 'açık' : 'kapalı'}`, 'info', 1.5); }
    }
  }

  update(dt) {
    this.handleInput();
    this.updateDialog(dt);
    if (G.mode === 'play') this.talkingTo = null;
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.2; this.updateHud(); }
    this.updateLabels();
    // bölge başlığı
    const zid = G.area.id === 'world' ? zoneAt(G.player.x).id : G.area.id;
    if (zid !== this.lastZone && G.mode !== 'title') {
      if (this.lastZone !== null) {
        if (G.area.id === 'world') { const z = zoneAt(G.player.x); this.zoneTitle(z.name, ZONE_SUB[z.id]); }
        else this.zoneTitle(G.area.name);
      }
      this.lastZone = zid;
      if (G.area.id === 'world') G.state.flags.visited[zid] = true;
    }
    if (G.mode === 'beam') {
      const L = G.state.lighthouse;
      $('beamhud').innerHTML = `<b>Fener Yönetimi</b> — <kbd>A</kbd>/<kbd>D</kbd> ışığı çevir · <kbd>E</kbd>/<kbd>Esc</kbd> bırak · Yakıt: ${L.fuel.toFixed(1)} saat`;
    }
  }

  updateLabels() {
    const P = G.player;
    const show = G.area.id === 'world' && (G.mode === 'play' || G.mode === 'fishing');
    for (const npc of G.npcs) {
      let el = this.labelEls.get(npc);
      const d = Math.abs(npc.x - P.x);
      const vis = show && npc.rig.root.visible && d < 9;
      if (!el) { el = document.createElement('div'); el.className = 'nl'; $('labels').appendChild(el); this.labelEls.set(npc, el); }
      if (!vis) { el.style.display = 'none'; continue; }
      const p = this.project(npc.x, npc.y + 2.25 * (npc.def.look.scale ?? 1), npc.z);
      el.style.display = 'block'; el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
      el.style.opacity = clamp(1.4 - d / 7, 0, 1);
      const txt = `${npc.def.name}<small>${npc.def.title}</small>`;
      if (el._t !== txt) { el.innerHTML = txt; el._t = txt; }
    }
  }

  updateHud() {
    const S = G.state; if (!S) return;
    const w = WEATHER[S.weather];
    $('clock').innerHTML = `<div class="day">Gün ${S.day} · ${G.day.weekday()}</div><div class="time">${fmtClock(G.hour)}</div><div class="meta">${G.day.phase()} · ${w.icon} ${w.name}</div><div class="sun"><i style="left:${S.time / 1200 * 100}%"></i></div>`;
    const L = S.lighthouse;
    let lamp = '';
    if (!S.flags.lampRepaired) lamp = '<div class="chip lamp broken">🔧 Fener kırık</div>';
    else if (L.broken) lamp = '<div class="chip lamp broken">⚠️ Fener arızalı</div>';
    else if (L.lit) lamp = `<div class="chip lamp lit">🔆 Fener yanıyor · ${L.fuel.toFixed(1)}s</div>`;
    else lamp = `<div class="chip lamp">⚫ Fener sönük · ${L.fuel.toFixed(1)}s</div>`;
    const bait = S.bait ? `<div class="chip">${ITEMS[S.bait].icon} ${ITEMS[S.bait].name} ×${G.inv.count(S.bait)}</div>` : '';
    const lant = G.inv.has('el_feneri') ? `<div class="chip">🏮 ${G.player.lanternOn ? 'Açık' : 'Kapalı'} [L]</div>` : '';
    $('status').innerHTML = `<div class="chip money">🪙 ${S.money}</div>${lamp}${bait}${lant}`;
    // bölge çubuğu
    const zb = $('zonebar');
    if (G.area.id === 'world') {
      const min = ZONES[0].from, max = ZONES[ZONES.length - 1].to, W = max - min;
      const cols = { tersane: '#6a5244', orman: '#3e6531', kasaba: '#8a8278', iskele: '#86684a', sahil: '#d6bf8e', fener: '#8a8c90' };
      const locked = { tersane: !S.flags.shipyardOpen, orman: !S.flags.forestOpen };
      const cur = zoneAt(G.player.x).id;
      let h = '<div class="bar">';
      for (const z of ZONES) h += `<div class="seg ${locked[z.id] ? 'locked' : ''}" style="width:${(z.to - z.from) / W * 100}%;background:${cols[z.id]}">${z.id === cur ? `<span>${esc(z.name)}</span>` : ''}</div>`;
      h += `<span class="lh" style="left:${(150 - min) / W * 100}%">🗼</span>`;
      if (G.skills.level('kesif') >= 5) for (const n of G.nodes) if (n.def.hidden && n.available && n.area === 'world') h += `<span class="dot" style="left:${(n.x - min) / W * 100}%;background:#fff4c0"></span>`;
      h += `<span class="me" style="left:${(G.player.x - min) / W * 100}%"></span></div>`;
      zb.innerHTML = h;
    } else zb.innerHTML = `<div class="areaname">${esc(G.area.name)}${G.area.id === 'fener_ic' ? ` · ${['Zemin kat', '1. kat', '2. kat', 'Lamba odası'][G.player.floor]}` : ''}</div>`;
    // aletler
    const tools = ['olta3', 'olta2', 'olta1', 'balta', 'kazma', 'el_feneri', 'ag', 'dalis'].filter(t => G.inv.has(t));
    const rod = tools.find(t => t.startsWith('olta'));
    const shown = tools.filter(t => !t.startsWith('olta') || t === rod);
    $('tools').innerHTML = shown.map(t => `<div class="t" title="${esc(itemName(t))}">${itemIcon(t)}${t.startsWith('olta') ? `<small>${t.slice(-1)}</small>` : ''}</div>`).join('') + (G.inv.has('fisek') ? `<div class="t" title="İşaret Fişeği [G]">🧨<small>${G.inv.count('fisek')}</small></div>` : '');
  }
}

export { NPC_BY_ID, NIGHT_EVENTS };
