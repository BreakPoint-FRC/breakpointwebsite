"use client";

import { useEffect } from "react";

/** Sponsor kartlarında imleci izleyen parıltı: --mx / --my CSS değişkenlerini günceller. */
export function CardGlow({ targetId }: { targetId: string }) {
  useEffect(() => {
    const host = document.getElementById(targetId);
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent): void => {
      if (document.documentElement.dataset.tier === "T0") return;
      const target = e.target instanceof Element ? e.target : null;
      const card = target?.closest(".card");
      const inner = card?.firstElementChild;
      if (!(inner instanceof HTMLElement)) return;
      const r = inner.getBoundingClientRect();
      inner.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
      inner.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
    };
    host.addEventListener("pointermove", onMove);
    return () => host.removeEventListener("pointermove", onMove);
  }, [targetId]);
  return null;
}
