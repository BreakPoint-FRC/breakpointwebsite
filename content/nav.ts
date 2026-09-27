import type { LinkItem, SceneNavItem } from "./types";

/** Sahne sırası = spine noktaları = izleme panelindeki adım numarası. */
export const scenes: SceneNavItem[] = [
  { id: "giris", label: "Giriş" },
  { id: "frc", label: "FRC nedir" },
  { id: "robot", label: "Robot" },
  { id: "takim", label: "Takım" },
  { id: "manifesto", label: "Manifesto" },
  { id: "sponsorluk", label: "Yörünge" },
  { id: "paketler", label: "Paketler" },
  { id: "iletisim", label: "İletişim" },
];

export const mainNav: LinkItem[] = [
  { label: "FRC nedir", href: "#frc" },
  { label: "Robot", href: "#robot" },
  { label: "Takım", href: "#takim" },
  { label: "Sponsorluk", href: "#sponsorluk" },
];

export const headerCta: LinkItem = { label: "Sponsor ol", href: "#paketler" };

/** EN içerik henüz yok; bağlantı hazır dursun. */
export const languageToggle: { current: string; other: LinkItem } = {
  current: "TR",
  other: { label: "EN", href: "#" },
};
