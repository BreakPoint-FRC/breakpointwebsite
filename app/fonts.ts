import { JetBrains_Mono, Oswald, Roboto_Condensed } from "next/font/google";

// Norwester dosyası gelince: next/font/local ile --font-norwester tanımlanıp --f-display'in başına eklenir.
// Türkçe İ Ş Ğ Ü Ö Ç glyph'leri eksikse unicode-range ile Oswald'a düşülecek.
//
// Boyut bütçesi: Oswald değişken (tek dosya tüm ağırlıkları kapsar) ve tek ön yüklenen yazı tipidir (dev başlık
// yedek yazı tipiyle görünüp kaymasın). Gövde (Roboto Condensed) ve mono (yalnız küçük etiketler) ön yüklenmez:
// ilk boyamayı aynı bant genişliği için yarıştırmasınlar. Türkçe için latin-ext gerekli; tarayıcı yalnız
// kullanılan alt kümeyi indirir.

export const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  variable: "--font-oswald",
  display: "swap",
});

export const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-roboto-condensed",
  display: "swap",
  preload: false,
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});
