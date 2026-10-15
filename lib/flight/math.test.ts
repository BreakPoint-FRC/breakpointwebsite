import { describe, expect, it } from "vitest";
import { clamp, lerp, mulberry, sstep, sstep5 } from "./math";

describe("math", () => {
  it("clamp sınırlar", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it("sstep uçları ve ortası", () => {
    expect(sstep(0, 1, -1)).toBe(0);
    expect(sstep(0, 1, 2)).toBe(1);
    expect(sstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });
  it("sstep ters aralıkta (a>b) azalan eğri verir", () => {
    expect(sstep(1, 0.68, 1)).toBe(0);
    expect(sstep(1, 0.68, 0.5)).toBe(1);
  });
  it("sstep5 uçları ve ortası", () => {
    expect(sstep5(0, 1, 0)).toBe(0);
    expect(sstep5(0, 1, 1)).toBe(1);
    expect(sstep5(0, 1, 0.5)).toBeCloseTo(0.5);
  });
  it("lerp", () => {
    expect(lerp(2, 4, 0.5)).toBe(3);
  });
  it("mulberry aynı tohumla aynı diziyi, [0,1) aralığında verir", () => {
    const a = mulberry(5);
    const b = mulberry(5);
    for (let i = 0; i < 20; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
