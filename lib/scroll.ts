"use client";

import type Lenis from "lenis";

/** Lenis örneği (reduced-motion'da hiç oluşturulmaz). */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Belgenin mutlak Y konumuna kaydırır. */
export function scrollToY(y: number, immediate = false): void {
  const target = Math.max(0, Math.round(y));
  if (instance) {
    instance.scrollTo(target, { immediate, duration: immediate ? 0 : 1.2 });
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: target, behavior: immediate || reduce ? "auto" : "smooth" });
}

/** Elemanın belge üzerindeki üst konumu. */
export function docTop(el: Element): number {
  return el.getBoundingClientRect().top + window.scrollY;
}
