import { describe, expect, it } from "vitest";
import { homography } from "./slabs";

function parse(m: string): number[] {
  const inner = m.slice("matrix3d(".length, -1);
  return inner.split(",").map(Number);
}

/** CSS matrix3d (sütun öncelikli) ile (x, y) noktasını dönüştürür. */
function apply(m: number[], x: number, y: number): [number, number] {
  const X = m[0] * x + m[4] * y + m[12];
  const Y = m[1] * x + m[5] * y + m[13];
  const W = m[3] * x + m[7] * y + m[15];
  return [X / W, Y / W];
}

describe("homography", () => {
  it("birim dönüşüm: dikdörtgeni kendi köşelerine eşler", () => {
    const m = parse(homography(200, 100, [0, 0, 200, 0, 200, 100, 0, 100]) ?? "matrix3d()");
    for (const [x, y] of [[0, 0], [200, 0], [200, 100], [0, 100]] as const) {
      const [px, py] = apply(m, x, y);
      expect(px).toBeCloseTo(x, 3);
      expect(py).toBeCloseTo(y, 3);
    }
  });
  it("perspektifli dörtgen: dört köşe doğru eşlenir", () => {
    const quad = [100, 50, 420, 80, 400, 300, 120, 340];
    const m = parse(homography(300, 200, quad) ?? "matrix3d()");
    const corners: Array<[number, number]> = [[0, 0], [300, 0], [300, 200], [0, 200]];
    corners.forEach(([x, y], i) => {
      const [px, py] = apply(m, x, y);
      expect(px).toBeCloseTo(quad[i * 2], 1);
      expect(py).toBeCloseTo(quad[i * 2 + 1], 1);
    });
  });
  it("dejenere (tüm köşeler aynı çizgide) null döner", () => {
    expect(homography(100, 100, [0, 0, 10, 0, 20, 0, 30, 0])).toBeNull();
  });
});
