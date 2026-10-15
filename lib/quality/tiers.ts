export const TIER_IDS = ["T3", "T2", "T1", "T0"] as const;
export type TierId = (typeof TIER_IDS)[number];

export const PREFERENCES = ["auto", "yuksek", "orta", "dusuk", "duz"] as const;
export type Preference = (typeof PREFERENCES)[number];

export interface TierSpec {
  id: TierId;
  label: string;
  ambientShards: number;
  dprMax: number;
  msaa: boolean;
  bloom: boolean;
  grain: boolean;
  onDemand: boolean;
  threeD: boolean;
}

export const TIERS: Record<TierId, TierSpec> = {
  T3: { id: "T3", label: "Yüksek", ambientShards: 7000, dprMax: 1.75, msaa: true, bloom: true, grain: true, onDemand: false, threeD: true },
  T2: { id: "T2", label: "Orta", ambientShards: 3500, dprMax: 1.25, msaa: false, bloom: false, grain: false, onDemand: false, threeD: true },
  T1: { id: "T1", label: "Düşük", ambientShards: 1200, dprMax: 1.0, msaa: false, bloom: false, grain: false, onDemand: true, threeD: true },
  T0: { id: "T0", label: "Düz", ambientShards: 0, dprMax: 1.0, msaa: false, bloom: false, grain: false, onDemand: false, threeD: false },
};

export const PREFERENCE_TIER: Record<Exclude<Preference, "auto">, TierId> = {
  yuksek: "T3",
  orta: "T2",
  dusuk: "T1",
  duz: "T0",
};

const RANK: Record<TierId, number> = { T3: 3, T2: 2, T1: 1, T0: 0 };

export function lowerTier(t: TierId): TierId {
  const next = Math.min(TIER_IDS.indexOf(t) + 1, TIER_IDS.length - 1);
  return TIER_IDS[next];
}

export function worseOf(a: TierId, b: TierId): TierId {
  return RANK[a] <= RANK[b] ? a : b;
}

export function isTierId(v: unknown): v is TierId {
  return typeof v === "string" && (TIER_IDS as readonly string[]).includes(v);
}

export function isPreference(v: unknown): v is Preference {
  return typeof v === "string" && (PREFERENCES as readonly string[]).includes(v);
}
