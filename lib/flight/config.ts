import type { TierId, TierSpec } from "../quality/tiers";

/** Tüm kaydırma-geçiş uzunluklarının tek ayar sabiti. 1 = ilk sürüm hızı; 1.65 = kullanıcı isteği (daha yavaş). */
export const PACE = 1.65;
/** Robot ve final evreleri için yumuşatılmış çarpan. */
export const PACE_R = 1 + (PACE - 1) * 0.4;

/** Robot zaman çizelgesi (0..1). "pre": robot istasyonuna yaklaşırken başlayan pay. */
export const PH = {
  start: [0, 0.26, 0.5, 0.74],
  end: [0.26, 0.5, 0.74, 0.92],
  pre: 0.06,
} as const;

export interface FlightQuality {
  tier: TierId;
  ambientShards: number;
  dprMax: number;
  msaa: boolean;
  bloom: boolean;
  grain: boolean;
  /** Kaydırma durunca döngü uyur (T1). */
  onDemand: boolean;
  /** Ayrıntı azaltılmış (düşük kademe ya da dokunmatik/dar ekran): robot %50, daha az toz/yazı kıymığı. */
  lite: boolean;
  coarse: boolean;
}

export function deriveQuality(spec: TierSpec, coarse: boolean): FlightQuality {
  return {
    tier: spec.id,
    ambientShards: spec.ambientShards,
    dprMax: spec.dprMax,
    msaa: spec.msaa,
    bloom: spec.bloom,
    grain: spec.grain,
    onDemand: spec.onDemand,
    lite: spec.id === "T1" || coarse,
    coarse,
  };
}
