import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { G } from './game.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { newState, loadGame } from './core/state.js';
import { Settings } from './core/settings.js';
import { damp, randRange, clamp } from './core/utils.js';
import { Environment } from './world/env.js';
import { Sky } from './world/sky.js';
import { Sea, setWaveScale } from './world/sea.js';
import { Weather } from './world/weather.js';
import { buildWorld, LIGHTHOUSE_X } from './world/world.js';
import { buildCave, buildSeaArea } from './world/interiors.js';
import { buildLighthouseInterior } from './world/lighthouse.js';
import { Decor } from './systems/decor.js';
import { groundY, WORLD_MAX_X, STRAIT } from './world/terrain.js';
import { Sandal } from './systems/sandal.js';
import { Player } from './entities/player.js';
import { NPC } from './entities/npc.js';
import { buildNodes, updateNodes } from './entities/nodes.js';
import { NPCS } from './data/npcs.js';
import { Inv } from './systems/inventory.js';
import { Skills } from './systems/skills.js';
import { Rel } from './systems/relations.js';
import { Quests, Mystery } from './systems/quests.js';
import { Fishing } from './systems/fishing.js';
import { Lamp } from './systems/lamp.js';
import { Night } from './systems/night.js';
import { Craft } from './systems/crafting.js';
import { Day } from './systems/daycycle.js';
import { buildInteractions, updateInteractions } from './systems/interactions.js';
import { UI } from './ui/ui.js';

// ------------------------------------------------------------ render
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 1600);
camera.position.set(0, 5, 16);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 0.85);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, night: { value: 0 }, grain: { value: 0.018 }, flash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float night; uniform float grain; uniform float flash; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, mix(vec3(l), c.rgb, 0.85) * vec3(0.82, 0.94, 1.18), night * 0.55);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= mix(1.0, smoothstep(0.85, 0.3, d), 0.35 + night * 0.25);
      float n = fract(sin(dot(vUv * (fract(time) + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (n - 0.5) * grain * (1.0 + night);
      c.rgb += flash * vec3(0.6, 0.7, 0.9);
      gl_FragColor = c;
    }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  if (!innerWidth || !innerHeight) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ------------------------------------------------------------ ayarlar
let shadowSize = 2048;
G.applySettings = () => {
  const d = Settings.data;
  const pr = Math.min(window.devicePixelRatio || 1, 2) * d.resScale;
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  const sz = { kapali: 0, dusuk: 1024, yuksek: 2048, ultra: 4096 }[d.shadows] ?? 2048;
  const en = sz > 0;
  if (renderer.shadowMap.enabled !== en) {
    renderer.shadowMap.enabled = en;
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  }
  if (en && sz !== shadowSize && G.env) {
    const sh = G.env.dir.shadow;
    sh.mapSize.set(sz, sz); sh.map?.dispose(); sh.map = null;
  }
  shadowSize = sz;
  bloom.enabled = d.bloom;
  grade.uniforms.grain.value = d.grain ? 0.018 : 0;
  Audio.setVolumes({ master: d.master, music: d.music, sfx: d.sfx, ambient: d.ambient });
  document.getElementById('fps').classList.toggle('show', d.fps);
};

// ------------------------------------------------------------ bağlam
Object.assign(G, {
  scene, camera, renderer, composer,
  audio: Audio, inv: Inv, skills: Skills, rel: Rel, quests: Quests, mystery: Mystery, craft: Craft, day: Day,
  camShake: 0,
});
G.state = newState();
G.ui = new UI();
G.env = new Environment(scene, renderer);
G.sky = new Sky(scene);
G.sea = new Sea(scene);
G.weather = new Weather(scene);
G.world = buildWorld(G);
G.areas.world = {
  id: 'world', name: 'Son Fener', indoor: false, showSea: true, minX: -203, maxX: WORLD_MAX_X,
  ground: x => groundY(x), cam: { dist: 16, height: 3.4, look: 1.55, yawX: 1.6 }, refresh() { }, update() { },
};
G.areas.fener_ic = buildLighthouseInterior(G);
G.decor = new Decor();
G.areas.magara = buildCave(G);
G.areas.deniz = buildSeaArea(G);
G.area = G.areas.world;
G.player = new Player();
G.npcs = NPCS.map(d => new NPC(d));
G.nodes = buildNodes();
G.fishing = new Fishing();
G.lamp = new Lamp();
G.night = new Night();
G.sandal = new Sandal();
G.interactables = [...buildInteractions(), ...G.areas.fener_ic.interactables()];

G.world.refreshBoat = () => {
  const b = G.state.boat.level >= 1;
  G.world.extras.playerBoat.visible = b;
  G.world.extras.wreckBoat.visible = !b;
};

// ------------------------------------------------------------ alan geçişleri
// Yalnızca bulunulan alanın sahnesi görünür (diğerleri hem gizli hem çizilmez)
function updateAreaVisibility() {
  for (const a of Object.values(G.areas)) if (a.group) a.group.visible = a === G.area;
  G.world.root.visible = G.area.id === 'world';
}
updateAreaVisibility();

G.setArea = (id, x, floor = 0, z = 0) => {
  if (G.decor.placing) G.decor.cancel(true);
  G.area = G.areas[id];
  updateAreaVisibility();
  G.player.floor = floor;
  G.player.setPos(x, floor, z);
  G.state.player = { area: id, x, floor, z };
  if (id === 'world') G.sandal.placeForPlayer(x);
  G.sea.mesh.visible = G.area.showSea;
  for (const o of [G.sky.dome, G.sky.stars, G.sky.sun, G.sky.moon, G.sky.clouds]) o.visible = !G.area.indoor;
  G.area.refresh?.(G.state);
  if (G.mode === 'beam') G.lamp.exitControl();
  G.camSnap = true;
  G.audio.setAmbient({ indoor: G.area.indoor ? 1 : 0, cave: id === 'magara' ? 1 : 0 });
  G.audio.clearSpots();
  if (id === 'magara' && G.inv.has('el_feneri')) G.player.lanternOn = true;
};

G.changeFloor = (f) => {
  const from = G.player.floor;
  G.audio.stairs(f > from);
  G.mode = 'cutscene';
  G.ui.fade(() => {
    const a = G.areas.fener_ic.arrival(f, from);
    G.player.floor = f;
    G.player.rig.faceYaw = -Math.PI / 2;
    G.player.setPos(a.x, f, a.z);
    G.state.player = { area: 'fener_ic', x: a.x, floor: f, z: a.z };
    G.camSnap = true;
    G.mode = 'play';
    if (f === -1) {
      G.state.flags.enteredBasement = true; G.quests.check();
      if (G.inv.has('el_feneri')) G.player.lanternOn = true;
      else if (!G.state.flags.rep_jenerator) G.ui.toast('Zifiri karanlık. Bir el feneri iyi olurdu...', 'mystery', 4);
      G.audio.setAmbient({ cave: 1 });
      if (!G.state.flags.basementIntro) { G.state.flags.basementIntro = true; setTimeout(() => G.ui.ambientLine('Nem, pas ve tuz kokusu. Aşağıdan dalga sesleri geliyor.'), 600); }
    } else G.audio.setAmbient({ cave: 0 });
    G.ui.zoneTitle(G.areas.fener_ic.floorName(f));
  });
  G.audio.clearSpots();
};

// İşaret fişeği
let flare = null;
G.useFlare = () => {
  if (!G.inv.has('fisek')) { G.ui.toast('İşaret fişeğin yok.', 'warn'); return; }
  if (G.mode !== 'play' || G.area.indoor) { G.ui.toast('Burada fişek ateşleyemezsin.', 'warn'); return; }
  G.inv.remove('fisek', 1);
  G.audio.flare();
  const light = new THREE.PointLight('#ff5030', 0, 40, 1.2);
  light.position.set(G.player.x, G.player.y + 6, 1);
  scene.add(light);
  flare = { light, t: 9 };
  const n = G.night;
  if (n.silState && n.silState !== 'done' && !n.silState.fading) { n.silState.fading = true; G.ui.toast('Kırmızı ışık sahili boyadı. Siluet suyun altına çekildi.', 'mystery', 5); }
  if (n.keeperState && !n.keeperState.walking) n.keeperState.walking = true;
  if (G.state.nightEvent === 'yaratik' && n.crReveal > 0) n.crDone = true;
};

// ------------------------------------------------------------ durum uygulama
function applyState(S) {
  G.state = S;
  G.weather.set(S.weather);
  for (const n of G.nodes) n.refresh();
  for (const a of Object.values(G.areas)) a.refresh?.(S);
  G.world.gates.forest.visible = !S.flags.forestOpen;
  G.world.gates.shipyard.visible = !S.flags.shipyardOpen;
  G.world.refreshBoat();
  G.night.cleanup();
  for (const npc of G.npcs) npc.teleport(G.hour);
  Day.lastHour = Math.floor(G.hour);
  let { area, x, floor, z } = S.player;
  if (area === 'deniz' || !G.areas[area]) { area = 'world'; x = 37; floor = 0; }
  G.sandal.stopDriving();
  if (!S.sandalSide) S.sandalSide = area === 'fener_ic' || (area === 'world' && x > 137) ? 'island' : 'beach';
  if (area === 'world' && x > STRAIT.from && x < STRAIT.to) x = S.sandalSide === 'island' ? STRAIT.to : STRAIT.from;
  G.sandal.syncSide();
  if (area === 'fener_ic') {
    // eski kayıtlar ya da geçersiz konum: yatağın yanında başla
    const fi = G.areas.fener_ic;
    if (z === undefined || floor === undefined || !(floor in { '-1': 1, 0: 1, 1: 1, 2: 1, 3: 1 }) || fi.blocked(floor, x, z)) { const w = fi.wakeSpot(); x = w.x; z = w.z; floor = 0; }
  }
  G.setArea(area, x, floor ?? 0, z ?? 0);
  if (G.hour >= 22 && S.nightEvent) G.night.begin();
}

function startNew() {
  Audio.init();
  const S = newState();
  applyState(S);
  G.mode = 'play';
  G.ui.lastZone = null;
  G.ui.dialog({
    speaker: null,
    lines: [
      'Yolculuk uzun sürdü. Asfalt bitti, toprak yol başladı, sonra o da bitti.',
      'Son Fener. Haritada bile zor bulunan, denize sırtını vermiş küçük bir kasaba.',
      'Yirmi yıldır karanlık bir deniz fenerine bekçi aranıyormuş. Başvuran tek kişi sendin.',
      'Belediye başkanı seni kasabanın girişinde karşılayacağını söylemişti.',
    ],
    onEnd: () => G.ui.toast('[A]/[D] yürü · [E] etkileşim · [Tab] defter. Başkan Hale ile konuş.', 'info', 7),
  });
}

function continueGame() {
  Audio.init();
  const S = loadGame();
  if (!S) { startNew(); return; }
  applyState(S);
  G.mode = 'play';
  G.ui.toast(`Hoş geldin, bekçi. Gün ${S.day}.`, 'info', 3);
}

// ------------------------------------------------------------ kamera
const cam = { x: 0, y: 5, lookX: 0, lookY: 2, dist: 16 };
function updateCamera(dt) {
  if (G.debugCam) { camera.position.copy(G.debugCam.pos); camera.lookAt(G.debugCam.look); return; }
  if (G.mode === 'beam') { G.lamp.beamCamera(camera); return; }
  if (G.mode === 'title') {
    const t = G.t;
    camera.position.set(LIGHTHOUSE_X - 30 + Math.sin(t * 0.05) * 4, 7 + Math.sin(t * 0.07), 22);
    camera.lookAt(LIGHTHOUSE_X - 6, 9, -8);
    return;
  }
  const P = G.player, a = G.area;
  if (a.topdown) {
    // Stardew tarzı kuş bakışı: oda ortası ile oyuncu arasına odaklan
    const cx = a.center(P.floor), small = a.radius(P.floor) < 5;
    const tx = cx + (P.x - cx) * 0.55, tz = P.z * 0.55;
    const hgt = small ? 11 : 12.5, back = small ? 7.4 : 8.4;
    if (G.camSnap) { cam.x = tx; cam.y = tz; G.camSnap = false; }
    cam.x = damp(cam.x, tx, 4, dt); cam.y = damp(cam.y, tz, 4, dt);
    let sx = 0, sy = 0;
    if (G.camShake > 0) { sx = (Math.random() - 0.5) * G.camShake * 0.4; sy = (Math.random() - 0.5) * G.camShake * 0.4; G.camShake = Math.max(0, G.camShake - dt * 1.2); }
    camera.position.set(cam.x + sx, hgt + sy, cam.y + back);
    camera.lookAt(cam.x + sx * 0.5, 0, cam.y - 0.4);
    return;
  }
  const c = a.cam;
  let dist = c.dist, h = c.height;
  let look = c.look;
  if (a.id === 'world') {
    const sea = P.x > 9 ? 1 : (P.x < -138 ? 0.7 : 0.3);
    const z = G.env.night * sea;
    dist -= z * 3.2; h -= z * 0.7;
    // Sinematik kamera bölgeleri: fenerin çevresinde geri çekil, kilisede hafifçe yüksel
    const lhW = clamp(1 - Math.abs(P.x - LIGHTHOUSE_X) / 16, 0, 1);
    const chW = clamp(1 - Math.abs(P.x + 38) / 10, 0, 1);
    const k = lhW * lhW * (3 - 2 * lhW);
    dist += k * 14 + chW * 3; h += k * 1.5 + chW * 1.2; look += k * 7 + chW * 1;
    if (G.mode === 'fishing') { dist -= 2.2; h += 0.3; }
    if (G.mode === 'dialogue' && G.ui.talkingTo) { dist -= 3; h -= 0.6; }
    if (G.mode === 'drive') { dist += 2.5; h += 0.7; }
  }
  const driving = G.mode === 'drive';
  const tx = P.x + (driving ? G.sandal.vx * 0.6 : P.rig.facing * 1.2);
  const ty = P.y + h;
  if (G.camSnap) { cam.x = tx; cam.y = ty; cam.dist = dist; cam.lookX = P.x; cam.lookY = P.y + look; G.camSnap = false; }
  cam.x = damp(cam.x, tx, 3.2, dt);
  cam.y = damp(cam.y, ty, 2.2, dt);
  cam.dist = damp(cam.dist, dist, 1.5, dt);
  cam.lookX = damp(cam.lookX, P.x + (driving ? G.sandal.vx * 0.8 : P.rig.facing * 1.6), 3.2, dt);
  cam.lookY = damp(cam.lookY, P.y + look, 2.2, dt);
  let sx = 0, sy = 0;
  if (G.camShake > 0) { sx = (Math.random() - 0.5) * G.camShake * 0.5; sy = (Math.random() - 0.5) * G.camShake * 0.5; G.camShake = Math.max(0, G.camShake - dt * 1.2); }
  camera.position.set(cam.x + c.yawX + sx, cam.y + sy, P.z + cam.dist);
  camera.lookAt(cam.lookX + sx * 0.5, cam.lookY, P.z - 2);
}

// ------------------------------------------------------------ döngü
let last = performance.now();
let questT = 0, gullT = 6, saveT = 30;
const focus = new THREE.Vector3();

let fpsN = 0, fpsT = 0;
const fpsEl = document.getElementById('fps');
function frame(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;
  fpsN++; fpsT += raw;
  if (fpsT >= 0.5) { if (Settings.data.fps) fpsEl.textContent = `${Math.round(fpsN / fpsT)} FPS`; fpsN = 0; fpsT = 0; }
  G.t += dt;
  G.frameMode = G.mode;

  G.ui.update(dt);
  const playing = G.mode !== 'title' && G.mode !== 'paused';
  if (playing) {
    Day.update(dt);
    G.sandal.update(dt, G.t);
    G.player.update(dt, G.t);
    G.fishing.update(dt, G.t);
    G.night.update(dt, G.t);
    if (G.frameMode === 'play' && G.mode === 'play') updateInteractions();
    else if (G.mode === 'drive') G.ui.prompt(G.sandal.canLeave() ? { force: true, label: '⚓ İskeleye in', x: G.sandal.x, wy: G.sandal.y + 2.7 } : null);
    else G.ui.prompt(null);
    questT -= dt; if (questT <= 0) { questT = 0.5; Quests.check(); }
    saveT -= dt; if (saveT <= 0) { saveT = 30; if (G.mode !== 'drive') { G.state.player.x = G.player.x; G.state.player.z = G.player.z; } }
    G.decor.update(dt);
  } else if (G.mode === 'title') G.sandal.update(dt, G.t);
  if (G.mode !== 'paused') {
    for (const npc of G.npcs) npc.update(dt, G.hour, G.t);
    G.lamp.update(dt, G.t);
  }

  // ışık odağı
  if (G.mode === 'title' || G.mode === 'beam') focus.set(LIGHTHOUSE_X - 10, 4, -4);
  else focus.set(G.player.x, G.player.y, G.player.z ?? 0);

  updateCamera(dt);
  G.world.update(dt, G.t, G.env.night, G.weather);
  G.area.update?.(dt, G.t, G.env.p);
  updateNodes(G.t);
  setWaveScale(G.weather.cur.waves);
  G.sea.update(dt, camera.position.x, G.env.p.seaColor);
  G.env.update(dt, G.hour, G.weather, G.area, focus, { farView: G.mode === 'beam' });
  G.sky.update(dt, camera.position, G.env.p);
  G.weather.update(dt, focus, G.area.ground(G.player.x, G.player), G.area.indoor, Audio, G.env.p.fogColor, G.env.night);

  // ortam sesleri
  if (G.area.id === 'world') {
    const x = G.player.x;
    const waves = x > 9 ? 1 : x < -138 ? 0.85 : x > -20 ? 0.5 : x > -68 ? 0.35 : 0.2;
    Audio.setAmbient({ waves: waves * (0.8 + G.weather.cur.waves * 0.2), night: G.env.night });
    gullT -= dt;
    if (gullT <= 0) { gullT = randRange(7, 16); if (G.env.night < 0.4 && x > 0 && G.weather.cur.rain < 0.4 && playing) Audio.gull(randRange(-0.7, 0.7)); }
  } else if (G.area.id === 'deniz') Audio.setAmbient({ waves: 1.2, night: G.env.night });
  // fenerin içinde deniz sesi yok; yerine konumlu iç mekân sesleri (lighthouse.js)
  else Audio.setAmbient({ waves: G.area.id === 'fener_ic' ? 0 : 0.08, night: G.env.night });
  Audio.update(dt);

  // fişek
  if (flare) {
    flare.t -= dt;
    flare.light.intensity = clamp(flare.t, 0, 1) * 60 * (0.85 + Math.random() * 0.15);
    flare.light.position.y += dt * 0.6;
    if (flare.t <= 0) { scene.remove(flare.light); flare = null; }
  }

  grade.uniforms.time.value = G.t;
  grade.uniforms.night.value = G.area.id === 'magara' ? 0.6 : G.env.night;
  grade.uniforms.flash.value = G.weather.flash * 0.25;
  bloom.strength = (0.45 + G.env.night * 0.35) * (G.area.topdown ? 0.55 : 1);
  // pencere küçültülmüş/gizliyse (sıfır boyut) çizme
  if (innerWidth > 0 && innerHeight > 0) composer.render();
  Input.endFrame();
}

let lastRaf = performance.now();
function loop(now) { lastRaf = performance.now(); frame(now); requestAnimationFrame(loop); }
// Geliştirme: pencere çizilmiyorken (rAF durduğunda) döngüyü zamanlayıcıyla sürdür
if (import.meta.env.DEV) setInterval(() => { if (performance.now() - lastRaf > 150) frame(performance.now()); }, 33);

// ------------------------------------------------------------ başlık ekranı
function title() {
  G.mode = 'title';
  const S = G.state;
  S.time = 13.6 * 60; // 19:36
  S.flags.lampRepaired = true;
  S.lighthouse.lit = true; S.lighthouse.fuel = 99;
  S.weather = 'bulutlu';
  G.weather.set('bulutlu');
  G.sea.mesh.visible = true;
  for (const npc of G.npcs) npc.teleport(G.hour);
  document.getElementById('hud').classList.add('hidden');
  G.ui.showTitle(() => { document.getElementById('hud').classList.remove('hidden'); startNew(); }, () => { document.getElementById('hud').classList.remove('hidden'); continueGame(); });
  // ilk tıklamada ses
  addEventListener('pointerdown', () => Audio.init(), { once: true });
}

// geliştirici kısayolları
addEventListener('keydown', e => {
  if (!G.state || G.mode === 'title') return;
  if (e.code === 'F9') { G.state.time = Math.min(1199, G.state.time + 60); G.ui.toast('⏩ +1 saat', 'info', 1); }
  if (e.code === 'F8') { G.timeScale = G.timeScale === 1 ? 8 : 1; G.ui.toast(`Zaman hızı ×${G.timeScale}`, 'info', 1.5); }
});

if (import.meta.env.DEV) { window.__G = G; import('./dev.js'); }
G.applySettings();
title();
requestAnimationFrame(loop);
