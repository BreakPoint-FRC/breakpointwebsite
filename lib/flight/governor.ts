import { lowerTier, type TierId } from "../quality/tiers";
import type { FlightEngine } from "./engine";
import type { FlightQuality } from "./config";

/** Kare süresi hedefleri (ms): T3/T2 için 18, T1 için 34. */
export function targetMs(tier: TierId): number {
  return tier === "T1" ? 34 : 18;
}

/** Üst üste kaç pencere hedefi aşarsa bir adım atılır. */
export const OVER_WINDOWS = 2;
/** Her adımdan sonra yeniden ölçmeden önce yok sayılan pencere sayısı (yeniden boyutlama/derleme takılması). */
export const COOLDOWN_WINDOWS = 1;
/** Motor başladıktan sonra yok sayılan ilk pencere sayısı (gölgelendirici derleme, giriş düşüşü). */
export const WARMUP_WINDOWS = 1;
export const DPR_STEP = 0.25;
export const COUNT_STEP = 0.75;
/** Kıymık sayısının inebileceği taban (T1 değeri). */
export const COUNT_FLOOR = 1200;

export interface GovernorState {
  over: number;
  cooldown: number;
  warmup: number;
}

export function createGovernorState(): GovernorState {
  return { over: 0, cooldown: 0, warmup: WARMUP_WINDOWS };
}

export interface GovernorInfo {
  tier: TierId;
  hasBloom: boolean;
  dpr: number;
  count: number;
}

export type GovernorAction =
  | { kind: "none" }
  | { kind: "bloom" }
  | { kind: "dpr"; to: number }
  | { kind: "count"; to: number }
  | { kind: "tier"; to: TierId };

/**
 * Bir kare penceresi (ms ortalaması) sonrası karar. Sıra: bloom (MSAA çok örnekli bloom hedefiyle birlikte gider)
 * → DPR (0.25'lik adımlar, tabanı 1.0) → kıymık sayısı → kademe. Durum yerinde güncellenir.
 */
export function stepGovernor(state: GovernorState, ms: number, info: GovernorInfo): GovernorAction {
  if (state.warmup > 0) {
    state.warmup -= 1;
    return { kind: "none" };
  }
  if (state.cooldown > 0) {
    state.cooldown -= 1;
    state.over = 0;
    return { kind: "none" };
  }
  if (!(ms > targetMs(info.tier))) {
    state.over = 0;
    return { kind: "none" };
  }
  state.over += 1;
  if (state.over < OVER_WINDOWS) return { kind: "none" };
  state.over = 0;
  state.cooldown = COOLDOWN_WINDOWS;
  if (info.hasBloom) return { kind: "bloom" };
  if (info.dpr > 1.0 + 1e-6) return { kind: "dpr", to: Math.max(1.0, info.dpr - DPR_STEP) };
  const floor = Math.min(COUNT_FLOOR, info.count);
  if (info.count > floor) return { kind: "count", to: Math.max(floor, Math.round(info.count * COUNT_STEP)) };
  return { kind: "tier", to: lowerTier(info.tier) };
}

export interface Governor {
  window(ms: number, engine: FlightEngine): void;
}

/** Motoru kare süresine göre yönetir; kademe düşmesi gerekirse onTierDrop çağrılır (geri çıkılmaz). */
export function createGovernor(quality: FlightQuality, onTierDrop: (to: TierId) => void): Governor {
  const state = createGovernorState();
  let dropped = false;
  return {
    window(ms: number, engine: FlightEngine): void {
      if (dropped) return;
      const action = stepGovernor(state, ms, {
        tier: quality.tier,
        hasBloom: engine.hasBloom(),
        dpr: engine.dpr,
        count: engine.ambientCount(),
      });
      if (action.kind === "bloom") engine.killBloom();
      else if (action.kind === "dpr") engine.setDpr(action.to);
      else if (action.kind === "count") engine.setAmbientCount(action.to);
      else if (action.kind === "tier") {
        dropped = true;
        onTierDrop(action.to);
      }
    },
  };
}
