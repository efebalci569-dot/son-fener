// NPC ilişkileri, hediyeler, diyalog akışları ve dükkânlar
import { G } from '../game.js';
import { NPC_BY_ID } from '../data/npcs.js';
import { ITEMS, itemName, itemIcon } from '../data/items.js';
import { pick } from '../core/utils.js';

export const HEART_NAMES = ['Tanımıyor', 'Tanıdık', 'Arkadaş', 'Güveniyor', 'Sırlarını anlatıyor', 'Özel görev', 'Karakter hikâyesi'];
export const BUY_PRICE = { solucan: 5, karides: 15, parlak_yem: 45, lamba_yagi: 30, halat: 12, fisek: 30, buyuk_canta: 250 };

export const Rel = {
  st(id) { return G.state.npcs[id]; },
  hearts(id) { return Math.min(6, Math.floor((this.st(id)?.pts ?? 0) / 100)); },
  addPts(id, n) {
    const s = this.st(id); if (!s) return;
    const before = this.hearts(id);
    s.pts = Math.max(0, Math.min(650, s.pts + n));
    const after = this.hearts(id);
    const def = NPC_BY_ID[id];
    if (after > before) {
      G.ui.toast(`❤️ ${def.name}: ${after} kalp — ${HEART_NAMES[after]}`, 'heart', 4.5);
      G.audio.heart();
    } else if (after < before) {
      G.ui.toast(`💔 ${def.name} ile aranız soğudu.`, 'warn');
    }
  },
  giftReaction(id, item) {
    const d = NPC_BY_ID[id];
    if (d.loves.includes(item)) return { pts: 80, text: pick(['Bu... harika! Nereden bildin?', 'En sevdiğim! Teşekkür ederim, gerçekten.', 'Ah! Bunu çok severim.']), kind: 'loves' };
    if (d.likes.includes(item)) return { pts: 45, text: pick(['Ne hoş, teşekkürler.', 'Bunu sevdim.', 'Düşüncelisin.']), kind: 'likes' };
    if (d.hates.includes(item)) return { pts: -40, text: pick(['Bunu bana neden verdin?', 'Hayır. Bunu istemiyorum.', '...Ciddi misin?']), kind: 'hates' };
    if (d.dislikes.includes(item)) return { pts: -20, text: pick(['Hm. Pek bana göre değil.', 'Teşekkürler... sanırım.']), kind: 'dislikes' };
    return { pts: 20, text: pick(['Teşekkür ederim.', 'Ah, bir hediye. Sağ ol.', 'Nazik bir jest.']), kind: 'neutral' };
  },
  speaker(id) {
    const d = NPC_BY_ID[id];
    return { name: d.name, title: d.title, color: d.look.coat, hearts: this.hearts(id), id };
  },

  // ---------------- ANA DİYALOG ----------------
  talk(npc) {
    const id = npc.def.id, d = npc.def, s = this.st(id), S = G.state;
    const sp = () => this.speaker(id);
    const hearts = this.hearts(id);
    let lines = [];
    const firstToday = s.talkedDay !== S.day;

    // Başkan Hale: anahtar teslimi
    if (id === 'hale' && !S.flags.hasKey) {
      G.ui.dialog({
        speaker: sp(), lines: [
          'Bekçi! Nihayet geldin. Ben Hale, kasabanın başkanıyım.',
          'Fener yirmi yıldır karanlık. Belediye bir bekçi ilanı verdi... ve sen geldin. Tek başvuran sendin.',
          'Al, bu anahtar fenerin. Kasabanın doğusunda, sahilin bittiği kayalıkların üstünde.',
          'Lambanın onarılması gerekecek. Sahilde bolca hurda ve deniz camı bulursun.',
          'Fener her gece yanarsa belediye sana liman ödemesi yapar. Bol şans... gerçekten.',
        ],
        onEnd: () => {
          S.flags.hasKey = true; s.met = true;
          G.inv.add('fener_anahtari', 1);
          this.markTalk(id, firstToday);
          G.quests.check();
        },
      });
      return;
    }

    // 6 kalp hikâyesi
    if (hearts >= 6 && !s.topics.story6 && d.story6) {
      s.topics.story6 = true;
      G.ui.dialog({ speaker: null, lines: d.story6, onEnd: () => this.story6Reward(id) });
      return;
    }

    // Özel karşılamalar
    let special = null;
    if (id === 'agnes' && S.flags.beachNightSeen && !S.flags.agnesKnew) {
      S.flags.agnesKnew = true;
      special = () => G.ui.dialog({
        speaker: sp(), lines: ['Gece sahile gitmişsin.'],
        options: [
          { label: 'Nasıl biliyorsun?', onSelect: () => G.ui.dialog({ speaker: sp(), lines: ['...'], options: [{ label: '...', onSelect: () => G.ui.dialog({ speaker: null, lines: ['Agnes cevap vermiyor. Gözlerini denize çeviriyor.'], onEnd: () => this.menu(npc) }) }] }) },
          { label: '(Sessiz kal)', onSelect: () => this.menu(npc) },
        ],
      });
    } else if (npc.wasMissing && !npc.missingTalked) {
      npc.missingTalked = true;
      special = () => G.ui.dialog({
        speaker: sp(), lines: ['Ben... neden buradayım?', 'Dün gece yatağıma yattığımı hatırlıyorum. Sonra... su sesi. Biri adımı söylüyordu.', 'Kimseye söyleme, olur mu?'],
        onEnd: () => { this.addPts(id, 30); this.menu(npc); },
      });
    }

    if (!s.met) {
      s.met = true;
      lines = [d.lines[0][0]];
    } else if (npc.locKey === 'sahil_agnes' && d.morning) {
      lines = [pick(d.morning)];
    } else if (S.weather === 'yagmur' && d.rain && Math.random() < 0.5) {
      lines = [pick(d.rain)];
    } else if ((npc.locKey ?? '').startsWith('bar_masa') && d.evening) {
      lines = [pick(d.evening)];
    } else {
      const tier = Math.max(0, Math.min(6, hearts - (Math.random() < 0.35 ? 1 : 0)));
      let pool = d.lines[tier];
      for (let t = tier; !pool && t >= 0; t--) pool = d.lines[t];
      lines = [pick(pool)];
    }
    if (firstToday) this.markTalk(id, true);
    if (special) { special(); return; }
    G.ui.dialog({ speaker: sp(), lines, onEnd: () => this.menu(npc) });
  },

  markTalk(id, firstToday) {
    const s = this.st(id);
    if (firstToday) { s.talkedDay = G.state.day; this.addPts(id, 15); }
  },

  menu(npc) {
    const id = npc.def.id, d = npc.def, s = this.st(id), S = G.state;
    const sp = this.speaker(id);
    const hearts = this.hearts(id);
    const opts = [];

    // Görev teslimleri
    for (const o of this.deliveries(npc)) opts.push(o);

    // Konular
    for (const t of d.topics ?? []) {
      if (hearts < (t.min ?? 0)) continue;
      if (t.cond && !t.cond(S)) continue;
      if (s.topics[t.id] && !t.repeat) continue;
      opts.push({
        label: t.q, topic: true, onSelect: () => {
          if (t.gossip) { G.ui.dialog({ speaker: sp, lines: [pick(d.gossip)], onEnd: () => this.menu(npc) }); return; }
          if (t.dynamic) { this.dynamicTopic(t.dynamic, npc); return; }
          s.topics[t.id] = true;
          G.ui.dialog({
            speaker: sp, lines: t.a, onEnd: () => {
              if (t.clue) G.mystery.addClue(t.clue);
              if (t.quest) G.quests.start(t.quest);
              if (t.flag) S.flags[t.flag] = true;
              if (t.action) this.action(t.action, npc);
              this.menu(npc);
            },
          });
        },
      });
    }
    if (s.giftedDay !== S.day) opts.push({ label: '🎁 Hediye ver', onSelect: () => this.giftFlow(npc) });
    if (d.shop && npc.atWork) {
      opts.push({ label: '🛒 Alışveriş', onSelect: () => G.ui.openShop(npc, this.shopList(id)) });
      if (id === 'marta') opts.push({ label: '💰 Eşya sat', onSelect: () => G.ui.openSell(npc) });
    }
    if (id === 'ivo' && npc.atWork) opts.push({ label: '🔨 Atölyeyi kullan', onSelect: () => G.ui.openCraft('atolye') });
    opts.push({ label: 'Hoşça kal', onSelect: () => { } });
    G.ui.dialog({ speaker: sp, lines: [], options: opts, menu: true });
  },

  shopList(id) {
    const d = NPC_BY_ID[id];
    const list = [...d.shop.buy];
    if (d.shop.buy3 && this.hearts(id) >= 3) list.push(...d.shop.buy3);
    const disc = id === 'marta' ? G.state.discount : 0;
    return list.map(it => ({ id: it, price: Math.round(BUY_PRICE[it] * (1 - disc)) }));
  },

  giftFlow(npc) {
    const id = npc.def.id;
    G.ui.openItemPicker('Hediye seç', it => ITEMS[it]?.cat !== 'alet' && ITEMS[it]?.cat !== 'hikaye', it => {
      if (!it) { this.menu(npc); return; }
      G.inv.remove(it, 1);
      const r = this.giftReaction(id, it);
      this.st(id).giftedDay = G.state.day;
      this.addPts(id, r.pts);
      const tag = { loves: ' (çok sevdi!)', likes: ' (sevdi)', neutral: '', dislikes: ' (sevmedi)', hates: ' (nefret etti)' }[r.kind];
      G.ui.toast(`${itemIcon(it)} ${itemName(it)} hediye edildi${tag}`, r.pts > 0 ? 'heart' : 'warn');
      G.ui.dialog({ speaker: this.speaker(id), lines: [r.text], onEnd: () => this.menu(npc) });
    });
  },

  deliveries(npc) {
    const id = npc.def.id, S = G.state, inv = G.inv, out = [];
    const sp = () => this.speaker(id);
    const give = (label, lines, fn) => out.push({ label: '📦 ' + label, onSelect: () => { fn(); G.ui.dialog({ speaker: sp(), lines, onEnd: () => { G.quests.check(); this.menu(npc); } }); } });
    if (id === 'elias' && G.quests.isActive('q_jonas') && inv.has('jonas_agi')) give('Jonas\'ın ağını ver', ['...Bu onun. Düğümlerini tanırım.', 'Yirmi yıl. Hâlâ ıslak. Nasıl olabilir?', 'Teşekkür ederim, bekçi. Gerçekten.'], () => { inv.remove('jonas_agi'); S.flags.gaveNet = true; });
    if (id === 'marta' && G.quests.isActive('q_marta') && inv.has('meyve', 3) && inv.has('mantar', 2)) give('Meyve ve mantarları ver', ['Harika! Bu akşam reçel kaynatıyorum.', 'Büyükannemin mutfağının kokusu... yıllar sonra.'], () => { inv.remove('meyve', 3); inv.remove('mantar', 2); S.flags.martaJam = true; });
    if (id === 'tomas' && G.quests.isActive('q_tomas') && S.flags.foundLog && !S.flags.gaveLog) give('Babanın günlüğünü ver', ['Bu... babamın el yazısı.', 'Okuyacağım. Bu gece. Bar kapandıktan sonra.'], () => { S.flags.gaveLog = true; });
    if (id === 'agnes' && G.quests.isActive('q_agnes') && inv.has('kristal')) give('Kristal ver', ['Saf... Evet, tam olarak bu.', 'Teşekkür ederim, çocuğum.'], () => { inv.remove('kristal'); S.flags.agnesCrystal = true; });
    if (id === 'ivo' && G.quests.isActive('q_ivo') && inv.has('bakir', 4) && inv.has('gemi_parcasi')) give('Bakır ve gemi parçasını ver', ['Mükemmel! Bu çekirdekle motor iki kat güçlü olacak.'], () => { inv.remove('bakir', 4); inv.remove('gemi_parcasi'); S.flags.ivoMotor = true; });
    if (id === 'agnes' && G.quests.isActive('q_dongu') && S.lighthouse.level >= 3 && inv.has('lamba_yagi', 3)) give('Yirmi yıllık döngüyü sor', [
      'Demek anladın.', 'Her yirmi yılda bir, Kasım\'ın sisli bir gecesinde deniz birini çağırır. Fener sönerse, kapı açılır.',
      'Kardeşim o gece ışığı bilerek söndürdü. Jonas\'ı kurtarmak istedi. İkisi de gitti.', 'Bu yıl sıra yine geldi. Feneri yakık tut, çocuğum. Ne görürsen gör.',
    ], () => { S.flags.dunguAgnes = true; });
    return out;
  },

  dynamicTopic(kind, npc) {
    const id = npc.def.id, S = G.state, sp = this.speaker(id);
    if (kind === 'tomasAurelia') {
      const h = this.hearts(id);
      if (h < 3) { G.ui.dialog({ speaker: sp, lines: ['Aurelia mı? O eski hikâyeler...', 'İçkini iç, bekçi. Bazı isimler bu barda söylenmez.'], onEnd: () => this.menu(npc) }); return; }
      if (!S.deductions.includes('d2')) { G.ui.dialog({ speaker: sp, lines: ['Babam bir kez sarhoşken o ismi söylemişti. Sonra ağladı.', 'Neden ağladığını hiç sormadım. Sormamalıydım belki.'], onEnd: () => this.menu(npc) }); return; }
      S.npcs[id].topics.aurelia = true;
      G.ui.dialog({
        speaker: sp, lines: [
          'Raporu okudun demek. Ve günlüğü.', '...Evet. Babam o raporu imzaladı. Ama gemiyi kimse batarken görmedi.',
          'Sise girdiğini gördüler. Bir daha çıkmadığını. Belediye "batmış" yazdırdı. Kasabanın huzuru için.',
          'Babam her yıl 14 Kasım\'da içerdi. Pencereden denize bakar, "Işığı yakmalıydım" derdi.',
        ], onEnd: () => { S.flags.tomasConfessed = true; G.quests.check(); this.menu(npc); },
      });
    }
  },

  action(kind) {
    const S = G.state;
    if (kind === 'giveRod') {
      S.flags.gotRod = true;
      if (!G.inv.has('olta1')) G.inv.add('olta1', 1);
      G.inv.add('solucan', 5);
      G.ui.toast('İpucu: İskelenin ucunda veya sahilde [E] ile balık tut. Kancalamak için [Boşluk], sarmak için basılı tut.', 'info', 7);
    } else if (kind === 'boatQuest') {
      S.flags.boatQuest = true;
      G.quests.start('q_tekne');
    }
  },

  story6Reward(id) {
    const S = G.state;
    if (id === 'marta') S.discount = 0.2;
    if (id === 'hale') S.payBonus = 0.5;
    if (id === 'ivo') {
      if (S.boat.level >= 1 && S.boat.level < 5) { S.boat.level += 1; G.ui.toast(`🛶 Tekne seviye ${S.boat.level}!`, 'level'); }
      else S.flags.boatHalf = true;
    }
    if (id === 'elias') G.inv.add('parlak_yem', 5);
    if (id === 'tomas') G.inv.add('lamba_yagi', 4);
    if (id === 'agnes') G.inv.add('gizemli_obje', 1);
    G.skills.add('kesif', 40);
  },
};
