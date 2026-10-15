import type { Features, HeroContent, SiteInfo } from "./types";

export const site: SiteInfo = {
  teamName: "BreakPoint",
  teamNumber: "12050",
  school: "Açık Atölye",
  city: "Bursa",
  season: "2026",
  url: "https://breakpointfrc.com",
  description: "BreakPoint, Bursa'daki Açık Atölye'de bir araya gelen öğrencilerin FIRST Robotics Competition'da 12050 numarasıyla yarışan robotik takımı.",
};

export const features: Features = {
  qualitySelector: true,
  teamCards: false,
};

export const hero: HeroContent = {
  lead: `${site.city}'da ${site.school}'de bir araya gelen öğrencileriz. Robotumuzu kendimiz tasarlıyor, üretiyor ve programlıyoruz.`,
  ctaLabel: "Sponsor Ol",
  ctaHref: "#sponsorluk",
  commentLine: `// ${site.school}, ${site.city}, ${site.season}`,
  watch: {
    ariaLabel: "İzleme paneli",
    title: "izleme",
    teamLabel: "takım",
    schoolLabel: "atölye",
    signalLabel: "sinyal",
    sensorName: "[SENSÖR ADI]",
    hitLabel: "vuruş",
    shardsLabel: "cam parçası",
    crackLabel: "çatlak",
    upLabel: "açık",
    idleHit: "(–, –)",
    idleValue: "–",
    idleUp: "00:00",
    crackUnit: "px",
  },
  scrollCue: "kaydır: camın içinden geç",
};
