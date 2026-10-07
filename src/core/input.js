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
const mouse = { x: 0, y: 0, moved: false, clicked: false, rclicked: false };
window.addEventListener('mousedown', e => {
  if (e.button === 0) mouseHeld = true;
  // yalnızca oyun tuvaline yapılan tıklamalar (arayüz değil)
  if (e.target instanceof HTMLCanvasElement) {
    if (e.button === 0) mouse.clicked = true;
    if (e.button === 2) mouse.rclicked = true;
  }
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouseHeld = false; });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true; });
window.addEventListener('contextmenu', e => { if (e.target instanceof HTMLCanvasElement) e.preventDefault(); });

export const Input = {
  isDown: (...codes) => codes.some(c => down.has(c)),
  wasPressed: (...codes) => codes.some(c => pressed.has(c)),
  consume: (...codes) => codes.forEach(c => pressed.delete(c)),
  get mouseHeld() { return mouseHeld; },
  mouse,
  endFrame() { pressed.clear(); mouse.moved = false; mouse.clicked = false; mouse.rclicked = false; },
  up: () => down.has('KeyW') || down.has('ArrowUp'),
  down: () => down.has('KeyS') || down.has('ArrowDown'),
  left: () => down.has('KeyA') || down.has('ArrowLeft'),
  right: () => down.has('KeyD') || down.has('ArrowRight'),
};
