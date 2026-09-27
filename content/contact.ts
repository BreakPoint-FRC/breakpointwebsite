import type { ContactContent } from "./types";
import { site } from "./site";

export const contact: ContactContent = {
  person: {
    name: "[AD SOYAD]",
    role: "Sponsorluk sorumlusu",
    phone: "[TELEFON]",
    photo: { src: null, alt: "", placeholder: "[FOTO]" },
  },
  whatsapp: { label: "WhatsApp", href: "#" },
  sponsorPdf: { label: "Sponsorluk dosyası", href: "#" },
  sponsorCta: { label: "Sponsor olun", href: "#paketler" },
  joinCta: { label: "Takıma katıl", href: "#" },
  consoleLabel: "08  İletişim · konsol",
  consoleLines: [
    { key: "e-posta  ", link: { label: "[E-POSTA]", href: "#" }, mobile: true },
    { key: "whatsapp ", link: { label: "[TELEFON]", href: "#" }, mobile: true },
    { key: "instagram", link: { label: "[INSTAGRAM]", href: "#" }, mobile: false },
    { key: "youtube  ", link: { label: "[YOUTUBE]", href: "#" }, mobile: false },
  ],
  glassLine1: "Bir sonraki",
  glassLine2: "kırılma noktası",
  glassLine3: "SİZİNLE.",
  schoolLine: `[OKUL / KURUM] · ${site.city}`,
  legal: { label: "Gizlilik · [KVKK METNİ]", href: "#" },
};
