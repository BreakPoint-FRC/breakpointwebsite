import { isPreference, isTierId, type Preference, type TierId } from "./tiers";

export const PREF_KEY = "bp-kalite";
export const TIER_KEY = "bp-kalite-son";

/** Governor'un kaydettiği düşüş bu süre sonra unutulur: tek kötü oturum cihazı kalıcı olarak düşük kademede bırakmasın. */
export const SAVED_TIER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function safeLocalStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPreference(storage: StorageLike | null): Preference {
  if (!storage) return "auto";
  try {
    const v = storage.getItem(PREF_KEY);
    return isPreference(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

export function writePreference(storage: StorageLike | null, pref: Preference): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PREF_KEY, pref);
    return true;
  } catch {
    return false;
  }
}

/** Kayıt biçimi `T1@<ms>`; süresi dolmuş, zaman damgasız (eski biçim) ya da bozuk kayıt null sayılır. */
export function readSavedTier(storage: StorageLike | null, now: number = Date.now()): TierId | null {
  if (!storage) return null;
  try {
    const [tier, stamp] = (storage.getItem(TIER_KEY) ?? "").split("@");
    const at = Number(stamp);
    if (!isTierId(tier) || !stamp || !Number.isFinite(at)) return null;
    // at > now: saat geri alınmış, kayıt güvenilmez
    return at <= now && now - at < SAVED_TIER_TTL_MS ? tier : null;
  } catch {
    return null;
  }
}

export function writeSavedTier(storage: StorageLike | null, tier: TierId, now: number = Date.now()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(TIER_KEY, `${tier}@${now}`);
    return true;
  } catch {
    return false;
  }
}

/** Kullanıcı "Otomatik"i seçince kayıtlı düşüş silinir: algılama sıfırdan başlar. */
export function clearSavedTier(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(TIER_KEY);
    return true;
  } catch {
    return false;
  }
}
