import type { OrbitSection, PackagesSection, SponsorLogo } from "./types";

const placeholderLogo: SponsorLogo = { name: "[LOGO]", logo: null };

export const orbit: OrbitSection = {
  label: "06  Sponsorluk",
  title: "Robotumuzun",
  titleAccent: "yörüngesine",
  titleEnd: "girin.",
  landLabel: "06  Logonuz nerede durur?",
  landTitle: "Tam",
  landTitleAccent: "burada.",
  inputLabel: "Şirketinizin adını yazın, tampona yerleşsin:",
  inputLabelMobile: "Şirketinizin adını yazın:",
  inputPlaceholder: "Şirketiniz",
  youSlot: "+ SİZ",
  // Masaüstünde 6, mobilde ilk 4 logo yörüngede döner (+ SİZ ile 7 / 5).
  sponsors: Array.from({ length: 6 }, () => placeholderLogo),
};

export const packages: PackagesSection = {
  label: "07  Desteğiniz nereye gidiyor?",
  labelMobile: "07  Paketler",
  title: "Her kuruşun",
  titleAccent: "bir parçası var.",
  tiers: [
    {
      id: "paket-1",
      name: "[PAKET 1]",
      amount: "[TUTAR]",
      recommended: false,
      placement: "yan panel",
      placementLabel: "yan panel",
      benefits: ["Yan panelde logo", "[KARŞILIK 2]", "Teşekkür paylaşımı"],
    },
    {
      id: "paket-2",
      name: "[PAKET 2]",
      amount: "[TUTAR]",
      recommended: true,
      placement: "tampon",
      placementLabel: "tampon",
      benefits: ["Tamponda logo", "Tişörtte logo", "[KARŞILIK 3]", "Etkinlik daveti"],
    },
    {
      id: "paket-3",
      name: "[PAKET 3]",
      amount: "[TUTAR]",
      recommended: false,
      placement: "kol",
      placementLabel: "kol / tişört",
      benefits: ["Kol / tişört", "[KARŞILIK 2]", "[KARŞILIK 3]"],
    },
  ],
};

export const recommendedSuffix = "Önerilen";
