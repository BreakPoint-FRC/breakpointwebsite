import { site } from "./site";
import type { TeamContent } from "./types";

export const team: TeamContent = {
  title: "Takım",
  lead: `BreakPoint, ${site.city}'daki ${site.school}'de bir araya gelen 17 öğrenci ve 5 mentordan oluşan bir FRC takımıdır. Takım numaramız ${site.teamNumber}.`,
  photoLabel: "[FOTOĞRAF]",
  cards: [
    { role: "[ALT TAKIM 1]", name: "[AD SOYAD]", photo: { src: null, alt: "" } },
    { role: "[ALT TAKIM 2]", name: "[AD SOYAD]", photo: { src: null, alt: "" } },
    { role: "[ALT TAKIM 3]", name: "[AD SOYAD]", photo: { src: null, alt: "" } },
    { role: "[ALT TAKIM 4]", name: "[AD SOYAD]", photo: { src: null, alt: "" } },
  ],
};
