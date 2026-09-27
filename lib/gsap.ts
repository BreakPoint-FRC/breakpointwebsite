"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** gsap.matchMedia koşulları. Masaüstü düzeni 1024px ve üstü (Tailwind `lg`). */
export const MOTION_QUERIES = {
  desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
} as const;

export type MotionConditions = Record<keyof typeof MOTION_QUERIES, boolean>;

export function readConditions(raw: gsap.Conditions | undefined): MotionConditions {
  return {
    desktop: Boolean(raw?.desktop),
    mobile: Boolean(raw?.mobile),
    reduce: Boolean(raw?.reduce),
  };
}

/** Pin uzunlukları (px kaydırma). Mobil ≈ %60. */
export const PIN = {
  hero: { desktop: 1300, mobile: 780 },
  robot: { desktop: 2500, mobile: 1500 },
  manifesto: { desktop: 700, mobile: 0 },
  orbit: { desktop: 1700, mobile: 1020 },
  glass: { desktop: 1100, mobile: 660 },
} as const;

export { gsap, ScrollTrigger, useGSAP };
