import type { WatchRow } from "./types";

/** İzleme paneli: sahne başına 4 değişken. `bind` olanları sahne canlı günceller. */
export const watchSets: WatchRow[][] = [
  [
    { key: "takim", value: '"BreakPoint"', tone: "white" },
    { key: "numara", value: "12050", tone: "yellow" },
    { key: "sezon", value: "[YIL]", tone: "yellow" },
    { key: "sehir", value: '"[ŞEHİR]"', tone: "white" },
  ],
  [
    { key: "yarisma", value: '"FRC"', tone: "white" },
    { key: "sure", value: "[N] hafta", tone: "yellow" },
    { key: "hedef", value: '"[TURNUVA]"', tone: "white" },
    { key: "yarismaya", value: "[N] gün", tone: "yellow" },
  ],
  [
    { key: "parca", value: "null", tone: "white", bind: "part" },
    { key: "indeks", value: "-", tone: "yellow", bind: "partIndex" },
    { key: "kamera", value: "genel", tone: "white", bind: "camera" },
    { key: "sistem", value: "4", tone: "yellow" },
  ],
  [
    { key: "ogrenci", value: "[N]", tone: "yellow" },
    { key: "mentor", value: "[N]", tone: "yellow" },
    { key: "ekip", value: "4", tone: "yellow" },
    { key: "basvuru", value: '"[DURUM]"', tone: "white" },
  ],
  [
    { key: "not", value: '"manifesto"', tone: "white" },
    { key: "kirilma", value: "bulundu", tone: "yellow" },
    { key: "sonraki", value: "yörünge", tone: "white" },
    { key: "sponsor", value: "[N]", tone: "yellow" },
  ],
  [
    { key: "sponsor", value: "[N]", tone: "yellow" },
    { key: "yer", value: '"yörünge"', tone: "white", bind: "place" },
    { key: "marka", value: "undefined", tone: "muted", bind: "brand" },
    { key: "slot", value: "+1", tone: "yellow" },
  ],
  [
    { key: "butce", value: "%[..] hazır", tone: "yellow" },
    { key: "hedef", value: "₺[…]", tone: "white" },
    { key: "eksik", value: "₺[…]", tone: "yellow" },
    { key: "iletisim", value: '"[AD]"', tone: "white" },
  ],
  [
    { key: "cam", value: '"sağlam"', tone: "white", bind: "glass" },
    { key: "parca", value: "55", tone: "yellow" },
    { key: "sonraki", value: '"kırılma noktası"', tone: "white" },
    { key: "iletisim", value: "yükleniyor", tone: "yellow", bind: "reveal" },
  ],
];

export const mobileBarStats = { sponsor: "[N]", budget: "%[..]" };
