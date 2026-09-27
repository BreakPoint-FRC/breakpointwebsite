"use client";

import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { sceneBus } from "@/lib/sceneBus";

/**
 * Aktif sahneyi bulur: sahne sarmalayıcısının üstü ekranın ortasını geçince o sahne aktif.
 * Sahnelerin pin tetikleyicilerinden SONRA kurulmalı (sayfada en sonda duruyor + düşük öncelik),
 * yoksa pin boşlukları hesaba katılmaz.
 */
export function SceneTracker() {
  useGSAP(() => {
    const frames = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    const triggers = frames.map((el) => {
      const index = Number(el.dataset.scene);
      return ScrollTrigger.create({
        trigger: el,
        start: "top 50%",
        end: "bottom 50%",
        refreshPriority: -10,
        onToggle: (self) => {
          if (self.isActive) sceneBus.setScene(index);
        },
      });
    });
    ScrollTrigger.refresh();
    return () => triggers.forEach((t) => t.kill());
  });

  return null;
}
