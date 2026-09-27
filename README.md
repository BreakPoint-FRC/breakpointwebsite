# BreakPoint #12050 — takım sitesi

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · GSAP + ScrollTrigger · Lenis · pnpm

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm build
```

## İçerik nasıl doldurulur

Bütün metin ve veriler `content/*.ts` içinde. Component'lara dokunmadan buradan değiştirin.
`[KÖŞELİ PARANTEZ]` olan her değer yer tutucudur.

| Dosya | İçerik |
|---|---|
| `content/site.ts` | okul, şehir, slogan, robot adı/yılı, hero videosu |
| `content/facts.ts` | FRC nedir? bölümündeki 3 bilgi |
| `content/robotParts.ts` | 4 robot parçası: ad, açıklama, fotoğraf üzerindeki nokta (x/y %) |
| `content/team.ts` | üyeler, roller, portreler |
| `content/manifesto.ts` | manifesto cümlesi |
| `content/sponsorTiers.ts` | sponsor paketleri + yörüngedeki sponsor logoları |
| `content/budget.ts` | bütçe dağılımı (`isExample: false` yapınca "ÖRNEK" notu kalkar) |
| `content/contact.ts` | sponsorluk sorumlusu, e-posta, WhatsApp, sosyal medya, PDF, KVKK |
| `content/watch.ts` | izleme panelindeki değişkenler |

Görseller `public/media/` altına konup ilgili `src` alanına yol olarak yazılır (`"/media/robot.jpg"`).
`src: null` iken yer tutucu kutu görünür.

**Norwester fontu:** dosyayı `public/fonts/norwester.woff2` olarak koyun ve `app/fonts.ts`'teki yorumdaki adımı uygulayın.
Dosya gelene kadar başlıklar Oswald ile görünür.

## Yapı

- `components/scenes/` — 8 sahne. Pin'li olanlar: Hero, RobotParts, Manifesto (yalnız masaüstü), OrbitLanding, GlassFinale.
- `components/layout/` — header, spine (sol omurga), izleme paneli, mobil alt bar, sahne takibi.
- `lib/` — GSAP kurulumu ve pin uzunlukları (`lib/gsap.ts`), cam geometrisi (`lib/glass.ts`) ve canvas renderer'ı (`lib/glassRenderer.ts`).
- Tasarım kaynakları: `docs/BUILD-BRIEF.md`, `docs/prototypes/`. Doğrulama ekran görüntüleri: `docs/screenshots/`.

Ölçek: masaüstünde (≥1024px) tüm spacing/font sınıfları 1440×900 prototipinin px değerleridir (`pt-112`, `fs-232`); `--spacing` ekrana göre orantılanır.
