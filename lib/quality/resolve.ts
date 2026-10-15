import { isPreference, PREFERENCE_TIER, type Preference, type TierId } from "./tiers";

export function parseKaliteParam(search: string): Preference | null {
  try {
    const v = new URLSearchParams(search).get("kalite");
    return isPreference(v) ? v : null;
  } catch {
    return null;
  }
}

export function resolveTier(pref: Preference, detected: TierId): TierId {
  return pref === "auto" ? detected : PREFERENCE_TIER[pref];
}
