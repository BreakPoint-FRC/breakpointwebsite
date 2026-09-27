import type { HeroContent, SiteInfo } from "./types";

export const site: SiteInfo = {
  teamName: "BreakPoint",
  teamNumber: "12050",
  school: "[OKUL]",
  city: "[ŞEHİR]",
  slogan: "[SLOGAN]",
  robotName: "[ROBOT ADI]",
  robotYear: "[YIL]",
  copyrightYear: "2026",
  description:
    "BreakPoint, FIRST Robotics Competition'da 12050 numarasıyla yarışan lise robotik takımı.",
};

export const hero: HeroContent = {
  codeComment: "// FIRST Robotics Competition · Takım 12050",
  codeKeyword: "takim",
  subtitle: `${site.school} öğrencileriyiz. Robotumuzu kendimiz tasarlıyor, üretiyor ve programlıyoruz.`,
  primaryCta: { label: "Sponsor ol", href: "#paketler" },
  secondaryCta: { label: "Paketleri gör", href: "#paketler" },
  scrollHint: "Kaydır, kır",
  media: {
    src: null,
    poster: null,
    alt: "BreakPoint robotu",
    placeholder: "[ROBOT VİDEO DÖNGÜSÜ / FOTOĞRAF]",
  },
};
