"use client";

import { useEffect } from "react";
import { startQuality } from "@/lib/quality/runtime";

// WebGL yoklaması (GPU süreci başlatabilir) hidrasyon yolundan çıkarılır: sayfa yüklendikten sonra,
// tarayıcı boştayken çalışır. O ana kadar data-tier sunucu varsayılanı "T0" kalır.
const IDLE_TIMEOUT_MS = 1500;
const FALLBACK_DELAY_MS = 200;

export function QualityBoot() {
  useEffect(() => {
    let cancel: () => void;
    const run = (): void => {
      void startQuality();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(run, FALLBACK_DELAY_MS);
      cancel = () => window.clearTimeout(id);
    }
    return cancel;
  }, []);
  return null;
}
