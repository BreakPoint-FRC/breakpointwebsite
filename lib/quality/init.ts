import { detectStartTier, type DetectEnv } from "./detect";
import { resolveTier } from "./resolve";
import type { QualityState } from "./store";
import type { Preference } from "./tiers";

export interface InitInput {
  env: DetectEnv;
  storedPref: Preference;
  urlPref: Preference | null;
}

export function computeState(input: InitInput): Omit<QualityState, "ready"> {
  const preference = input.urlPref ?? input.storedPref;
  return { preference, tier: resolveTier(preference, detectStartTier(input.env)) };
}
