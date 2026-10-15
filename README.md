# BreakPoint #12050 sitesi

Next.js 16 · TypeScript strict · Tailwind v4 · pnpm

    pnpm install
    pnpm dev            # http://localhost:3000
    pnpm lint && pnpm typecheck && pnpm test && pnpm build

## İçerik nasıl doldurulur

Sayfa metinleri `content/*.ts` içindedir. `[KÖŞELİ PARANTEZ]` olan her değer yer tutucudur.

| Dosya | İçerik |
|---|---|
| `content/site.ts` | okul, şehir, sezon, açıklama, hero metni ve izleme paneli etiketleri; `features.qualitySelector` bayrağı (kalite seçici açık/kapalı) |
| `content/nav.ts` | üst menü bağlantıları |
| `content/frc.ts` | FRC nedir metni ve üç adım |
| `content/robotParts.ts` | dört robot parçası, robot fotoğrafı, çizim ölçü etiketi |
| `content/team.ts` | takım kartları (ad, alt takım, fotoğraf) |
| `content/sponsorTiers.ts` | sponsorluk paketleri |
| `content/contact.ts` | iletişim alanları (isteğe bağlı `href`) |

Arayüz etiketleri content'te değil, kodda durur:

- "Menü" düğmesi: `components/shell/Header.tsx`
- "İçeriğe geç" atlama bağlantısı: `app/page.tsx`
- "Sponsor ol" altbilgi bağlantısı ve dev "BREAKPOINT" yazısı: `components/sections/Final.tsx`
- Hero başlığındaki "BREAKPOINT" harfleri: `components/sections/Hero.tsx`
- "Kalite" seçici etiketi: `components/shell/QualityControl.tsx`

### Yer tutucular

Gerçek bilgi gelince ilgili `content/*.ts` değerini değiştirmek yeter:

`[AD SOYAD]` `[ALT TAKIM n]` `[FOTOĞRAF]` `[ROBOT FOTOĞRAFI]` `[SENSÖR ADI]` `[ÖLÇÜ]` `[İTTİFAK n]`

### Görsel ekleme

Takım kartları (`content/team.ts`) ve robot (`content/robotParts.ts`) `photo: { src, alt }` kullanır.
`src: null` iken yer tutucu kutu görünür. Gerçek görsel için dosyayı `public/media/` altına koyun ve
`src` verin:

    photo: { src: "/media/robot.jpg", alt: "Robotun yandan görünüşü" },

Görsel `next/image` ile (`unoptimized`, `sharp` gerekmez) gösterilir. Anlamlı bir `alt` yazın; boş `alt`
yalnızca dekoratif yer tutucu içindir.

## Açılış ve 3B uçuş

Sayfa önce **cam** ile açılır (hareket azaltma açıksa camsız): cama tıklayınca Voronoi parçalarına ayrılıp düşer,
hero harfleri iki kırık yarıdan birleşir. Sonra kaydırdıkça kamera donmuş patlamanın cam mağarasında ilerler;
bölümler uzayda süzülen cam levhalardır, robot cam kıymıklarından birleşir, final yazısı ışının önünde kurulur.

- Tüm kaydırma hızlarının tek ayarı: `lib/flight/config.ts` içinde `PACE` (1.65).
- 3B motor tipli modüllerdir: `lib/flight/*` (prototip: `design-explorations/N2-ucus-altin.html`). `three@0.128.0`
  bilerek sabittir (görünüm birebir kalsın); yeni sürüme geçiş ayrı bir iştir.
- İçerik 3B'nin kendisi değildir: bölümler her kademede gerçek HTML olarak durur, 3B üstüne giyilen bir görünümdür.
- Cam açılış: `lib/glass/*`. "Tekrar kır" düğmesi final bölümündedir.

## Kalite kademeleri

Site cihaza göre kademe seçer (`<html data-tier>`), önce **tespit** (hareket azaltma, WebGL, yazılımsal çizici,
çekirdek/bellek/veri tasarrufu, kayıtlı kademe), sonra **çalışma zamanında kare yöneticisi** (governor).

| Kademe | Ad | Mağara kıymığı | DPR üst sınırı | Bloom/MSAA | Çizim |
|---|---|---|---|---|---|
| T3 | Yüksek | 7000 | 1.75 | evet (bloom yalnız dokunmatik değilken) | sürekli |
| T2 | Orta | 3500 | 1.25 | yok | sürekli |
| T1 | Düşük | 1200 | 1.0 | yok | talep üzerine (kaydırma/imleç yokken ≤10 fps) |
| T0 | Düz | 3B yok | n/a | n/a | yok; three hiç indirilmez |

Governor (`lib/flight/governor.ts`): 60 karelik pencere, hedef T3/T2 ≤ 18 ms, T1 ≤ 34 ms. Üst üste 2 pencere
aşılırsa sırayla bloom → DPR (0.25'lik adım, taban 1.0) → kıymık sayısı (taban 1200) → kademe düşer. Düşen kademe
oturum boyunca geri çıkmaz ve bir sonraki ziyaret için kaydedilir. T0'a düşünce küçük bir bildirim görünür.

Alt bilgideki **Kalite** seçici (Otomatik · Yüksek · Orta · Düşük · Düz) tercihi `localStorage`'a (`bp-kalite`) yazar
ve tespiti geçersiz kılar. Test için adrese `?kalite=yuksek|orta|dusuk|duz` eklenir (kalıcı DEĞİL). Hata ayıklama:
`?governor=kapali` kare yöneticisini kapatır. Hareket azaltma açıkken 3B yalnız açıkça istenirse (seçici ya da
`?kalite=`) başlar ve giriş düşüşü atlanır.

## Doğrulama

`pnpm build && pnpm start` sunucuyu bloklar (terminali tutar). `pnpm verify` için ikinci bir terminal açın:

    pnpm build && pnpm start      # terminal 1
    pnpm verify                   # terminal 2: tarayıcı kontrolleri (Chromium gerekir)
    pnpm measure                  # başlangıç JS gzip boyutu (önce pnpm build)

- `pnpm verify` Chromium yolunu `CHROMIUM_PATH` ortam değişkeninden alır. Tanımlı değilse varsayılan yol
  `%USERPROFILE%\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe` (`chromium-1243`) olur.
- `pnpm measure` başlangıç betik bütçesi (three ve 3B parçaları hariç) aşılınca çıkış kodu 1 verir; `three` ve
  bloom ayrı parçalardır, yalnız T1+ kademede indirilir. React DOM + Next tek başına ~117 KB gzip'tir.
- `pnpm verify` cam açılışı kırarak başlar, üç 3B kademeyi, menü gezintisini, kademe seçiciyle aç/kapa
  sızıntısını, hareket azaltmayı ve mobili sınar. Yazılımsal GL (SwiftShader) altında koşar; gerçek GPU akıcılığı
  yalnızca gerçek bilgisayarda (özellikle en zayıf makinede) doğrulanır.
