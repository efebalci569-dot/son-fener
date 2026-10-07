# Son Fener

2.5D keşif, yaşam simülasyonu, üretim ve atmosferik gizem oyunu. Bu depo, tasarım belgesindeki sistemlerin oynanabilir bir **dikey dilimini** içerir.

🎮 **Hemen oyna:** https://efebalci569-dot.github.io/son-fener/

Tarayıcıda çalışır (Three.js + Vite). Tüm 3D modeller, dokular, müzik ve ses efektleri gerçek zamanlı olarak **kodla üretilir**. Harici bir asset dosyası yoktur.

## Çalıştırma

```bash
npm install
npm run dev
```

Ardından `http://localhost:5173` adresini aç. Kalıcı bir sürüm için `npm run build` komutunu çalıştır. Çıktı `dist/` klasörüne yazılır.

## Kontroller

| Tuş | İşlev |
|---|---|
| A / D (← / →) | Yürü |
| Shift | Koş |
| Boşluk / W | Zıpla |
| E | Etkileşim (konuş, topla, kapı, olta...) |
| Tab / I | Bekçinin Defteri (envanter, görevler, ilişkiler...) |
| J | Gizem Defteri |
| L | El fenerini yak / söndür |
| G | İşaret fişeği ateşle |
| M | Müzik aç / kapa |
| Esc | Menü |

**Balık tutma:** Boşluğu basılı tutup bırakarak oltayı at. Şamandıra batınca Boşluk ile kancala. Ardından Boşluğu basılı tutup makarayı sar; balık çekerken (kırmızı uyarı) bırakıp misinayı gevşet. Gerilim taşarsa misina kopar.

**Fenerin içi (kuş bakışı):** İçeride W/A/S/D ile her yöne yürürsün. Çöp yığınlarını temizle, kırık soba/saat/pencere/döşeme/boru/jeneratörü malzemeyle onar. Mobilyaları çalışma masasında üret; envanterden tıklayarak ya da `B` tuşuyla yerleştir (fare ile konum, `R`/sağ tık döndür, tık/`E` koy). Yerleştirilen eşyaya `E` ile döndür/taşı/topla. Onarılan sobada yemek pişir. Zemin kattaki kapaktan **bodruma** inebilirsin... ama geceleri dikkatli ol.

**Sandal:** Fener ayrı bir adada. Sahilin sonundaki iskelede `E` ile sandala bin, A/D ile gaz ver (Shift: tam yol), karşı iskeleye yanaşınca `E` ile in.

**Fener:** Akşam (17:00 sonrası) lamba odasına çık, yağ ekle ve feneri yak. "Feneri yönet" seçeneğiyle ışığı A/D ile kendin çevirebilirsin. Bazı geceler ışık denizde bir şeyler gösterir.

Geliştirici kısayolları: `F9` saati 1 saat ileri alır, `F8` zamanı 8 kat hızlandırır.

## Bu sürümde olanlar

- **2.5D dünya:** Eski Tersane → Orman (mağara) → Kasaba → Balıkçı İskelesi → Sahil → Fener Boğazı (sandalla) → Fener Adası.
- **Ayarlar:** Grafik (kalite hazır ayarları, çözünürlük, gölgeler, ışıma, gren, kamera sarsıntısı, FPS), ses (ana ses, müzik, efekt, ortam) ve oyun (gün uzunluğu). Başlık ekranından ve Esc menüsünden açılır. Katmanlı derinlik, parallax, sinematik kamera bölgeleri (fenerde geri çekilir, gece denize yakınken yakınlaşır, diyalogda odaklanır).
- **Gündüz/gece döngüsü:** 06:00–02:00, dinamik ışık, gökyüzü, yıldızlar, ay ve sokak lambaları. 02:00'de bayılma ve sabah raporu.
- **Hava sistemi:** Açık, bulutlu, yağmurlu, sisli ve fırtınalı (şimşek) hava. Balıkları ve NPC programlarını etkiler.
- **Fenerin içi (Stardew tarzı):** Kuş bakışı yuvarlak 5 kat (Bodrum, Zemin, Atölye, Gözlem, Lamba Odası), 14 yerleştirilebilir mobilya, 7 tamir edilebilir nesne, temizlenebilir eşya yığınları ve sobada 4 yemek tarifi.
- **Bodrum (korku):** Denize açılan demir kapak, geceleri alttan gelen vuruşlar, damlayan boru, seni izleyen dalış miğferi, örtülü ayna, duvardaki çentikler, fareler ve fısıltılar. Yeni ipuçları ve "Kapağı Mühürle" görevi.
- **Deniz feneri:** Kırık lambayı onarma, yağ ekonomisi, dönen hacimli ışık hüzmesi, elle yönetme modu, 5 seviyeli geliştirme (yatak, sandık, atölye, gizli oda, gözlem odası, radyo, teleskop) ve kesit görünümlü 4 katlı iç mekân.
- **NPC'ler (6 + taşınan 1):** Elias, Marta, Tomas, Agnes, İvo, Başkan Hale ve sonradan kasabaya taşınan Selin. Her birinin günlük rutini, kişiliği, sevdiği ve sevmediği şeyler, sırları ve 0–6 kalp ilişki sistemi var. 4 kalpte sırlar, 5 kalpte özel görev, 6 kalpte karakter hikâyesi açılır.
- **Kaynaklar:** 20 tür toplama noktası (odun, kabuk, deniz camı, hurda, enkaz, mantar, reçine, demir, bakır, kristal...) günlük yenilenir. Gizli noktalar Keşif Lv.5'te haritada görünür.
- **Üretim:** Olta, balta, kazma, el feneri, ağ, sandık, lamba yağı, fişek, dalış takımı, radyo, mercek, navigasyon cihazı ve tekne parçaları.
- **Balıkçılık:** 15 tür balık (+çöp). Bölge, saat, hava, yem, olta kalitesi ve gece olaylarına bağlı. Gerilim ve çekiş ritmine dayalı özgün bir mini oyun. Ağ ve dalış da var.
- **Tekne:** İskeledeki eski tekneyi onarıp 5 seviyede geliştirme. Açık deniz, batık gemi (dalış) ve uzak ada.
- **Gece olayları:** Rastgele tablo (sakin gece, sis, fısıltılar, ayak izleri, siluet, uzak ışık, hayalet gemi, kaybolan komşu, fener arızası, yaratık, özel olay). Korku, saldırı yerine "burada bir şeyler yanlış" hissinden gelir.
- **Gizem Defteri:** 13 ipucu ve 6 çıkarım. İki ipucunu birleştirmek yeni gerçekleri ve görevleri açar.
- **Yetenekler:** Balıkçılık, Keşif, Üretim, Dalış ve Fener Bakımı (1–10) ile seviye avantajları.
- **Kayıt:** Her sabah otomatik kayıt (localStorage) ve menüden elle kayıt.

## Proje yapısı

```
src/
  main.js              render hattı (bloom + renk düzenleme), kamera, döngü
  game.js              paylaşılan oyun bağlamı
  core/                girdi, kayıt, prosedürel ses motoru, yardımcılar
  data/                eşyalar, balıklar, tarifler, NPC'ler, hikâye (ipucu/görev)
  world/               arazi, deniz, gökyüzü, hava, ışık paleti, modeller, iç mekânlar
  entities/            oyuncu, NPC, kaynak noktaları, karakter iskeleti
  systems/             envanter, yetenek, ilişki, görev/gizem, balıkçılık, fener,
                       gece olayları, üretim, gün döngüsü, etkileşimler
  ui/                  HUD, diyalog, defter ve tüm paneller
```

İçerik eklemek kolaydır: yeni balık, tarif, NPC repliği, ipucu ve görevler `src/data/` altındaki dosyalara veri olarak girilir.

## Yol haritası (sonraki adımlar)

- "Yirminci Yıl Sisi" final gecesi ve uzak ada sonrası hikâye
- Daha fazla NPC (10–20) ve kasabanın görsel olarak gelişmesi
- Romantizm seçeneği (isteğe bağlı)
- Ses dosyalarıyla zenginleştirilmiş müzik
- Gamepad desteği
