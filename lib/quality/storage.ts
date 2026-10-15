import { isPreference, isTierId, type Preference, type TierId } from "./tiers";

export const PREF_KEY = "bp-kalite";
export const TIER_KEY = "bp-kalite-son";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

export function readSavedTier(storage: StorageLike | null): TierId | null {
  if (!storage) return null;
  try {
    const v = storage.getItem(TIER_KEY);
    return isTierId(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeSavedTier(storage: StorageLike | null, tier: TierId): boolean {
  if (!storage) return false;
  try {
    storage.setItem(TIER_KEY, tier);
    return true;
  } catch {
    return false;
  }
}
