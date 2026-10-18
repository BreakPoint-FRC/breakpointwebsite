"use client";

import { useEffect, useRef } from "react";
import { EVENT_OPEN, EVENT_RESET, getLastOpenStats, type GlassStats } from "@/lib/glass/opening";
import { setGl } from "@/lib/flight/glState";
import type { FlightEngine } from "@/lib/flight/engine";
import { deriveQuality } from "@/lib/flight/config";
import { createGovernor } from "@/lib/flight/governor";
import { setNotice } from "@/lib/quality/notice";
import { downgradeTo, getFrameMs } from "@/lib/quality/runtime";
import { TIERS } from "@/lib/quality/tiers";
import { useQuality } from "@/lib/quality/useQuality";

/**
 * 3B uçuş katmanı. Tespit bitip kademe T1-T3 ise, ilk boyamadan sonra `three` ayrı parça olarak yüklenir.
 * Kademe değişince canvas yeniden kurulur (WebGL bağlam öznitelikleri sonradan değişmez).
 */
export function FlightCanvas() {
  const { tier, ready } = useQuality();
  const threeD = ready && TIERS[tier].threeD;
  return threeD ? <FlightLayer key={tier} tier={tier} /> : null;
}

function FlightLayer({ tier }: { tier: "T1" | "T2" | "T3" | "T0" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let engine: FlightEngine | null = null;
    const spec = TIERS[tier];
    const root = document.documentElement;
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onOpen = (e: Event): void => {
      engine?.onGlassOpen((e as CustomEvent<GlassStats>).detail ?? null);
    };
    const onReset = (): void => engine?.onGlassReset();
    document.addEventListener(EVENT_OPEN, onOpen);
    document.addEventListener(EVENT_RESET, onReset);

    const boot = async (): Promise<void> => {
      try {
        const [flight, bloomMod] = await Promise.all([
          import("@/lib/flight/engine"),
          spec.bloom && !coarse ? import("@/lib/flight/bloom") : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const quality = deriveQuality(spec, coarse);
        // ?governor=kapali: hata ayıklama ve yazılımsal GL altında doğrulama için kare yöneticisini kapatır.
        const governorOff = new URLSearchParams(window.location.search).get("governor") === "kapali";
        const governor = createGovernor(
          quality,
          (next, severe) => {
            if (cancelled) return;
            // Yalnız belirgin kötü ve sekme görünürken ölçülen düşüş sonraki ziyaretlere taşınır.
            downgradeTo(next, severe && !document.hidden);
            if (next === "T0") setNotice({ kind: "threeD-off" });
          },
          getFrameMs,
        );
        // Cam zaten kırıldıysa düz sayfadaki kaydırma konumu 3B haritayla eşleşmez: baştan başlanır.
        const glassOpen = root.classList.contains("live");
        if (glassOpen) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        engine = flight.createFlight({
          quality,
          canvas,
          reducedMotion: reduce,
          createBloom: bloomMod ? bloomMod.createBloom : null,
          onFrameWindow: (ms, eng) => {
            if (!governorOff) governor.window(ms, eng);
          },
          onFail: () => {
            if (cancelled) return;
            downgradeTo("T0");
            setNotice({ kind: "threeD-off" });
          },
        });
        setGl(true);
        if (glassOpen) engine.onGlassOpen(getLastOpenStats());
      } catch {
        // WebGL başlatılamadı ya da parça yüklenemedi: düz moda dön
        if (cancelled) return;
        downgradeTo("T0");
        setNotice({ kind: "threeD-off" });
      }
    };
    void boot();

    return () => {
      cancelled = true;
      document.removeEventListener(EVENT_OPEN, onOpen);
      document.removeEventListener(EVENT_RESET, onReset);
      const wasRunning = engine !== null;
      engine?.dispose();
      engine = null;
      setGl(false);
      if (wasRunning) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
  }, [tier]);

  return <canvas ref={canvasRef} id="gl" aria-hidden="true"></canvas>;
}
