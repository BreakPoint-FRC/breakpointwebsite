"use client";

import { useEffect, useRef } from "react";

/** Köşelerde kalan cam parçaları; imleçle hafifçe oynar (yalnız T0 dışı ve hareket azaltma kapalıyken). */
export function HeroRems() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let rafId = 0;
    const loop = (): void => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty("--rx", cx.toFixed(3));
      el.style.setProperty("--ry", cy.toFixed(3));
      rafId = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent): void => {
      if (document.documentElement.dataset.tier === "T0") return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!rafId) rafId = requestAnimationFrame(loop);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={ref} className="rems" aria-hidden="true">
      <div className="rem rem-a">
        <i></i>
      </div>
      <div className="rem rem-b">
        <i></i>
      </div>
    </div>
  );
}
