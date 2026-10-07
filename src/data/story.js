// --- GİZEM DEFTERİ: ipuçları ---
export const CLUES = {
  c01: { title: 'Eski Bekçinin Notu', source: 'Fenerin lamba odası', text: '"Son gece denizde bir ışık gördüm. Bizim ışığımıza cevap veriyordu. Üç kısa, bir uzun. Tıpkı 1927 kayıtlarındaki gibi." — A.' },
  c02: { title: 'Aurelia\'nın Seyir Defteri (1927)', source: 'Fenerin gizli odası', text: 'Islak sayfalarda son kayıt: "17 Kasım 1927. Üç gündür sisin içindeyiz. Fener görünmüyor. Mürettebat suda şarkı söyleyen sesler duyduğunu söylüyor." Gemi 14 Kasım\'da battı diye kaydedilmişti.' },
  c03: { title: 'Fotoğraftaki Yabancı', source: 'Belediye (Hale)', text: '1950 tarihli liman açılışı fotoğrafı. İskelenin ucunda bekçi paltolu bir adam duruyor. O yıl fenerin bekçisi yoktu.' },
  c04: { title: 'Jonas\'ın Kayboluşu', source: 'Elias', text: 'Elias\'ın kardeşi Jonas, 1987\'de sisli bir gecede denizdeki bir ışığa doğru açıldı. Aynı gece fenerin bekçisi de kayboldu.' },
  c05: { title: 'Denizden Gelen İzler', source: 'Sahil, gece', text: 'Islak çıplak ayak izleri. Denize giden değil, denizden gelen. Fener sandalının iskelesine kadar uzanıp kayboluyorlar.' },
  c06: { title: 'Resmi Kaza Raporu', source: 'Belediye arşivi (Hale)', text: '"Aurelia fırtınada battı. Enkaz bulunamadı." İmza: Liman Müdürü Viktor Brandt. O gece meteoroloji kaydında fırtına yok.' },
  c07: { title: '1931 Tarihli Mektup', source: 'Marta', text: 'Aurelia mürettebatından birinin yazdığı mektup — gemi "battıktan" dört yıl sonra: "Bizi bekleyin. Işığı yakın. Işığı gören eve döner."' },
  c08: { title: 'Kilise Anma Tahtası', source: 'Eski kilise', text: 'Denizde kaybolanlar: 1927 — Aurelia mürettebatı (31). 1947 — Balıkçı Tom Erling. 1967 — Kaptan Rudi Hale. 1987 — Jonas Varga ve Bekçi Aron Lind. Hepsi Kasım ayında.' },
  c09: { title: 'Hayalet Gemi: AURELIA', source: 'Fener ışığı', text: 'Fenerin ışığı onu bir anlığına aydınlattı: üç direkli, yırtık yelkenli bir gemi. Pruvasında solgun harflerle AURELIA yazıyordu. Işık yeniden döndüğünde orada hiçbir şey yoktu.' },
  c10: { title: 'Agnes\'in Uyarısı', source: 'Agnes', text: '"Herkes fenerin gemileri eve getirmek için yapıldığını sanır. Değil. Bu fener onları uzak tutmak için yapıldı."' },
  c11: { title: 'Kristal Pusula', source: 'Mağaranın dibi', text: 'İbresi her zaman denizin aynı noktasını gösteriyor: batı-güneybatı, ufkun ötesi. Kasasının içine "AURELIA – K.L." kazınmış.' },
  c12: { title: 'Telsiz Kaydı', source: 'Gözlem odası radyosu', text: 'Gece 03:00, 1927 frekansında: "...Aurelia\'dan karaya... konum 48 kuzey... ada... ışığı görüyoruz... bizi bekleyin..." Ardından şarkı söyleyen sesler.' },
  c13: { title: 'Liman Müdürünün Günlüğü', source: 'Tersane ofisi (Tomas)', text: '"Aurelia\'yı batarken görmedim. Kimse görmedi. Sisin içine girdi ve çıkmadı. Belediye bir rapor istedi. İmzaladım."' },
};

// --- Çıkarımlar: iki ipucu birleştirilince ---
export const DEDUCTIONS = [
  { id: 'd1', a: 'c01', b: 'c09', title: 'Cevap Veren Gemi', text: 'Eski bekçinin gördüğü ışık Aurelia\'dan geliyordu. Gemi batmadı. Hâlâ orada ve fenerin ışığına cevap veriyor.', quest: 'q_isaret' },
  { id: 'd2', a: 'c02', b: 'c06', title: 'Sahte Rapor', text: 'Seyir defteri "batıştan" sonraki günlere ait kayıtlar içeriyor. Resmi rapor sahte. Biri gerçeği gizledi.', quest: 'q_itiraf' },
  { id: 'd3', a: 'c04', b: 'c08', title: 'Yirmi Yıllık Döngü', text: 'Her yirmi yılda bir, Kasım\'ın sisli bir gecesinde biri denize çağrılıyor. 1987\'den bu yana tam yirmi yıl geçti.', quest: 'q_dongu' },
  { id: 'd4', a: 'c03', b: 'c05', title: 'Geri Dönenler', text: 'Kaybolanlar tamamen gitmiyor. Fotoğraftaki adam da, denizden gelen izler de aynı şeyi söylüyor: Geri dönüyorlar.', quest: 'q_donenler' },
  { id: 'd5', a: 'c07', b: 'c10', title: 'Işığın İki Yüzü', text: 'Mektup ışığın yanmasını istiyor; Agnes ışığın onları uzak tuttuğunu söylüyor. Işık hem bir kapı hem bir kilit olabilir mi?' },
  { id: 'd6', a: 'c11', b: 'c12', title: 'Koordinatlar', text: 'Pusula ve telsiz aynı noktayı gösteriyor: ufkun ötesindeki uzak ada. Aurelia\'nın yolculuğu orada bitti.', quest: 'q_ada' },
];

// --- GÖREVLER ---
// steps: sırayla değerlendirilir; done(s, G) true dönerse işaretlenir. Tüm adımlar bitince ödül.
export const QUESTS = {
  q_start: {
    title: 'Yeni Bekçi', giver: 'Başkan Hale',
    desc: 'Kasabaya yeni geldin. Fenerin anahtarlarını almak için belediye binasında Başkan Hale\'yi bul.',
    steps: [{ text: 'Belediyede Başkan Hale ile konuş', done: s => s.flags.hasKey }],
    reward: { money: 50 }, next: ['q_fener'],
  },
  q_fener: {
    title: 'Fenere Giden Yol', giver: 'Başkan Hale',
    desc: 'Deniz feneri kasabanın doğusunda, sahilin bittiği kayalıkların üzerinde.',
    steps: [{ text: 'Deniz fenerine gir', done: s => s.flags.enteredLighthouse }],
    reward: { xp: ['kesif', 20] }, next: ['q_lamba', 'q_olta'],
  },
  q_lamba: {
    title: 'Işığı Geri Getir', giver: 'Fener',
    desc: 'Fenerin lambası yıllardır kırık. Sahilden malzeme toplayıp lamba odasında onar. (4 Hurda Metal, 3 Deniz Camı, 2 Odun)',
    steps: [
      { text: '4 Hurda Metal topla', done: (s, G) => s.flags.lampRepaired || G.inv.count('hurda') >= 4 },
      { text: '3 Deniz Camı topla', done: (s, G) => s.flags.lampRepaired || G.inv.count('deniz_cami') >= 3 },
      { text: '2 Odun topla', done: (s, G) => s.flags.lampRepaired || G.inv.count('odun') >= 2 },
      { text: 'Lamba odasında lambayı onar', done: s => s.flags.lampRepaired },
    ],
    reward: { money: 60, xp: ['fener', 30], items: [['lamba_yagi', 2]] }, next: ['q_ilkgece'],
  },
  q_ilkgece: {
    title: 'İlk Gece', giver: 'Fener',
    desc: 'Akşam olunca (17:00 sonrası) lamba odasına çık, lambaya yağ ekle ve feneri yak.',
    steps: [{ text: 'Feneri yak', done: s => s.flags.litOnce }, { text: 'Lamba odasındaki eski notu oku', done: s => s.clues.includes('c01') }],
    reward: { xp: ['fener', 25] }, next: ['q_orman', 'q_defter'],
  },
  q_olta: {
    title: 'Denizin Dili', giver: 'Elias',
    desc: 'İskelede balık tutan Elias\'tan balık tutmayı öğren. (Ya da atölyede kendi oltanı yap.)',
    steps: [
      { text: 'Bir olta edin', done: (s, G) => G.inv.has('olta1') || G.inv.has('olta2') || G.inv.has('olta3') },
      { text: '3 balık yakala', done: s => (s.stats.totalFish ?? 0) >= 3 },
    ],
    reward: { money: 30, items: [['solucan', 6]], pts: { elias: 40 } },
  },
  q_defter: {
    title: 'Parçaları Birleştir', giver: 'Gizem Defteri',
    desc: 'Gizem Defteri\'nde (J) iki ipucunu seçip birleştir. Doğru bağlantılar yeni gerçekleri ortaya çıkarır.',
    steps: [{ text: 'İlk çıkarımını yap', done: s => s.deductions.length >= 1 }],
    reward: { xp: ['kesif', 30], money: 40 },
  },
  q_orman: {
    title: 'Ormanın Yolu', giver: 'İvo',
    desc: 'Kasabanın batısındaki orman yolu devrilmiş bir ağaçla kapalı. Bir balta yap ve yolu aç.',
    steps: [
      { text: 'Balta üret', done: (s, G) => G.inv.has('balta') },
      { text: 'Devrilmiş ağacı kes', done: s => s.flags.forestOpen },
    ],
    reward: { xp: ['kesif', 30] }, next: ['q_magara'],
  },
  q_magara: {
    title: 'Karanlığa Işık', giver: 'İvo',
    desc: 'Ormandaki eski maden mağarası zifiri karanlık. Bir el feneri yap ve içeri gir. İvo bir şey attığını söylemişti...',
    steps: [
      { text: 'El feneri üret', done: (s, G) => G.inv.has('el_feneri') },
      { text: 'Mağaraya gir', done: s => s.flags.enteredCave },
    ],
    reward: { xp: ['kesif', 40] }, next: ['q_tersane', 'q_l2'],
  },
  q_tersane: {
    title: 'Paslı Kapılar', giver: 'İvo',
    desc: 'Ormanın ötesindeki eski tersanenin yolu molozla kapalı. Bir kazma yap ve yolu aç.',
    steps: [
      { text: 'Kazma üret', done: (s, G) => G.inv.has('kazma') },
      { text: 'Moloz yığınını temizle', done: s => s.flags.shipyardOpen },
    ],
    reward: { xp: ['kesif', 40], money: 80 },
  },
  q_l2: {
    title: 'Bekçinin Evi', giver: 'Fener',
    desc: 'Fener harap durumda. Zemin kattaki geliştirme panosundan feneri 2. seviyeye yükselt.',
    steps: [{ text: 'Feneri Seviye 2\'ye yükselt', done: s => s.lighthouse.level >= 2 }],
    reward: { xp: ['fener', 40] }, next: ['q_l3'],
  },
  q_l3: {
    title: 'Fenerin Kalbi', giver: 'Fener',
    desc: 'Atölye katı ve gizli oda. Feneri 3. seviyeye yükselt.',
    steps: [{ text: 'Feneri Seviye 3\'e yükselt', done: s => s.lighthouse.level >= 3 }],
    reward: { xp: ['fener', 60] }, next: ['q_l4'],
  },
  q_l4: {
    title: 'Ufkun Ötesini Dinle', giver: 'Fener',
    desc: 'Bir radyo ve iki fener merceği üret, gözlem odasını aç.',
    steps: [{ text: 'Feneri Seviye 4\'e yükselt', done: s => s.lighthouse.level >= 4 }],
    reward: { xp: ['fener', 80] },
  },
  // --- NPC görevleri (5 kalp) ---
  q_jonas: {
    title: 'Jonas\'ın Ağı', giver: 'Elias',
    desc: 'Elias\'ın kardeşinin ağı eski tersanedeki terk edilmiş denizci kulübesinde olmalı.',
    steps: [
      { text: 'Denizci kulübesinde ağı bul', done: (s, G) => G.inv.has('jonas_agi') || s.flags.gaveNet },
      { text: 'Ağı Elias\'a götür', done: s => s.flags.gaveNet },
    ],
    reward: { pts: { elias: 100 }, xp: ['kesif', 50] },
  },
  q_marta: {
    title: 'Büyükannenin Reçeli', giver: 'Marta',
    desc: 'Marta\'ya 3 Yabani Meyve ve 2 Mantar götür.',
    steps: [{ text: '3 Yabani Meyve ve 2 Mantar ver', done: s => s.flags.martaJam }],
    reward: { pts: { marta: 100 }, money: 100 },
  },
  q_tomas: {
    title: 'Babanın Günlüğü', giver: 'Tomas',
    desc: 'Liman müdürünün günlüğü eski tersanenin ofisinde kilitli kalmış.',
    steps: [{ text: 'Tersane ofisinde günlüğü bul', done: s => s.flags.foundLog }, { text: 'Günlüğü Tomas\'a götür', done: s => s.flags.gaveLog }],
    reward: { pts: { tomas: 100 } },
  },
  q_agnes: {
    title: 'Saf Kristal', giver: 'Agnes',
    desc: 'Agnes mağaradan bir kristal istiyor.',
    steps: [{ text: 'Agnes\'e bir Kristal ver', done: s => s.flags.agnesCrystal }],
    reward: { pts: { agnes: 100 } },
  },
  q_ivo: {
    title: 'Bakır Çekirdek', giver: 'İvo',
    desc: 'İvo\'ya 4 Bakır Cevheri ve 1 Gemi Parçası götür.',
    steps: [{ text: 'Malzemeleri İvo\'ya ver', done: s => s.flags.ivoMotor }],
    reward: { pts: { ivo: 100 } },
  },
  q_hale: {
    title: 'Yedi Gece', giver: 'Hale',
    desc: 'Feneri yedi gece üst üste yak (gece boyunca en az %75 yanmalı).',
    steps: [{ text: 'Üst üste yanan gece: ', done: s => (s.stats.litStreak ?? 0) >= 7, progress: s => `${Math.min(7, s.stats.litStreak ?? 0)}/7` }],
    reward: { pts: { hale: 100 }, money: 300 },
  },
  q_tekne: {
    title: 'Bir Tekne', giver: 'İvo',
    desc: 'İskelenin ucundaki eski tekneyi onar. Malzemeleri topla ve iskeledeki tekne direğinden onarımı başlat.',
    steps: [{ text: 'Tekneyi onar (iskele ucu)', done: s => s.boat.level >= 1 }],
    reward: { xp: ['kesif', 60] },
  },
  // --- Çıkarım görevleri ---
  q_isaret: {
    title: 'Işıkla Konuş', giver: 'Gizem',
    desc: 'Aurelia fenerin ışığına cevap veriyor. Uzakta bir ışık ya da gemi belirdiğinde fenerin ışığını ona çevir. (Lamba odasında "Feneri Yönet")',
    steps: [{ text: 'Denizdeki ışığa fenerle cevap ver', done: s => s.flags.answeredLight }],
    reward: { xp: ['fener', 60], items: [['gizemli_obje', 1]] },
  },
  q_itiraf: {
    title: 'Sahte Rapor', giver: 'Gizem',
    desc: 'Raporu imzalayan Viktor Brandt, Tomas\'ın babası. Tomas\'a Aurelia\'yı sor. (En az 3 kalp gerekir.)',
    steps: [{ text: 'Tomas\'la Aurelia hakkında konuş', done: s => s.flags.tomasConfessed }],
    reward: { pts: { tomas: 60 } },
  },
  q_dongu: {
    title: 'Yirmi Yıllık Döngü', giver: 'Gizem',
    desc: 'Bu yıl döngünün yirminci yılı. Hazırlan: feneri Seviye 3\'e yükselt ve depoda en az 3 Lamba Yağı tut. Sonra Agnes\'le konuş.',
    steps: [
      { text: 'Fener Seviye 3', done: s => s.lighthouse.level >= 3 },
      { text: '3 Lamba Yağı bulundur', done: (s, G) => G.inv.count('lamba_yagi') >= 3 || s.flags.dunguAgnes },
      { text: 'Agnes\'le konuş', done: s => s.flags.dunguAgnes },
    ],
    reward: { pts: { agnes: 60 }, xp: ['fener', 50] },
  },
  q_donenler: {
    title: 'Geri Dönenler', giver: 'Gizem',
    desc: 'Fotoğraftaki adam kim? Gece iskelenin ucunu gözle. (Gece 23:00 sonrası iskele ucunda bekle.)',
    steps: [{ text: 'Gece iskelenin ucunda bekle', done: s => s.flags.sawKeeper }],
    reward: { xp: ['kesif', 60] },
  },
  q_ada: {
    title: 'Uzak Ada', giver: 'Gizem',
    desc: 'Koordinatlar ufkun ötesindeki adayı gösteriyor. Fener Seviye 5 ve Tekne Seviye 5 ile oraya bir rota çiz.',
    steps: [
      { text: 'Fener Seviye 5', done: s => s.lighthouse.level >= 5 },
      { text: 'Tekne Seviye 5', done: s => s.boat.level >= 5 },
      { text: 'Uzak Ada\'ya git', done: s => s.flags.reachedIsland },
    ],
    reward: { xp: ['kesif', 200] },
  },
};
