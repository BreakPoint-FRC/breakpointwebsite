import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectEnv } from "./detect";
import { PREF_KEY, TIER_KEY, readSavedTier, writeSavedTier, type StorageLike } from "./storage";

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

vi.mock("./env", async () => {
  const storage = await import("./storage");
  return {
    collectEnv: async () => ({ ...strong, savedTier: storage.readSavedTier(storage.safeLocalStorage()) }),
    refreshEnv: (env: DetectEnv) => ({ ...env, savedTier: storage.readSavedTier(storage.safeLocalStorage()) }),
  };
});
vi.mock("./frame", () => ({ measureFrameIntervalMs: async () => 16.7 }));

function memory(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("kalite çalışma zamanı", () => {
  let store: ReturnType<typeof memory>;

  beforeEach(() => {
    vi.resetModules();
    store = memory();
    vi.stubGlobal("window", { localStorage: store, location: { search: "" } });
    vi.stubGlobal("document", { documentElement: { dataset: {} } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("kayıtlı düşüş otomatik başlangıç kademesini aşağı çeker", async () => {
    writeSavedTier(store, "T1");
    const rt = await import("./runtime");
    const { getState } = await import("./store");
    await rt.startQuality();
    expect(getState().tier).toBe("T1");
  });

  it("\"Otomatik\" seçilince kayıtlı düşüş silinir ve algılanan kademeye dönülür", async () => {
    writeSavedTier(store, "T0");
    const rt = await import("./runtime");
    const { getState } = await import("./store");
    await rt.startQuality();
    expect(getState().tier).toBe("T0");
    await rt.choosePreference("auto");
    expect(store.data[TIER_KEY]).toBeUndefined();
    expect(readSavedTier(store)).toBeNull();
    expect(store.data[PREF_KEY]).toBe("auto");
    expect(getState()).toMatchObject({ preference: "auto", tier: "T3", ready: true });
  });

  it("elle kademe seçmek kayıtlı düşüşe dokunmaz (yalnız Otomatik siler)", async () => {
    writeSavedTier(store, "T1");
    const rt = await import("./runtime");
    await rt.startQuality();
    await rt.choosePreference("orta");
    expect(readSavedTier(store)).toBe("T1");
  });

  it("ölçülen yenileme aralığı startQuality sonrası okunur", async () => {
    const rt = await import("./runtime");
    expect(rt.getFrameMs()).toBeNull();
    await rt.startQuality();
    await Promise.resolve();
    expect(rt.getFrameMs()).toBe(16.7);
  });
});
