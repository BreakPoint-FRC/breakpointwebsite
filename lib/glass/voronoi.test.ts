import { describe, expect, it } from "vitest";
import { buildShards, clipHalf, scarPath, type Rng } from "./voronoi";

function mulberry(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("clipHalf", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it("yarım düzlemi tutar", () => {
    const out = clipHalf(square, 1, 0, 5);
    expect(Math.max(...out.map((p) => p.x))).toBeCloseTo(5);
    expect(out.length).toBe(4);
  });
  it("tamamen dışarıda kalan çokgeni boşaltır", () => {
    expect(clipHalf(square, 1, 0, -1)).toEqual([]);
  });
});

describe("buildShards", () => {
  const cases: Array<[string, number, number, number, number]> = [
    ["masaüstü merkez", 720, 400, 1440, 900],
    ["sağ üst köşe", 1000, 20, 1440, 900],
    ["tam köşe", 0, 0, 1440, 900],
    ["dar telefon", 160, 200, 320, 568],
  ];
  for (const [name, ix, iy, w, h] of cases) {
    it(`${name}: parçalar geçerli, kareyi örter`, () => {
      const plan = buildShards(ix, iy, w, h, mulberry(7));
      expect(plan.shards.length).toBeGreaterThan(20);
      let area = 0;
      for (const s of plan.shards) {
        expect(s.pts.length).toBeGreaterThanOrEqual(3);
        expect(Number.isFinite(s.cx) && Number.isFinite(s.cy)).toBe(true);
        expect(Number.isFinite(s.fallAt) && Number.isFinite(s.vx) && Number.isFinite(s.vy)).toBe(true);
        expect(s.bwCss).toBeGreaterThan(0);
        expect(s.bhCss).toBeGreaterThan(0);
        area += s.area;
      }
      // hücreler (w+4)×(h+4) dikdörtgenini örter; tırtıklı kenarlar paylaşıldığı için toplam neredeyse eşit
      expect(area / ((w + 4) * (h + 4))).toBeGreaterThan(0.97);
      expect(area / ((w + 4) * (h + 4))).toBeLessThan(1.03);
      expect(plan.Tsw).toBeGreaterThan(0);
      expect(plan.star).toHaveLength(14);
    });
  }
  it("aynı tohum aynı planı verir", () => {
    const a = buildShards(300, 300, 800, 600, mulberry(3));
    const b = buildShards(300, 300, 800, 600, mulberry(3));
    expect(a.shards.length).toBe(b.shards.length);
    expect(a.Tsw).toBe(b.Tsw);
  });
  it("uzak parçalar önce çizilir (azalan uzaklık)", () => {
    const plan = buildShards(500, 300, 1000, 600, mulberry(11));
    for (let i = 1; i < plan.shards.length; i++) expect(plan.shards[i - 1].d).toBeGreaterThanOrEqual(plan.shards[i].d);
  });
});

describe("scarPath", () => {
  it("çatlak uzunluğunu ve yol verisini döner", () => {
    const plan = buildShards(400, 250, 900, 500, mulberry(5));
    const scar = scarPath(plan);
    expect(scar.crack).toBeGreaterThan(0);
    expect(scar.d.startsWith("M")).toBe(true);
  });
});
