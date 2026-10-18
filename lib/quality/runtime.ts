import type { DetectEnv } from "./detect";
import { collectEnv, refreshEnv } from "./env";
import { measureFrameIntervalMs } from "./frame";
import { computeState } from "./init";
import { parseKaliteParam } from "./resolve";
import { getState, setState, type QualityState } from "./store";
import { clearSavedTier, readPreference, safeLocalStorage, writePreference, writeSavedTier } from "./storage";
import type { Preference, TierId } from "./tiers";

let cachedEnv: DetectEnv | null = null;
let frameMs: number | null = null;

/** Boşta ölçülen ekran yenileme aralığı (ms); ölçüm bitmediyse ya da güvenilmezse null. */
export function getFrameMs(): number | null {
  return frameMs;
}

function apply(next: Omit<QualityState, "ready">): void {
  // DOM önce: dinleyici fırlatsa bile öznitelikler güncel kalır.
  document.documentElement.dataset.tier = next.tier;
  // Algılama bitti sinyali: 3B bu öznitelik (ve store.ready) gelmeden başlamaz.
  document.documentElement.dataset.tierReady = "1";
  setState({ ...next, ready: true });
}

/** Tespit: WebGL yoklaması işçide (ana iş parçacığını bloklamadan) çalışır; bitince kademe ve `ready` yazılır. */
export async function startQuality(): Promise<void> {
  // Ölçüm tespiti beklemez ve `ready`'yi geciktirmez; governor değeri her pencerede okur.
  void measureFrameIntervalMs().then((ms) => {
    frameMs = ms;
  });
  try {
    const env = await collectEnv();
    cachedEnv = env;
    apply(
      computeState({
        env,
        storedPref: readPreference(safeLocalStorage()),
        urlPref: parseKaliteParam(window.location.search),
      }),
    );
  } catch {
    document.documentElement.dataset.tier = "T0";
    document.documentElement.dataset.tierReady = "1";
    setState({ tier: "T0", preference: "auto", ready: true });
  }
}

export async function choosePreference(pref: Preference): Promise<void> {
  try {
    writePreference(safeLocalStorage(), pref);
    // "Otomatik" tespiti sıfırdan başlatır: governor'un önceki oturumlarda kaydettiği düşüş de unutulur.
    if (pref === "auto") clearSavedTier(safeLocalStorage());
    const env = cachedEnv ? refreshEnv(cachedEnv) : await collectEnv();
    cachedEnv = env;
    apply(computeState({ env, storedPref: pref, urlPref: null }));
  } catch {
    // WebGL yoklaması ya da depolama başarısız: mevcut durum korunur.
  }
}

/**
 * Çalışma zamanı düşüşü: kademeyi indirir, tercihi DEĞİŞTİRMEZ; kademe oturum boyunca geri çıkmaz.
 * persist=true yalnız governor'un ölçtüğü ve belirgin kötü olan düşüşlerde kullanılır: tek seferlik bir hata
 * (parça yüklenemedi, bağlam kaybı) ya da sınırda bir ölçüm kullanıcıyı sonraki ziyaretlerde düşük kademeye kilitlemesin.
 */
export function downgradeTo(tier: TierId, persist = false): void {
  if (persist) {
    try {
      writeSavedTier(safeLocalStorage(), tier);
    } catch {
      // depolama yoksa yalnız bu oturum için düşer
    }
  }
  apply({ tier, preference: getState().preference });
}
