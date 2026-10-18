import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PREF_KEY,
  SAVED_TIER_TTL_MS,
  TIER_KEY,
  clearSavedTier,
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
    removeItem: (k) => {
      delete data[k];
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
  removeItem: () => {
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
  const NOW = 1_700_000_000_000;

  it("zaman damgasıyla yazıp geri okur", () => {
    const s = memory();
    expect(writeSavedTier(s, "T1", NOW)).toBe(true);
    expect(s.data[TIER_KEY]).toBe(`T1@${NOW}`);
    expect(readSavedTier(s, NOW + 1000)).toBe("T1");
  });
  it("süre dolunca unutulur (TTL sınırı dahil)", () => {
    const s = memory();
    writeSavedTier(s, "T0", NOW);
    expect(readSavedTier(s, NOW + SAVED_TIER_TTL_MS - 1)).toBe("T0");
    expect(readSavedTier(s, NOW + SAVED_TIER_TTL_MS)).toBeNull();
  });
  it("zaman damgasız eski biçim ve gelecekteki damga güvenilmez, null döner", () => {
    expect(readSavedTier(memory({ [TIER_KEY]: "T1" }), NOW)).toBeNull();
    expect(readSavedTier(memory({ [TIER_KEY]: "T1@" }), NOW)).toBeNull();
    expect(readSavedTier(memory({ [TIER_KEY]: `T1@${NOW + 5000}` }), NOW)).toBeNull();
  });
  it("yok, bozuk ya da hata durumunda null döner", () => {
    expect(readSavedTier(memory(), NOW)).toBeNull();
    expect(readSavedTier(memory({ [TIER_KEY]: `T9@${NOW}` }), NOW)).toBeNull();
    expect(readSavedTier(memory({ [TIER_KEY]: "T1@abc" }), NOW)).toBeNull();
    expect(readSavedTier(null, NOW)).toBeNull();
    expect(readSavedTier(throwing, NOW)).toBeNull();
    expect(writeSavedTier(throwing, "T2", NOW)).toBe(false);
    expect(writeSavedTier(null, "T2", NOW)).toBe(false);
  });
  it("silinir; depolama yoksa ya da hata verirse çökmeden false döner", () => {
    const s = memory();
    writeSavedTier(s, "T1", NOW);
    expect(clearSavedTier(s)).toBe(true);
    expect(readSavedTier(s, NOW)).toBeNull();
    expect(clearSavedTier(null)).toBe(false);
    expect(clearSavedTier(throwing)).toBe(false);
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
