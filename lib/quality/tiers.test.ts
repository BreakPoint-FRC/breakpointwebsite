import { describe, expect, it } from "vitest";
import {
  PREFERENCES,
  PREFERENCE_TIER,
  TIERS,
  TIER_IDS,
  isPreference,
  isTierId,
  lowerTier,
  worseOf,
} from "./tiers";

describe("lowerTier", () => {
  it("T3 → T2 → T1 → T0 ve T0'da kalır", () => {
    expect(lowerTier("T3")).toBe("T2");
    expect(lowerTier("T2")).toBe("T1");
    expect(lowerTier("T1")).toBe("T0");
    expect(lowerTier("T0")).toBe("T0");
  });
});

describe("worseOf", () => {
  it("daha düşük kademeyi döndürür", () => {
    expect(worseOf("T3", "T1")).toBe("T1");
    expect(worseOf("T0", "T2")).toBe("T0");
    expect(worseOf("T2", "T2")).toBe("T2");
  });
});

describe("isTierId / isPreference", () => {
  it("geçerli değerleri kabul eder", () => {
    for (const t of TIER_IDS) expect(isTierId(t)).toBe(true);
    for (const p of PREFERENCES) expect(isPreference(p)).toBe(true);
  });
  it("bozuk değerleri reddeder", () => {
    for (const v of [null, undefined, 3, "", "T9", "t3", "AUTO", "YUKSEK", {}, []]) {
      expect(isTierId(v)).toBe(false);
      expect(isPreference(v)).toBe(false);
    }
  });
});

describe("TIERS tablosu (spec 5.2)", () => {
  it("kıymık sayıları kademe düştükçe azalır", () => {
    expect(TIERS.T3.ambientShards).toBe(7000);
    expect(TIERS.T2.ambientShards).toBe(3500);
    expect(TIERS.T1.ambientShards).toBe(1200);
    expect(TIERS.T0.ambientShards).toBe(0);
  });
  it("yalnız T3 bloom ve MSAA kullanır, yalnız T1 talep üzerine çizer", () => {
    expect(TIER_IDS.filter((t) => TIERS[t].bloom)).toEqual(["T3"]);
    expect(TIER_IDS.filter((t) => TIERS[t].msaa)).toEqual(["T3"]);
    expect(TIER_IDS.filter((t) => TIERS[t].onDemand)).toEqual(["T1"]);
  });
  it("T0 3B değildir, diğerleri 3B'dir", () => {
    expect(TIERS.T0.threeD).toBe(false);
    expect(TIERS.T1.threeD && TIERS.T2.threeD && TIERS.T3.threeD).toBe(true);
  });
  it("DPR üst sınırları 1.75 / 1.25 / 1.0", () => {
    expect([TIERS.T3.dprMax, TIERS.T2.dprMax, TIERS.T1.dprMax]).toEqual([1.75, 1.25, 1.0]);
  });
});

describe("PREFERENCE_TIER", () => {
  it("tercihleri kademelere eşler", () => {
    expect(PREFERENCE_TIER).toEqual({ yuksek: "T3", orta: "T2", dusuk: "T1", duz: "T0" });
  });
});
