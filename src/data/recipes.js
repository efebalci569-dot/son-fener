// Üretim tarifleri. in: [[itemId, adet]] veya [{tag:'balik'}, adet]
// unlock(s): tarifin listede görünme koşulu. station: 'any' | 'atolye3' (fener atölyesi Lv3)
export const RECIPES = [
  // --- Başlangıç ---
  { id: 'r_olta1', out: 'olta1', n: 1, in: [['odun', 3], ['hurda', 2]], xp: 8, unlock: () => true, once: true },
  { id: 'r_balta', out: 'balta', n: 1, in: [['odun', 2], ['tas', 3]], xp: 8, unlock: () => true, once: true },
  { id: 'r_kazma', out: 'kazma', n: 1, in: [['odun', 2], ['hurda', 2], ['tas', 2]], xp: 10, unlock: () => true, once: true },
  { id: 'r_fener', out: 'el_feneri', n: 1, in: [['hurda', 2], ['deniz_cami', 2], ['lamba_yagi', 1]], xp: 12, unlock: () => true, once: true },
  { id: 'r_ag', out: 'ag', n: 1, in: [['halat', 3], ['odun', 2]], xp: 10, unlock: () => true, once: true },
  { id: 'r_sandik', out: 'sandik', n: 1, in: [['odun', 8], ['hurda', 2]], xp: 10, unlock: s => s.lighthouse.level >= 2 && !s.hasChest, once: true },
  { id: 'r_yag_balik', out: 'lamba_yagi', n: 1, in: [[{ tag: 'balik' }, 2]], xp: 4, unlock: () => true, label: 'Lamba Yağı (balıktan)' },
  { id: 'r_yag_recine', out: 'lamba_yagi', n: 1, in: [['recine', 3]], xp: 4, unlock: () => true, label: 'Lamba Yağı (reçineden)' },
  { id: 'r_fisek', out: 'fisek', n: 2, in: [['recine', 1], ['hurda', 1]], xp: 4, unlock: s => s.skillsLv.crafting >= 2 },
  { id: 'r_solucan', out: 'solucan', n: 5, in: [['bitki', 1]], xp: 2, unlock: s => s.lighthouse.level >= 3, label: 'Solucan ×5 (yem tezgâhı)' },
  { id: 'r_parlak', out: 'parlak_yem', n: 3, in: [['kristal', 1], ['deniz_kabugu', 2]], xp: 6, unlock: s => s.lighthouse.level >= 3 },

  // --- İleri seviye ---
  { id: 'r_olta2', out: 'olta2', n: 1, in: [['demir', 3], ['bakir', 2], ['recine', 2]], xp: 20, unlock: s => s.skillsLv.crafting >= 3, once: true },
  { id: 'r_dalis', out: 'dalis', n: 1, in: [['demir', 4], ['deniz_cami', 3], ['halat', 2], ['kristal', 1]], xp: 25, unlock: s => s.skillsLv.crafting >= 4 || s.lighthouse.level >= 3, once: true },
  { id: 'r_radyo', out: 'radyo', n: 1, in: [['bakir', 3], ['kristal', 2], ['hurda', 3]], xp: 25, unlock: s => s.lighthouse.level >= 3 },
  { id: 'r_mercek', out: 'mercek', n: 1, in: [['kristal', 2], ['deniz_cami', 4]], xp: 20, unlock: s => s.lighthouse.level >= 3 },
  { id: 'r_harita', out: 'harita_cihazi', n: 1, in: [['kristal', 2], ['bakir', 3], ['gizemli_obje', 1]], xp: 35, unlock: s => s.lighthouse.level >= 4 },
  { id: 'r_tekne', out: 'tekne_parcasi', n: 1, in: [['odun', 6], ['halat', 2], ['demir', 2]], xp: 15, unlock: s => s.boat.level >= 1 || s.flags.boatQuest },
  { id: 'r_olta3', out: 'olta3', n: 1, in: [['kristal', 3], ['demir', 4], ['gizemli_obje', 1]], xp: 40, unlock: s => s.skillsLv.crafting >= 7, once: true },
];

// Mobilyalar (her çalışma masasında)
RECIPES.push(
  { id: 'm_sandalye', out: 'sandalye', n: 1, in: [['odun', 4]], xp: 4, unlock: () => true },
  { id: 'm_masa', out: 'masa', n: 1, in: [['odun', 7]], xp: 5, unlock: () => true },
  { id: 'm_saksi', out: 'saksi', n: 1, in: [['bitki', 2], ['tas', 1]], xp: 4, unlock: () => true },
  { id: 'm_fici', out: 'fici', n: 1, in: [['odun', 5], ['hurda', 1]], xp: 4, unlock: () => true },
  { id: 'm_hali', out: 'hali', n: 1, in: [['halat', 3], ['bitki', 2]], xp: 6, unlock: () => true },
  { id: 'm_kabuk', out: 'kabuk_rafi', n: 1, in: [['odun', 3], ['deniz_kabugu', 5]], xp: 6, unlock: () => true },
  { id: 'm_lamba', out: 'gaz_lambasi', n: 1, in: [['hurda', 2], ['deniz_cami', 1], ['lamba_yagi', 1]], xp: 6, unlock: () => true },
  { id: 'm_kitaplik', out: 'kitaplik', n: 1, in: [['odun', 8], ['eski_esya', 1]], xp: 8, unlock: () => true },
  { id: 'm_maket', out: 'gemi_maketi', n: 1, in: [['odun', 3], ['halat', 1], ['gemi_parcasi', 1]], xp: 8, unlock: () => true },
  { id: 'm_koltuk', out: 'koltuk', n: 1, in: [['odun', 6], ['halat', 3]], xp: 8, unlock: s => s.lighthouse.level >= 2 },
  { id: 'm_akvaryum', out: 'akvaryum', n: 1, in: [['deniz_cami', 4], ['hurda', 2], [{ tag: 'balik' }, 2]], xp: 10, unlock: s => s.lighthouse.level >= 2 },
  { id: 'm_fener', out: 'fener_maketi', n: 1, in: [['kristal', 1], ['deniz_cami', 3], ['tas', 2]], xp: 10, unlock: s => s.lighthouse.level >= 3 },
);
// Yemekler (onarılmış sobada)
RECIPES.push(
  { id: 'y_corba', out: 'corba', n: 1, in: [[{ tag: 'balik' }, 2], ['bitki', 1]], xp: 5, station: 'soba', unlock: () => true },
  { id: 'y_sote', out: 'sote', n: 1, in: [['mantar', 2], ['bitki', 1]], xp: 5, station: 'soba', unlock: () => true },
  { id: 'y_recel', out: 'recel', n: 1, in: [['meyve', 3]], xp: 4, station: 'soba', unlock: () => true },
  { id: 'y_cay', out: 'cay', n: 2, in: [['bitki', 2]], xp: 3, station: 'soba', unlock: () => true },
);

// Fener geliştirmeleri
export const LIGHTHOUSE_UPGRADES = {
  2: { cost: { odun: 20, tas: 10, hurda: 6 }, money: 300, title: 'Bekçinin Evi', perks: ['Yeni yatak', 'Depolama sandığı tarifi', 'Basit çalışma masası', 'Daha güçlü ışık'] },
  3: { cost: { odun: 30, tas: 15, demir: 10, kristal: 2 }, money: 600, title: 'Atölye Katı', perks: ['Atölye + yem tezgâhı', 'Balık ekipmanları', 'Harita masası', 'Gizli oda'] },
  4: { cost: { demir: 10, bakir: 8, radyo: 1, mercek: 2 }, money: 1000, title: 'Gözlem Odası', perks: ['Gözlem teleskobu', 'Radyo sistemi', 'Eski deniz kayıtları'] },
  5: { cost: { kristal: 6, demir: 15, harita_cihazi: 1, mercek: 2 }, money: 2000, title: 'Son Fener', perks: ['Gelişmiş fener', 'Büyük ışık menzili', 'Navigasyon sistemi'] },
};

export const BOAT_UPGRADES = {
  1: { cost: { odun: 12, halat: 4, demir: 4, gemi_parcasi: 2 }, money: 400, title: 'Küçük Balıkçı Teknesi', perk: 'Açık denize çıkabilirsin (Derin Su balıkları).' },
  2: { cost: { tekne_parcasi: 2, demir: 4, bakir: 3 }, money: 500, title: 'Daha Büyük Motor', perk: 'Yolculuklar daha kısa sürer.' },
  3: { cost: { tekne_parcasi: 3, odun: 10 }, money: 600, title: 'Geniş Depo', perk: 'Envanter +6 yuva.' },
  4: { cost: { tekne_parcasi: 3, dalis: 1, halat: 4 }, money: 800, title: 'Dalış Platformu', perk: 'Batık gemiye ulaşabilirsin.' },
  5: { cost: { tekne_parcasi: 4, harita_cihazi: 1, mercek: 1 }, money: 1500, title: 'Uzak Sular', perk: 'Uzak adaya rota çizilebilir.' },
};
