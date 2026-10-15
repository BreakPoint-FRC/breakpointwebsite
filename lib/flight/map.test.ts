import { describe, expect, it } from "vitest";
import { PACE } from "./config";
import { STS, buildMap, createEval, evalMap, lead, phaseY, profile, stationY } from "./map";
import { createDims, createStations, makePath } from "./world";

const H = 900;
const ST = createStations();
const path = makePath(ST, createDims());

describe("profile", () => {
  it("0'da 0, 1'de 1, monoton artan", () => {
    expect(profile(0)).toBeCloseTo(0, 5);
    expect(profile(1)).toBeCloseTo(1, 5);
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const v = profile(f);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("buildMap", () => {
  it("7 dinlenme + 6 geçiş bölümü, sürekli, toplam = son + H", () => {
    const m = buildMap(H, [0, 0, 0, 0]);
    expect(m.segs).toHaveLength(13);
    for (let i = 1; i < m.segs.length; i++) expect(m.segs[i].a).toBe(m.segs[i - 1].b);
    expect(m.total).toBe(m.segs[12].b + H);
  });
  it("taşan levha içeriği dinlenmeyi uzatır", () => {
    const flat = buildMap(H, [0, 0, 0, 0]);
    const over = buildMap(H, [0, 0, 300, 0]);
    expect(over.total - flat.total).toBe(300);
  });
  it("istasyon konumları artan sırada", () => {
    const m = buildMap(H, [0, 0, 0, 0]);
    let prev = -1;
    for (const s of STS) {
      const y = s.id === "top" ? 0 : stationY(m, s.id);
      expect(y).toBeGreaterThan(prev);
      prev = y;
    }
    expect(stationY(m, "yok")).toBe(-1);
  });
});

describe("evalMap", () => {
  const m = buildMap(H, [0, 0, 0, 0]);
  const E = createEval();
  it("başta hero dinlenmesi, yol A başında", () => {
    evalMap(m, path, 0, E);
    expect(E.i).toBe(0);
    expect(E.ph).toBe("d");
    expect(E.c).toBe(0);
    expect(E.idx).toBe(0);
  });
  it("sonda final dinlenmesi, psi 0..1 aralığında", () => {
    evalMap(m, path, 1e9, E);
    expect(E.i).toBe(6);
    expect(E.ph).toBe("d");
    expect(E.psi).toBeGreaterThanOrEqual(0);
    expect(E.psi).toBeLessThanOrEqual(1);
  });
  it("negatif konum 0'a kenetlenir", () => {
    evalMap(m, path, -500, E);
    expect(E.i).toBe(0);
  });
  it("robot istasyonunda yörünge tam, rho 0..1 artar", () => {
    const seg = m.segs[4];
    evalMap(m, path, seg.a + (seg.b - seg.a) * 0.5, E);
    expect(E.i).toBe(2);
    expect(E.orb).toBe(1);
    expect(E.rho).toBeCloseTo(0.5, 2);
  });
  it("her konumda sonlu sayılar (tarama)", () => {
    for (let y = 0; y <= m.total; y += 37) {
      evalMap(m, path, y, E);
      for (const v of [E.f, E.fe, E.idx, E.orb, E.rho, E.psi, E.q, E.pre, E.leave]) expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("levha içinde taşan içerik q'yu 0'dan 1'e götürür", () => {
    const m2 = buildMap(H, [400, 0, 0, 0]);
    const seg = m2.segs[2];
    evalMap(m2, path, seg.a + lead(H) + 200, E);
    expect(E.i).toBe(1);
    expect(E.q).toBeCloseTo(0.5, 2);
  });
});

describe("phaseY", () => {
  it("parça başlangıçları artan ve robot bölümü içinde", () => {
    const m = buildMap(H, [0, 0, 0, 0]);
    const seg = m.segs[4];
    let prev = seg.a - 1;
    for (let k = 0; k < 4; k++) {
      const y = phaseY(m, k);
      expect(y).toBeGreaterThan(prev);
      expect(y).toBeLessThanOrEqual(seg.b);
      prev = y;
    }
  });
});

describe("PACE", () => {
  it("1.65", () => {
    expect(PACE).toBe(1.65);
  });
});
