import type { RobotContent } from "./types";

export const robot: RobotContent = {
  title: "Robotumuz",
  intro: "BP-01, 2026 sezonu robotumuz. Dört ana parçadan oluşur.",
  photoLabel: "Robot fotoğrafı için ayrılan alan",
  photoTag: "[ROBOT FOTOĞRAFI]",
  dimensionLabel: "[ÖLÇÜ]",
  photo: { src: null, alt: "" },
  parts: [
    { id: "sasi", name: "Şasi", description: "Robotun iskeleti. Tüm parçaları taşır." },
    { id: "mekanizma", name: "Mekanizma", description: "Robotun kasları. Görevi yapan hareketli düzenekler." },
    { id: "elektronik", name: "Elektronik", description: "Robotun sinirleri. Motorları, sensörleri ve kontrol kartını birbirine bağlar." },
    { id: "yazilim", name: "Yazılım", description: "Robotun beyni. Sürücünün ve otonom görevin komutlarıyla robotu çalıştırır." },
  ],
  hud: { phaseLabel: "sahne", phaseIdle: "şasi", countLabel: "cam parçası yerinde" },
};
