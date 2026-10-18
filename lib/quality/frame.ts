/** Ölçüme alınmayan ilk aralık sayısı (sayfa hâlâ oturuyor, rAF ritmi oturmamış olabilir). */
const SKIP_INTERVALS = 6;
const SAMPLE_INTERVALS = 30;
/** rAF hiç gelmezse (arka plan sekmesi) ölçüm bırakılır: yanlış değer vermektense null. */
const TIMEOUT_MS = 2500;

/**
 * rAF zaman damgalarından ekran yenileme aralığı (ms): ısınma aralıkları atılır, kalanın medyanı alınır.
 * Medyan, tek tük takılmalara (GC, yazı tipi) dayanıklıdır. Yeterli örnek yoksa null.
 */
export function medianFrameMs(stamps: readonly number[]): number | null {
  const intervals: number[] = [];
  for (let i = 1; i < stamps.length; i++) intervals.push(stamps[i] - stamps[i - 1]);
  const usable = intervals.slice(SKIP_INTERVALS).filter((v) => Number.isFinite(v) && v > 0);
  if (usable.length < 8) return null;
  usable.sort((a, b) => a - b);
  const mid = usable.length >> 1;
  return usable.length % 2 ? usable[mid] : (usable[mid - 1] + usable[mid]) / 2;
}

/**
 * Boştaki sayfada rAF aralığını ölçer: 3B başlamadan önce ekranın gerçek ritmini (60/120/144 Hz ya da düşük güç
 * modunun 30 fps sınırını) verir. Governor kare süresini rAF aralığıyla ölçtüğü için hedef bu tabana göre ayarlanır.
 */
export function measureFrameIntervalMs(): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function" || document.hidden) {
      resolve(null);
      return;
    }
    const stamps: number[] = [];
    let rafId = 0;
    const timer = window.setTimeout(() => {
      cancelAnimationFrame(rafId);
      resolve(null);
    }, TIMEOUT_MS);
    const tick = (now: number): void => {
      stamps.push(now);
      if (stamps.length > SKIP_INTERVALS + SAMPLE_INTERVALS) {
        window.clearTimeout(timer);
        resolve(medianFrameMs(stamps));
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  });
}
