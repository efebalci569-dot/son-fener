const down = new Set();
const pressed = new Set();
const BLOCK = ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  if (!down.has(e.code)) pressed.add(e.code);
  down.add(e.code);
  if (BLOCK.includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => down.delete(e.code));
window.addEventListener('blur', () => down.clear());

let mouseHeld = false;
window.addEventListener('mousedown', e => { if (e.button === 0) mouseHeld = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) mouseHeld = false; });

export const Input = {
  isDown: (...codes) => codes.some(c => down.has(c)),
  wasPressed: (...codes) => codes.some(c => pressed.has(c)),
  consume: (...codes) => codes.forEach(c => pressed.delete(c)),
  get mouseHeld() { return mouseHeld; },
  endFrame() { pressed.clear(); },
  left: () => down.has('KeyA') || down.has('ArrowLeft'),
  right: () => down.has('KeyD') || down.has('ArrowRight'),
};
