import { lowerTier, type TierId } from "../quality/tiers";
import type { FlightEngine } from "./engine";
import type { FlightQuality } from "./config";

/** Yenileme aralığının üstüne tanınan pay: 60 Hz'de 16.7 × 1.08 ≈ 18.04 (taban hedefle pratikte aynı), 30 Hz'de ≈ 36. */
export const REFRESH_HEADROOM = 1.08;
/** Ölçülen yenileme aralığı bunun üstündeyse güvenilmez sayılır (geçici yük, kısılmış sekme) ve yok sayılır. */
export const MAX_TRUSTED_FRAME_MS = 40;
/** Kademe düşüşü, ortalama süre hedefin bu katını aşıyorsa "belirgin kötü" sayılır ve sonraki ziyaretler için kaydedilir. */
export const SEVERE_FACTOR = 1.5;

/**
 * Kare süresi hedefleri (ms): T3/T2 için 18, T1 için 34. Kare süresi rAF aralığıyla ölçülür, yani ekranın
 * yenileme hızına (ve düşük güç modunun 30 fps sınırına) bağlıdır; ölçülen aralık varsa hedef onun altına inmez.
 */
export function targetMs(tier: TierId, frameMs: number | null = null): number {
  const base = tier === "T1" ? 34 : 18;
  return isTrustedFrameMs(frameMs) ? Math.max(base, frameMs * REFRESH_HEADROOM) : base;
}

export function isTrustedFrameMs(frameMs: number | null | undefined): frameMs is number {
  return typeof frameMs === "number" && Number.isFinite(frameMs) && frameMs > 0 && frameMs <= MAX_TRUSTED_FRAME_MS;
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
  /** Ardışık aşan pencerelerin süre toplamı (kademe düşüşünün ne kadar kötü olduğunu ölçmek için). */
  overMs: number;
  cooldown: number;
  warmup: number;
}

export function createGovernorState(): GovernorState {
  return { over: 0, overMs: 0, cooldown: 0, warmup: WARMUP_WINDOWS };
}

export interface GovernorInfo {
  tier: TierId;
  hasBloom: boolean;
  dpr: number;
  count: number;
  /** Boşta ölçülen rAF aralığı (ms); bilinmiyorsa null/yok. */
  frameMs?: number | null;
}

export type GovernorAction =
  | { kind: "none" }
  | { kind: "bloom" }
  | { kind: "dpr"; to: number }
  | { kind: "count"; to: number }
  | { kind: "tier"; to: TierId; severe: boolean };

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
    state.overMs = 0;
    return { kind: "none" };
  }
  const target = targetMs(info.tier, info.frameMs ?? null);
  if (!(ms > target)) {
    state.over = 0;
    state.overMs = 0;
    return { kind: "none" };
  }
  state.over += 1;
  state.overMs += ms;
  if (state.over < OVER_WINDOWS) return { kind: "none" };
  // Yenileme hızı ölçülemediyse (30 Hz sınırı ile gerçekten yavaş cihaz ayırt edilemez) kalıcı kayıt güvenli değildir.
  const severe = isTrustedFrameMs(info.frameMs) && state.overMs / state.over > target * SEVERE_FACTOR;
  state.over = 0;
  state.overMs = 0;
  state.cooldown = COOLDOWN_WINDOWS;
  if (info.hasBloom) return { kind: "bloom" };
  if (info.dpr > 1.0 + 1e-6) return { kind: "dpr", to: Math.max(1.0, info.dpr - DPR_STEP) };
  const floor = Math.min(COUNT_FLOOR, info.count);
  if (info.count > floor) return { kind: "count", to: Math.max(floor, Math.round(info.count * COUNT_STEP)) };
  return { kind: "tier", to: lowerTier(info.tier), severe };
}

export interface Governor {
  window(ms: number, engine: FlightEngine): void;
}

/**
 * Motoru kare süresine göre yönetir; kademe düşmesi gerekirse onTierDrop çağrılır (oturum içinde geri çıkılmaz).
 * `severe` yalnız belirgin kötü düşüşte true'dur: ancak o zaman sonraki ziyaretler için kaydetmek doğrudur.
 * getFrameMs her pencerede okunur: yenileme hızı ölçümü motor başladıktan sonra da gelebilir.
 */
export function createGovernor(
  quality: FlightQuality,
  onTierDrop: (to: TierId, severe: boolean) => void,
  getFrameMs: () => number | null = () => null,
): Governor {
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
        frameMs: getFrameMs(),
      });
      if (action.kind === "bloom") engine.killBloom();
      else if (action.kind === "dpr") engine.setDpr(action.to);
      else if (action.kind === "count") engine.setAmbientCount(action.to);
      else if (action.kind === "tier") {
        dropped = true;
        onTierDrop(action.to, action.severe);
      }
    },
  };
}
