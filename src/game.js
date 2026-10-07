// Tüm modüllerin paylaştığı oyun bağlamı
export const G = {
  state: null,
  scene: null, camera: null, renderer: null, composer: null,
  env: null, sky: null, sea: null, weather: null, world: null,
  areas: {}, area: null,
  player: null, npcs: [], nodes: [], interactables: [],
  ui: null, audio: null,
  inv: null, skills: null, rel: null, quests: null, mystery: null, fishing: null, lamp: null, night: null, craft: null, day: null,
  mode: 'title', // title | play | dialogue | panel | fishing | beam | cutscene | dive
  t: 0,
  timeScale: 1,
  get hour() { return 6 + this.state.time / 60; },
  get hh() { return (6 + this.state.time / 60) % 24; },
};

// Bu karede başka bir arayüz kapanmışsa (aynı tuş) oyuncu eylemi tetiklenmesin
export function canAct() { return G.mode === 'play' && G.frameMode === 'play'; }
export function timeRuns() { return G.mode === 'play' || G.mode === 'fishing' || G.mode === 'beam' || G.mode === 'dive' || G.mode === 'drive'; }
