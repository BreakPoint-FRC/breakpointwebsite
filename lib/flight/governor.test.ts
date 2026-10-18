import { describe, expect, it } from "vitest";
import {
  COUNT_FLOOR,
  MAX_TRUSTED_FRAME_MS,
  OVER_WINDOWS,
  SEVERE_FACTOR,
  WARMUP_WINDOWS,
  createGovernorState,
  stepGovernor,
  targetMs,
  type GovernorAction,
  type GovernorInfo,
} from "./governor";

const slow = 40;
const fast = 10;

function warmed() {
  const s = createGovernorState();
  for (let i = 0; i < WARMUP_WINDOWS; i++) stepGovernor(s, slow, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 });
  return s;
}

function overWindows(s: ReturnType<typeof createGovernorState>, info: GovernorInfo): GovernorAction {
  let last: GovernorAction = { kind: "none" };
  for (let i = 0; i < OVER_WINDOWS; i++) last = stepGovernor(s, slow, info);
  return last;
}

function overWindows2(s: ReturnType<typeof createGovernorState>, ms: number, info: GovernorInfo): GovernorAction {
  let last: GovernorAction = { kind: "none" };
  for (let i = 0; i < OVER_WINDOWS; i++) last = stepGovernor(s, ms, info);
  return last;
}

describe("targetMs", () => {
  it("T3/T2 18 ms, T1 34 ms", () => {
    expect(targetMs("T3")).toBe(18);
    expect(targetMs("T2")).toBe(18);
    expect(targetMs("T1")).toBe(34);
  });
  it("60 Hz ve üstü yenilemede hedef tabanda kalır (60 Hz'de +0.04 ms pay, 120 Hz'de değişmez)", () => {
    expect(targetMs("T3", 16.7)).toBeCloseTo(18, 1);
    expect(targetMs("T2", 8.3)).toBe(18);
    expect(targetMs("T1", 16.7)).toBe(34);
  });
  it("30 Hz sınırında hedef yenileme aralığının üstüne çıkar", () => {
    expect(targetMs("T3", 33.3)).toBeCloseTo(33.3 * 1.08, 5);
    expect(targetMs("T1", 33.3)).toBeCloseTo(35.964, 3);
  });
  it("güvenilmez ölçüm (null, NaN, sıfır, çok büyük) yok sayılır", () => {
    for (const bad of [null, Number.NaN, 0, -5, MAX_TRUSTED_FRAME_MS + 1, Infinity]) expect(targetMs("T3", bad)).toBe(18);
  });
});

describe("stepGovernor", () => {
  it("ısınma penceresi yok sayılır", () => {
    const s = createGovernorState();
    for (let i = 0; i < WARMUP_WINDOWS; i++) {
      expect(stepGovernor(s, slow, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 })).toEqual({ kind: "none" });
    }
  });
  it("tek pencere aşımı adım atmaz", () => {
    const s = warmed();
    expect(stepGovernor(s, slow, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 })).toEqual({ kind: "none" });
  });
  it("hedefi tutan pencere sayacı sıfırlar", () => {
    const s = warmed();
    stepGovernor(s, slow, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 });
    stepGovernor(s, fast, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 });
    expect(stepGovernor(s, slow, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 })).toEqual({ kind: "none" });
  });
  it("ardışık iki pencere: önce bloom", () => {
    const s = warmed();
    expect(overWindows(s, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 })).toEqual({ kind: "bloom" });
  });
  it("bloom yoksa DPR 0.25 iner, tabanı 1.0", () => {
    const s = warmed();
    expect(overWindows(s, { tier: "T3", hasBloom: false, dpr: 1.75, count: 7000 })).toEqual({ kind: "dpr", to: 1.5 });
    const s2 = warmed();
    expect(overWindows(s2, { tier: "T3", hasBloom: false, dpr: 1.1, count: 7000 })).toEqual({ kind: "dpr", to: 1.0 });
  });
  it("DPR tabandaysa kıymık sayısı %25 azalır, tabana kadar", () => {
    const s = warmed();
    expect(overWindows(s, { tier: "T2", hasBloom: false, dpr: 1.0, count: 3500 })).toEqual({ kind: "count", to: 2625 });
    const s2 = warmed();
    expect(overWindows(s2, { tier: "T2", hasBloom: false, dpr: 1.0, count: 1300 })).toEqual({ kind: "count", to: COUNT_FLOOR });
  });
  it("hiçbir şey kalmayınca kademe düşer: T3→T2, T2→T1, T1→T0", () => {
    for (const [from, to] of [["T3", "T2"], ["T2", "T1"], ["T1", "T0"]] as const) {
      const s = warmed();
      expect(overWindows(s, { tier: from, hasBloom: false, dpr: 1.0, count: COUNT_FLOOR })).toMatchObject({ kind: "tier", to });
    }
  });
  it("30 Hz sınırında (33.3 ms) sağlıklı cihaz kademe düşürülmez; ölçüm yoksa düşer ama kaydedilmez", () => {
    const base = { tier: "T3", hasBloom: false, dpr: 1.0, count: COUNT_FLOOR } as const;
    const s = warmed();
    let last: GovernorAction = { kind: "none" };
    for (let i = 0; i < 20; i++) last = stepGovernor(s, 33.3, { ...base, frameMs: 33.3 });
    expect(last).toEqual({ kind: "none" });
    const s2 = warmed();
    for (let i = 0; i < OVER_WINDOWS; i++) last = stepGovernor(s2, 33.3, base);
    expect(last).toEqual({ kind: "tier", to: "T2", severe: false });
  });
  it("kademe düşüşü yalnız ölçüm güvenilirse ve ortalama hedefin 1.5 katını aşıyorsa severe", () => {
    const info = { tier: "T3", hasBloom: false, dpr: 1.0, count: COUNT_FLOOR, frameMs: 16.7 } as const;
    const severeMs = targetMs("T3", 16.7) * SEVERE_FACTOR + 1;
    const mild = warmed();
    expect(overWindows2(mild, 22, info)).toEqual({ kind: "tier", to: "T2", severe: false });
    const bad = warmed();
    expect(overWindows2(bad, severeMs, info)).toEqual({ kind: "tier", to: "T2", severe: true });
    const unknown = warmed();
    expect(overWindows2(unknown, severeMs, { ...info, frameMs: null })).toEqual({ kind: "tier", to: "T2", severe: false });
  });
  it("sayaç sıfırlanınca severe ortalaması önceki pencerelerden etkilenmez", () => {
    const info = { tier: "T3", hasBloom: false, dpr: 1.0, count: COUNT_FLOOR, frameMs: 16.7 } as const;
    const s = warmed();
    stepGovernor(s, 100, info);
    stepGovernor(s, fast, info);
    expect(overWindows2(s, 22, info)).toEqual({ kind: "tier", to: "T2", severe: false });
  });
  it("adımdan sonra bekleme penceresi yeni adım atmaz", () => {
    const s = warmed();
    overWindows(s, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 });
    for (let i = 0; i < 1; i++) expect(stepGovernor(s, slow, { tier: "T3", hasBloom: false, dpr: 1.75, count: 7000 })).toEqual({ kind: "none" });
  });
  it("NaN süre güvenli (adım atmaz)", () => {
    const s = warmed();
    expect(overWindows(s, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 }).kind).toBe("bloom");
    const s2 = warmed();
    expect(stepGovernor(s2, Number.NaN, { tier: "T3", hasBloom: true, dpr: 1.75, count: 7000 })).toEqual({ kind: "none" });
  });
});
