import { describe, expect, it } from "vitest";
import { cardOutline, centroid, fanShards, polygonCss, type Pt } from "./shards";

const area = (pts: Pt[]): number => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
};

describe("fanShards", () => {
  const w = 300;
  const h = 420;
  const outline = cardOutline(w, h, 22);

  it("kartı boşluksuz ve çakışmasız kaplar", () => {
    const shards = fanShards(outline, { x: 120, y: 200 }, 90);
    const total = shards.reduce((sum, s) => sum + area(s), 0);
    expect(total).toBeCloseTo(area(outline), 3);
  });

  it("kenar başına en az bir parça üretir", () => {
    expect(fanShards(outline, { x: 150, y: 210 }, 1000)).toHaveLength(outline.length);
  });

  it("daha küçük adım daha çok parça verir", () => {
    const coarse = fanShards(outline, { x: 150, y: 210 }, 150).length;
    const fine = fanShards(outline, { x: 150, y: 210 }, 60).length;
    expect(fine).toBeGreaterThan(coarse);
  });
});

describe("yardımcılar", () => {
  it("polygonCss clip-path dizgesi üretir", () => {
    expect(polygonCss([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }])).toBe("polygon(0.0px 0.0px, 10.0px 0.0px, 0.0px 5.0px)");
  });

  it("centroid üçgenin ağırlık merkezini verir", () => {
    const c = centroid([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 9 }]);
    expect(c).toEqual({ x: 2, y: 3 });
  });
});
