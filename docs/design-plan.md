# BreakPoint #12050 — Tasarım Planı

## Kimin için, ne anlatıyor

BreakPoint, FIRST Robotics Competition'da 12050 numarasıyla yarışan bir robotik takımı.
Site üç kitleye konuşur, öncelik sırasıyla:

1. **Sponsorlar** — "Bu takıma para/malzeme verirsem markam nerede görünür, ne karşılığında?" İlk 10 saniyede güven + ciddiyet.
2. **Jüri / ödül değerlendiricileri** (FRC ödülleri, web tasarım ödülleri) — tek bir akılda kalan fikir, kusursuz uygulama, erişilebilirlik.
3. **Öğrenciler / aileler** — takıma katılma, ne yaptığımızı anlama.

## Tek fikir: Kırılma noktası

İsmin iki anlamı var ve ikisini de kullanıyoruz:

- **Mühendislik:** bir malzemenin kırıldığı nokta — robotun sınandığı yer.
- **Yazılım:** debugger'daki *breakpoint* — kodun durup incelendiği satır.

Görsel dil bu iki anlamdan çıkar: **düzensiz fay hattı** (kırık kenarlar, çatlak çizgisi) ve
**editör gutter'ı** (satır numaraları + breakpoint noktası ● bölüm etiketleri).

## İmza efekt — TEK (Restraint Rules)

**Hero'daki "BREAKPOINT" kelimesi kaydırdıkça fay hattından ikiye kırılır.**

- Kütüphane: **GSAP + ScrollTrigger + useGSAP** (Decision Matrix → "Scroll-driven animations").
- Nasıl: Hero içeriği iki katman; her biri aynı içeriği taşır, `clip-path` ile fay hattının iki yanına kırpılır.
  `scrub` ile kaydırmaya bağlı: önce sarı çatlak çizgisi belirir, sonra iki parça ayrılır
  (sol: sola-yukarı + hafif dönüş, sağ: sağa-aşağı), aradan sarı zemin + robot fotoğrafı açılır.
- Neden bu: ismin kendisi. Başka hiçbir takımın sitesine taşınamaz.
- Yalnız `transform` ve `opacity` animasyonu; `clip-path` statik kalır (performans).
- **Kullanıcı tetikler** (scroll). Kendiliğinden başlayan / sonsuz döngü yok.
- `prefers-reduced-motion`: parçalar ayrılmaz; çatlak çizgisi statik görünür, robot fotoğrafı hero'nun altında normal akışta.

Geri kalan her şey sakin: bölümler yalnızca düz fade-in (opacity + 16px), başka efekt YOK.
Magnetic cursor, parallax, glitch, custom cursor → **kullanılmıyor.**
Lenis smooth scroll yalnız altyapı (ScrollTrigger ile senkron), efekt sayılmaz.

Statik tekrar: bölüm geçişleri aynı fay hattının kırık kenarlarıyla (`clip-path` polygon) —
animasyonsuz, fikri sayfa boyunca sürdürür.

## Renk

| Token | Değer | Kullanım |
|---|---|---|
| `--bp-black` | `#12100C` (Kömür, öneri — kesin seçim kullanıcıda) | zemin |
| `--bp-surface` | `#1D1A15` | kart / bölüm yüzeyi |
| `--bp-line` | `#332E25` | çizgi, ayraç |
| `--bp-muted` | `#ABA597` | ikincil metin (7.7:1) |
| `--bp-yellow` | `#FED233` | vurgu, CTA, çatlak (siyah üstünde 13:1) |
| `--bp-white` | `#FFFFFF` | metin |
| `--bp-paper` | `#F7F5F0` | açık bölümler |

Kural: sarının üstüne **yalnız siyah** metin. Beyaz-sarı asla.

## Tipografi

- **Norwester** — hero ve bölüm başlıkları, yalnız BÜYÜK HARF. Google Fonts'ta yok → `woff2` self-host,
  `next/font/local`. **İ Ş Ğ Ü Ö Ç glyph'leri test edilmeli**; eksikse `unicode-range` ile Oswald'a düşür.
- **Oswald** — menü, etiket, rakam, alt başlık (400–700).
- **Roboto Condensed** — gövde (400/500/700), 18/1.6.
- `font-synthesis: none` (tek ağırlıklı Norwester sahte kalınlaşmasın).

## Layout

- 12 kolon, 64px kenar (mobil 20px), 24px gutter.
- Sayfa akışı (sponsor odaklı): Hero (kırılma) → Manifesto → **Sponsorluk değeri + paketler** → Robot → Ekip → Sponsor CTA bandı → Footer.
- Bölüm etiketleri editör gutter'ı gibi: `● 03  SPONSORLUK`.

## Teknik

Next.js (App Router) + TypeScript strict + Tailwind v4 + pnpm. GSAP + @gsap/react + lenis.
Hedef: Lighthouse 95+, CLS 0, 60fps scroll, klavye ile tam gezilebilir.

---

## Güncelleme 2026-09-27 — Final yön: "Fay Hattı Sinematik"

Kullanıcı D (fay hattı), E (robot parçaları + sponsor yörüngesi) ve F (ana BREAKPOINT satırı + JSON sponsor kartları)
parçalarını seçti ve GTA VI sitesi gibi **kaydırmaya bağlı, video hissi veren** animasyon istedi (sunum/slayt değil).
Bu yüzden "tek efekt" kuralı sahne başına bir efekte genişletildi: her sahnede bir hareket, hepsi scroll'a bağlı (scrub),
hiçbiri kendiliğinden oynamıyor. Tüm sahneler GSAP ScrollTrigger `pin + scrub` ile tek teknikle yapılır.

| # | Sahne | Pin uzunluğu | Hareket |
|---|---|---|---|
| 1 | Hero | ~1300px | Editör satırı gibi sarı bant içinde BREAKPOINT → fay hattından kırılır, parçalar ekran dışına savrulur, robot fotoğrafı/video döngüsü 1.35→1 ölçekle açılır |
| 2 | Robot | ~2100px | Kamera robotun 4 parçasına sırayla zoom (transform-origin geçişi), sağda dev numara + parça adı, ilerleme çubukları |
| 3 | Manifesto | ~1100px | Kelimeler sırayla yanar; "kırılma noktası" sarı |
| 4 | Sponsor yörüngesi | ~1300px | Halka kaydırmayla büyüyerek gelir; sponsor logoları **kendi kendine** (48 sn/tur) BP etrafında döner, dik kalır, üzerine gelince durur. Kullanıcı kararı: dönüş scroll'a bağlı değil |
| 5 | Paketler | pin yok | F'nin JSON kartları sırayla kayarak gelir, ortadaki sarı "önerilen" |
| 6 | Çağrı | ~700px | Sarı zeminde çatlak soldan sağa çizilir, zemin ikiye ayrılır: "Bir sonraki kırılma noktası / sizinle." |

Sürekli (tek) döngü: yalnız aktif robot parçasındaki pulse ve konsoldaki imleç — `prefers-reduced-motion`'da kapalı.
Reduced motion'da pin'ler kalkar, her sahne son (oturmuş) hâliyle normal akışta gösterilir.
Header'da ince sarı ilerleme çubuğu + `● 0N / 06` sahne göstergesi.
Fontlara kod parçaları için **JetBrains Mono** eklendi (kullanıcı F'yi beğendi; istenirse çıkarılabilir).
Mobil: sahneler korunur, pin uzunlukları ~%60; yörüngede 5 logo; parça zoom'u dikey fotoğrafla.
