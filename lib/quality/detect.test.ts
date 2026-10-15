import { describe, expect, it } from "vitest";
import { detectStartTier, isSoftwareRenderer, type DetectEnv } from "./detect";

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

const env = (over: Partial<DetectEnv>): DetectEnv => ({ ...strong, ...over });

describe("isSoftwareRenderer", () => {
  it("yazılımsal çizicileri tanır", () => {
    for (const n of ["Google SwiftShader", "llvmpipe (LLVM 15.0.7, 256 bits)", "Microsoft Basic Render Driver", "softpipe"]) {
      expect(isSoftwareRenderer(n)).toBe(true);
    }
  });
  it("gerçek GPU'ları ve null'ı yazılımsal saymaz", () => {
    expect(isSoftwareRenderer("ANGLE (Intel(R) UHD Graphics 620 Direct3D11)")).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
  });
});

describe("detectStartTier: sert kurallar", () => {
  it("hareket azaltma → T0", () => {
    expect(detectStartTier(env({ reducedMotion: true }))).toBe("T0");
  });
  it("WebGL yok ya da başarısız → T0", () => {
    expect(detectStartTier(env({ webglOk: false }))).toBe("T0");
  });
  it("yazılımsal çizici → T0", () => {
    expect(detectStartTier(env({ rendererName: "Google SwiftShader" }))).toBe("T0");
    expect(detectStartTier(env({ rendererName: "llvmpipe (LLVM 15)" }))).toBe("T0");
  });
});

describe("detectStartTier: temel kademe", () => {
  it("güçlü masaüstü → T3", () => {
    expect(detectStartTier(strong)).toBe("T3");
  });
  it("çizici adı okunamasa da (null) T3'ten başlar", () => {
    expect(detectStartTier(env({ rendererName: null }))).toBe("T3");
  });
  it("dokunmatik/mobil → en çok T2", () => {
    expect(detectStartTier(env({ coarsePointer: true }))).toBe("T2");
  });
});

describe("detectStartTier: zayıf donanım bir kademe düşürür", () => {
  it("≤4 çekirdek → T2", () => {
    expect(detectStartTier(env({ cores: 4 }))).toBe("T2");
  });
  it("≤4 GB bellek → T2", () => {
    expect(detectStartTier(env({ memoryGb: 4 }))).toBe("T2");
  });
  it("veri tasarrufu → T2", () => {
    expect(detectStartTier(env({ saveData: true }))).toBe("T2");
  });
  it("bilinmeyen çekirdek ve bellek (null) zayıf sayılmaz", () => {
    expect(detectStartTier(env({ cores: null, memoryGb: null }))).toBe("T3");
  });
  it("birden fazla zayıf sinyal yine tek kademe düşürür", () => {
    expect(detectStartTier(env({ cores: 2, memoryGb: 2, saveData: true }))).toBe("T2");
  });
  it("mobil + zayıf → T1", () => {
    expect(detectStartTier(env({ coarsePointer: true, cores: 4 }))).toBe("T1");
  });
});

describe("detectStartTier: sınır ve eksik durumlar", () => {
  it("5 çekirdek ve 8 GB zayıf sayılmaz (sınır ≤4)", () => {
    expect(detectStartTier(env({ cores: 5, memoryGb: 8 }))).toBe("T3");
  });
  it("5 GB bellek zayıf sayılmaz", () => {
    expect(detectStartTier(env({ memoryGb: 5 }))).toBe("T3");
  });
  it("'Basic Render' ve softpipe adları detectStartTier üzerinden T0 verir", () => {
    expect(detectStartTier(env({ rendererName: "Microsoft Basic Render Driver" }))).toBe("T0");
    expect(detectStartTier(env({ rendererName: "softpipe" }))).toBe("T0");
  });
  it("dokunmatik + veri tasarrufu → T1; T1'den daha aşağı inmez", () => {
    expect(detectStartTier(env({ coarsePointer: true, saveData: true }))).toBe("T1");
    expect(detectStartTier(env({ coarsePointer: true, cores: 2, memoryGb: 2, saveData: true }))).toBe("T1");
  });
});

describe("detectStartTier: kayıtlı kademe", () => {
  it("kayıtlı T0 (governor 3B'yi kapatmıştı) bir sonraki açılışta da T0 verir", () => {
    expect(detectStartTier(env({ savedTier: "T0" }))).toBe("T0");
  });
  it("dokunmatik + kayıtlı T1 → T1", () => {
    expect(detectStartTier(env({ coarsePointer: true, savedTier: "T1" }))).toBe("T1");
  });
  it("daha düşük kayıtlı kademeden başlar", () => {
    expect(detectStartTier(env({ savedTier: "T1" }))).toBe("T1");
  });
  it("kayıtlı kademe hiçbir zaman hesaplanandan yüksek olamaz", () => {
    expect(detectStartTier(env({ cores: 4, savedTier: "T3" }))).toBe("T2");
  });
  it("kayıtlı kademe sert kuralları aşamaz", () => {
    expect(detectStartTier(env({ reducedMotion: true, savedTier: "T3" }))).toBe("T0");
  });
});
