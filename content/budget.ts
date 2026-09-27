import type { Budget } from "./types";

// Oranlar ÖRNEK: gerçek bütçe gelince `share` ve `amount` değişecek, `isExample` false olacak.
export const budget: Budget = {
  isExample: true,
  exampleNote: "// oranlar ÖRNEK — gerçek bütçeyle değişecek",
  exampleNoteMobile: "(örnek oran)",
  items: [
    { label: "Parça ve motor", shortLabel: "Parça", amount: "[₺]", share: 34, tone: "yellow" },
    { label: "Yarışma kaydı", shortLabel: "Kayıt", amount: "[₺]", share: 28, tone: "white" },
    { label: "Seyahat", shortLabel: "Seyahat", amount: "[₺]", share: 22, tone: "muted" },
    { label: "Atölye", shortLabel: "Atölye", amount: "[₺]", share: 16, tone: "line" },
  ],
};
