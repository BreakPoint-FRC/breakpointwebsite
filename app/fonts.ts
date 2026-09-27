import { JetBrains_Mono, Oswald, Roboto_Condensed } from "next/font/google";

// Norwester: dosya takımdan gelince buraya eklenecek:
//   import localFont from "next/font/local";
//   export const norwester = localFont({ src: "../public/fonts/norwester.woff2", variable: "--font-norwester", display: "swap" });
// ve layout.tsx'teki className listesine `norwester.variable` eklenecek.
// Türkçe İ Ş Ğ Ü Ö Ç glyph'leri eksikse unicode-range ile Oswald'a düşülecek.

export const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

export const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto-condensed",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
