import type { RobotSection } from "./types";

export const robot: RobotSection = {
  label: "03  Robot, parça parça",
  overviewText: "Dört sistem, tek robot. Kaydırdıkça kamera parçalara yaklaşır.",
  photo: {
    src: null,
    alt: "Robotun yandan görünümü",
    placeholder: "[ROBOT FOTOĞRAFI — yandan, dekupe]",
  },
  photoMobile: {
    src: null,
    alt: "Robotun dikey fotoğrafı",
    placeholder: "[PARÇA YAKIN ÇEKİM]",
  },
  parts: [
    { no: "01", name: "Şasi", description: "[SÜRÜŞ SİSTEMİ, MALZEME, AĞIRLIK]", x: 32, y: 74 },
    { no: "02", name: "Mekanizma", description: "[OYUN PARÇASIYLA NE YAPIYOR]", x: 60, y: 28 },
    { no: "03", name: "Elektronik", description: "[KONTROLCÜ, MOTORLAR, SENSÖRLER]", x: 46, y: 52 },
    { no: "04", name: "Yazılım", description: "[OTONOM, GÖRÜNTÜ İŞLEME]", x: 72, y: 60 },
  ],
};
