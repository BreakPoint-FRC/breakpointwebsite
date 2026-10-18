import { describe, expect, it } from "vitest";
import { medianFrameMs } from "./frame";

/** Sabit aralıklı damga dizisi (ms). */
function stamps(interval: number, count: number, start = 1000): number[] {
  return Array.from({ length: count }, (_, i) => start + i * interval);
}

describe("medianFrameMs", () => {
  it("60 Hz, 30 Hz ve 144 Hz aralıklarını bulur", () => {
    expect(medianFrameMs(stamps(16.67, 40))).toBeCloseTo(16.67, 1);
    expect(medianFrameMs(stamps(33.33, 40))).toBeCloseTo(33.33, 1);
    expect(medianFrameMs(stamps(6.94, 40))).toBeCloseTo(6.94, 1);
  });
  it("tek tük takılmaya dayanıklı (medyan)", () => {
    const s = stamps(16.67, 40);
    for (let i = 20; i < 40; i++) s[i] += 120; // tek bir 120 ms takılma
    expect(medianFrameMs(s)).toBeCloseTo(16.67, 1);
  });
  it("ısınma aralıklarını atar", () => {
    const s = stamps(16.67, 6); // ilk 5 aralık yavaş
    let t = s[s.length - 1];
    for (let i = 0; i < 5; i++) {
      t += 200;
      s.push(t);
    }
    for (let i = 0; i < 30; i++) {
      t += 16.67;
      s.push(t);
    }
    expect(medianFrameMs(s)).toBeCloseTo(16.67, 1);
  });
  it("yeterli örnek yoksa ya da veri bozuksa null döner", () => {
    expect(medianFrameMs([])).toBeNull();
    expect(medianFrameMs(stamps(16.67, 10))).toBeNull();
    expect(medianFrameMs(stamps(0, 40))).toBeNull();
    expect(medianFrameMs(Array.from({ length: 40 }, () => Number.NaN))).toBeNull();
  });
});
