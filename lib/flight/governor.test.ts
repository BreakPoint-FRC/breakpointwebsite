import { describe, expect, it } from "vitest";
import {
  COUNT_FLOOR,
  OVER_WINDOWS,
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

describe("targetMs", () => {
  it("T3/T2 18 ms, T1 34 ms", () => {
    expect(targetMs("T3")).toBe(18);
    expect(targetMs("T2")).toBe(18);
    expect(targetMs("T1")).toBe(34);
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
      expect(overWindows(s, { tier: from, hasBloom: false, dpr: 1.0, count: COUNT_FLOOR })).toEqual({ kind: "tier", to });
    }
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
