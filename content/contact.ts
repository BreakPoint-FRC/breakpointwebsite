import { site } from "./site";
import type { ContactContent } from "./types";

export const contact: ContactContent = {
  title: "İletişim",
  lead: "Sponsorluk paketleri ve diğer sorular için bize yazın.",
  fields: [
    { label: "E-posta", value: "info@breakpointfrc.com", mono: true, href: "mailto:info@breakpointfrc.com" },
    { label: "Sponsorluk", value: "Kuzey Kahraman, Ahmet Üge", mono: false },
    { label: "Instagram", value: "@breakpoint.frc", mono: true, href: "https://instagram.com/breakpoint.frc" },
    { label: "Atölye", value: site.school, mono: false },
    { label: "Şehir", value: site.city, mono: false },
    { label: "Takım", value: `${site.teamName} #${site.teamNumber}`, mono: false },
  ],
  big: site.teamNumber,
};
