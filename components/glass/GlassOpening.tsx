"use client";

import { useEffect, useRef } from "react";
import { createGlassOpening, type GlassController } from "@/lib/glass/opening";
import { useQuality } from "@/lib/quality/useQuality";

// Düşük kademelerde cam açılış daha az piksel çizer (spec 5.5).
const LOW_SCALE = 0.6;
// İlk çizim hidrasyon görevinden ayrılır: boşta çalışır (en geç IDLE_TIMEOUT_MS sonra). O ana dek cam yalnız CSS
// ile (yarı saydam örtü) görünür; canvas hazır olunca yönerge ve nabız halkası çizilir.
const IDLE_TIMEOUT_MS = 500;
const FALLBACK_DELAY_MS = 60;

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
}

/** Tespit bitmeden ilk çizim için kaba tahmin: dokunmatik/dar ekran ya da ≤4 çekirdek/≤4 GB → düşük çözünürlük. */
function guessInitialScale(): number {
  const nav = navigator as NavigatorHints;
  const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
  const weak = (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) || (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4);
  return coarse || weak ? LOW_SCALE : 1;
}

export function GlassOpening() {
  const glassRef = useRef<HTMLButtonElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<GlassController | null>(null);
  const { tier, ready } = useQuality();

  useEffect(() => {
    const glass = glassRef.current;
    const base = baseRef.current;
    const fx = fxRef.current;
    const site = document.getElementById("site");
    if (!glass || !base || !fx || !site) return;
    const ctrl = createGlassOpening({ glass, base, fx, site, scar: document.getElementById("scar") }, { initialScale: guessInitialScale() });
    ctrlRef.current = ctrl;
    const run = (): void => ctrl.start();
    let cancel: () => void;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(run, FALLBACK_DELAY_MS);
      cancel = () => window.clearTimeout(id);
    }
    return () => {
      cancel();
      ctrl.destroy();
      ctrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return; // tespit bitmeden ilk tahmin korunur
    ctrlRef.current?.setScale(tier === "T1" || tier === "T0" ? LOW_SCALE : 1);
  }, [tier, ready]);

  return (
    <button
      ref={glassRef}
      className="glass"
      id="glass"
      type="button"
      aria-label="Camı kır. Tıkla, dokun ya da Enter tuşuna bas."
    >
      <canvas ref={baseRef} aria-hidden="true"></canvas>
      <canvas ref={fxRef} aria-hidden="true"></canvas>
    </button>
  );
}
