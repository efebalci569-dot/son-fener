// Yalnızca geliştirme modunda yüklenir: test ve hata ayıklama yardımcıları
import { G } from './game.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const down = code => window.dispatchEvent(new KeyboardEvent('keydown', { code }));
const up = code => window.dispatchEvent(new KeyboardEvent('keyup', { code }));

Object.assign(window, {
  __sleep: sleep,
  async __key(code, ms = 60) { down(code); await sleep(ms); up(code); await sleep(80); },
  async __walkTo(x, run = true) {
    const code = x > G.player.x ? 'KeyD' : 'KeyA';
    down(code); if (run) down('ShiftLeft');
    const t0 = performance.now();
    while (Math.abs(G.player.x - x) > 0.4 && performance.now() - t0 < 40000) {
      await sleep(15);
      if ((code === 'KeyD' && G.player.x > x) || (code === 'KeyA' && G.player.x < x)) break;
    }
    up(code); up('ShiftLeft'); await sleep(250);
    return G.player.x;
  },
  async __skipDlg(n = 40) { for (let i = 0; i < n && G.ui.dlg && !G.ui.dlg.showOpts; i++) await window.__key('KeyE'); },
  async __newGame() {
    const b = document.querySelector('#t-new');
    b?.click(); if (b?.dataset.sure) b.click();
    await sleep(600);
    await window.__skipDlg();
  },
  __tp(x, area = 'world', floor = 0) { G.setArea(area, x, floor); },
  __hour(h) { G.state.time = Math.round((h - 6) * 60); },
  __give(id, n = 1) { G.inv.add(id, n); },
});
