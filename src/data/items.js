// Tüm eşya tanımları. cat: kaynak | balik | alet | yem | tuketim | hikaye | parca
export const ITEMS = {
  // --- Sahil ---
  odun: { name: 'Odun', icon: '🪵', cat: 'kaynak', price: 4, desc: 'Kuru dal ve kütük. Her şeyin başlangıcı.' },
  deniz_kabugu: { name: 'Deniz Kabuğu', icon: '🐚', cat: 'kaynak', price: 6, desc: 'Kulağına tutunca bir şey fısıldıyor gibi.' },
  tas: { name: 'Taş', icon: '🪨', cat: 'kaynak', price: 3, desc: 'Sıradan, sağlam bir taş.' },
  hurda: { name: 'Hurda Metal', icon: '🔩', cat: 'kaynak', price: 8, desc: 'Paslı ama işe yarar.' },
  gemi_parcasi: { name: 'Gemi Parçası', icon: '⚓', cat: 'kaynak', price: 28, desc: 'Üzerinde silinmiş harfler var.' },
  deniz_cami: { name: 'Deniz Camı', icon: '💠', cat: 'kaynak', price: 10, desc: 'Dalgaların yuvarladığı yeşil cam.' },
  halat: { name: 'Halat', icon: '🪢', cat: 'kaynak', price: 7, desc: 'Tuzlu suyla sertleşmiş eski halat.' },
  // --- Orman ---
  mantar: { name: 'Mantar', icon: '🍄', cat: 'kaynak', price: 12, desc: 'Nemli toprakta biter.' },
  bitki: { name: 'Şifalı Bitki', icon: '🌿', cat: 'kaynak', price: 8, desc: 'Agnes bunlardan çay yapar.' },
  recine: { name: 'Reçine', icon: '🍯', cat: 'kaynak', price: 9, desc: 'Çam ağacından süzülen yapışkan altın.' },
  meyve: { name: 'Yabani Meyve', icon: '🫐', cat: 'kaynak', price: 7, desc: 'Ekşi ve tatlı.' },
  // --- Mağara ---
  demir: { name: 'Demir Cevheri', icon: '⚙️', cat: 'kaynak', price: 15, desc: 'Ağır ve soğuk.' },
  bakir: { name: 'Bakır Cevheri', icon: '🟠', cat: 'kaynak', price: 18, desc: 'Turuncu damarlı.' },
  kristal: { name: 'Kristal', icon: '💎', cat: 'kaynak', price: 45, desc: 'Karanlıkta hafifçe parlıyor.' },
  eski_esya: { name: 'Eski Eşya', icon: '🏺', cat: 'kaynak', price: 40, desc: 'Kime ait olduğu belli değil.' },
  // --- Deniz ---
  yosun: { name: 'Yosun', icon: '🌱', cat: 'kaynak', price: 1, desc: 'Kaygan ve işe yaramaz.' },
  eski_bot: { name: 'Eski Bot', icon: '🥾', cat: 'kaynak', price: 1, desc: 'Birinin botu. Diğer teki nerede?' },
  hazine: { name: 'Eski Sikke', icon: '🪙', cat: 'kaynak', price: 120, desc: '1920\'lerden kalma bir sikke.' },
  gizemli_obje: { name: 'Gizemli Obje', icon: '🔮', cat: 'kaynak', price: 90, desc: 'Ne olduğunu kimse bilmiyor. Hafifçe ılık.' },

  // --- Aletler ---
  olta1: { name: 'Basit Olta', icon: '🎣', cat: 'alet', price: 0, tier: 1, desc: 'Bambu sap, eski makara.' },
  olta2: { name: 'Gelişmiş Olta', icon: '🎣', cat: 'alet', price: 0, tier: 2, desc: 'Daha sağlam misina, daha hızlı makara.' },
  olta3: { name: 'Usta Olta', icon: '🎣', cat: 'alet', price: 0, tier: 3, desc: 'Kristal kılavuzlu. Derinlerdekini bile çeker.' },
  balta: { name: 'Basit Balta', icon: '🪓', cat: 'alet', price: 0, desc: 'Ağaç kesmek için.' },
  kazma: { name: 'Kazma', icon: '⛏️', cat: 'alet', price: 0, desc: 'Kaya ve cevher kırmak için.' },
  el_feneri: { name: 'El Feneri', icon: '🏮', cat: 'alet', price: 0, desc: 'Gaz lambası. [L] ile yak/söndür.' },
  ag: { name: 'Balık Ağı', icon: '🕸️', cat: 'alet', price: 0, desc: 'İskeleye kur, ertesi gün topla.' },
  dalis: { name: 'Dalış Takımı', icon: '🤿', cat: 'alet', price: 0, desc: 'Kısa süreli dalışlar için.' },

  // --- Parçalar / Ara ürünler ---
  lamba_yagi: { name: 'Lamba Yağı', icon: '🛢️', cat: 'parca', price: 22, desc: 'Fener lambasını besler.' },
  radyo: { name: 'Radyo', icon: '📻', cat: 'parca', price: 150, desc: 'Fenerin gözlem odası için.' },
  harita_cihazi: { name: 'Navigasyon Cihazı', icon: '🧭', cat: 'parca', price: 260, desc: 'Uzak denizlere rota çizer.' },
  mercek: { name: 'Fener Merceği', icon: '🔍', cat: 'parca', price: 120, desc: 'Işığı kilometrelerce taşır.' },
  tekne_parcasi: { name: 'Tekne Parçası', icon: '🛶', cat: 'parca', price: 60, desc: 'Tekne geliştirmeleri için.' },
  fisek: { name: 'İşaret Fişeği', icon: '🧨', cat: 'tuketim', price: 25, desc: '[G] ile ateşle. Karanlıktaki şeyleri dağıtır.' },
  buyuk_canta: { name: 'Büyük Çanta', icon: '🎒', cat: 'tuketim', price: 0, desc: 'Kullanınca envanter +6 yuva.' },
  sandik: { name: 'Sandık', icon: '📦', cat: 'parca', price: 0, desc: 'Fenerde depolama.' },

  // --- Yem ---
  solucan: { name: 'Solucan', icon: '🪱', cat: 'yem', price: 3, desc: 'Yem. Balıklar daha çabuk vurur.' },
  karides: { name: 'Karides Yemi', icon: '🦐', cat: 'yem', price: 8, desc: 'Yem. Büyük balıkları cezbeder.' },
  parlak_yem: { name: 'Parlak Yem', icon: '✨', cat: 'yem', price: 20, desc: 'Yem. Gece balıkları buna dayanamaz.' },

  // --- Hikâye ---
  fener_anahtari: { name: 'Fener Anahtarı', icon: '🗝️', cat: 'hikaye', price: 0, desc: 'Ağır, pirinç bir anahtar. Üzerinde "1889" yazıyor.' },
  jonas_agi: { name: 'Jonas\'ın Ağı', icon: '🧶', cat: 'hikaye', price: 0, desc: 'Yirmi yıldır kurumamış gibi nemli.' },
  kristal_pusula: { name: 'Kristal Pusula', icon: '🧿', cat: 'hikaye', price: 0, desc: 'İbresi kuzeyi değil, denizi gösteriyor.' },
};

export function itemName(id) { return ITEMS[id]?.name ?? id; }
export function itemIcon(id) { return ITEMS[id]?.icon ?? '❔'; }
