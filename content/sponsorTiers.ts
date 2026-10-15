import type { SponsorContent } from "./types";

export const sponsor: SponsorContent = {
  title: "Sponsorluk paketleri",
  intro: "Beş paketten birini seçerek takıma destek olabilirsiniz. Tutarlar dolar cinsindendir.",
  featuredChip: "Öne çıkan",
  ctaLabel: "Bu paketi sor",
  ctaHref: "#iletisim",
  tiers: [
    {
      id: "bronze",
      name: "Bronze",
      price: "$500 – $999",
      perks: ["Web sitesinde ad ve logo", "Sosyal medya paylaşımı", "Takım forması ve anahtarlık hediyesi"],
      featured: false,
    },
    {
      id: "silver",
      name: "Silver",
      price: "$1.000 – $2.499",
      perks: ["Web sitesinde ad ve logo", "Sosyal medya paylaşımı", "BreakPoint ürün hediyesi"],
      featured: false,
    },
    {
      id: "gold",
      name: "Gold",
      price: "$2.500 – $4.999",
      perks: [
        "Web sitesinde ad ve logo",
        "Sosyal medya paylaşımı",
        "BreakPoint ürün hediyesi",
        "Ekip formasının kolunda logo ve isim",
        "Ekip posterinde küçük logo",
        "Robotumuzda küçük logo",
      ],
      featured: true,
    },
    {
      id: "platinum",
      name: "Platinum",
      price: "$5.000 – $9.999",
      perks: [
        "Web sitesinde ad ve logo",
        "Sosyal medya paylaşımı",
        "BreakPoint ürün hediyesi",
        "Ekip formasının önünde logo",
        "Ekip posterinde orta boy logo",
        "Robotumuzda orta boy logo",
        "Her 3 ayda bir ekip raporu",
      ],
      featured: false,
    },
    {
      id: "diamond",
      name: "Diamond",
      price: "$10.000+",
      perks: [
        "Web sitesinde ad ve logo",
        "Sosyal medya paylaşımı",
        "BreakPoint ürün hediyesi",
        "Ekip formasının önünde büyük logo",
        "Ekip posterinde büyük logo",
        "Robotumuzda büyük logo",
        "Aylık ekip raporu",
      ],
      featured: false,
    },
  ],
};
