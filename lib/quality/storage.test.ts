import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PREF_KEY,
  TIER_KEY,
  readPreference,
  readSavedTier,
  safeLocalStorage,
  writePreference,
  writeSavedTier,
  type StorageLike,
} from "./storage";

function memory(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error("erişim yok");
  },
  setItem: () => {
    throw new Error("erişim yok");
  },
};

describe("tercih", () => {
  it("yazıp geri okur", () => {
    const s = memory();
    expect(writePreference(s, "duz")).toBe(true);
    expect(s.data[PREF_KEY]).toBe("duz");
    expect(readPreference(s)).toBe("duz");
  });
  it("kayıt yoksa ya da bozuksa auto döner", () => {
    expect(readPreference(memory())).toBe("auto");
    expect(readPreference(memory({ [PREF_KEY]: "YUKSEK" }))).toBe("auto");
    expect(readPreference(memory({ [PREF_KEY]: "" }))).toBe("auto");
  });
  it("depolama yoksa auto döner, yazma false döner", () => {
    expect(readPreference(null)).toBe("auto");
    expect(writePreference(null, "orta")).toBe(false);
  });
  it("depolama hata fırlatırsa çökmez", () => {
    expect(readPreference(throwing)).toBe("auto");
    expect(writePreference(throwing, "orta")).toBe(false);
  });
});

describe("kayıtlı kademe", () => {
  it("yazıp geri okur", () => {
    const s = memory();
    expect(writeSavedTier(s, "T1")).toBe(true);
    expect(s.data[TIER_KEY]).toBe("T1");
    expect(readSavedTier(s)).toBe("T1");
  });
  it("yok, bozuk ya da hata durumunda null döner", () => {
    expect(readSavedTier(memory())).toBeNull();
    expect(readSavedTier(memory({ [TIER_KEY]: "T9" }))).toBeNull();
    expect(readSavedTier(null)).toBeNull();
    expect(readSavedTier(throwing)).toBeNull();
    expect(writeSavedTier(throwing, "T2")).toBe(false);
    expect(writeSavedTier(null, "T2")).toBe(false);
  });
});

describe("safeLocalStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tarayıcı olmayan ortamda null döner", () => {
    expect(safeLocalStorage()).toBeNull();
  });
  it("window.localStorage erişimi hata fırlatırsa null döner", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("engellendi");
      },
    });
    expect(safeLocalStorage()).toBeNull();
  });
  it("erişilebilirse window.localStorage nesnesini döner", () => {
    const fake = memory();
    vi.stubGlobal("window", { localStorage: fake });
    expect(safeLocalStorage()).toBe(fake);
  });
});
