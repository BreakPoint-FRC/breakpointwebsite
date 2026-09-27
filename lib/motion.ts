"use client";

import { easeOutCubic } from "./math";

/** Prototipin `rise(a, d)`: opaklık a, aşağıdan (1−a)·d px. Yalnız transform + opacity. */
export function setRise(el: HTMLElement, a: number, d: number): void {
  el.style.opacity = String(a);
  el.style.transform = `translate3d(0, ${(1 - a) * d}px, 0)`;
}

/** Gecikmeli, pencereli easeOut ilerleme: easeOut(clamp((p − delay) / span)). */
export function windowed(p: number, delay: number, span: number): number {
  const x = (p - delay) / span;
  return easeOutCubic(x < 0 ? 0 : x > 1 ? 1 : x);
}

export function setOpacity(el: Element | null | undefined, value: number): void {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.style.opacity = String(value);
}
