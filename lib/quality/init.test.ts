import { describe, expect, it } from "vitest";
import type { DetectEnv } from "./detect";
import { computeState } from "./init";

const strong: DetectEnv = {
  reducedMotion: false,
  webglOk: true,
  rendererName: "ANGLE (NVIDIA GeForce RTX 3060 Direct3D11)",
  cores: 12,
  memoryGb: 16,
  saveData: false,
  coarsePointer: false,
  savedTier: null,
};
const software: DetectEnv = { ...strong, rendererName: "Google SwiftShader" };

describe("computeState", () => {
  it("auto ise algılanan kademeyi kullanır", () => {
    expect(computeState({ env: strong, storedPref: "auto", urlPref: null })).toEqual({ preference: "auto", tier: "T3" });
    expect(computeState({ env: software, storedPref: "auto", urlPref: null })).toEqual({ preference: "auto", tier: "T0" });
  });
  it("URL tercihi kayıtlı tercihi geçer", () => {
    expect(computeState({ env: strong, storedPref: "yuksek", urlPref: "duz" })).toEqual({ preference: "duz", tier: "T0" });
  });
  it("kayıtlı tercih URL yoksa kullanılır", () => {
    expect(computeState({ env: strong, storedPref: "dusuk", urlPref: null })).toEqual({ preference: "dusuk", tier: "T1" });
  });
  it("kullanıcı seçimi algılamayı geçersiz kılar (spec 5.3 madde 6)", () => {
    expect(computeState({ env: software, storedPref: "auto", urlPref: "yuksek" })).toEqual({ preference: "yuksek", tier: "T3" });
    expect(computeState({ env: { ...strong, reducedMotion: true }, storedPref: "orta", urlPref: null })).toEqual({ preference: "orta", tier: "T2" });
  });
});
