"use client";

import { useEffect, useRef } from "react";
import { hero } from "@/content/site";
import { EVENT_OPEN, EVENT_RESET, type GlassStats } from "@/lib/glass/opening";

const pad2 = (n: number): string => (n < 10 ? "0" : "") + n;
const fmt = (n: number): string => Number(n).toLocaleString("tr-TR");
const COUNT_MS = 1100;

/** İzleme panelinin canlı satırları: cam kırılınca vuruş yeri, parça ve çatlak sayısı, açık kalma süresi. */
export function WatchLive() {
  const w = hero.watch;
  const hit = useRef<HTMLElement>(null);
  const shards = useRef<HTMLElement>(null);
  const crack = useRef<HTMLElement>(null);
  const up = useRef<HTMLElement>(null);

  useEffect(() => {
    let openAt = 0;
    let rafId = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const setText = (el: HTMLElement | null, text: string): void => {
      if (el) el.textContent = text;
    };
    const tickUp = (): void => {
      if (!openAt) return;
      const s = Math.floor((Date.now() - openAt) / 1000);
      setText(up.current, `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`);
    };
    const timer = window.setInterval(() => {
      if (!document.hidden) tickUp();
    }, 1000);
    const showCounts = (a: number, b: number): void => {
      setText(shards.current, fmt(a));
      setText(crack.current, `${fmt(b)} ${w.crackUnit}`);
    };
    const countTo = (a: number, b: number): void => {
      const start = performance.now();
      cancelAnimationFrame(rafId);
      const step = (now: number): void => {
        const p = Math.min(1, (now - start) / COUNT_MS);
        const e = 1 - Math.pow(1 - p, 3);
        showCounts(Math.round(a * e), Math.round(b * e));
        if (p < 1) rafId = requestAnimationFrame(step);
      };
      step(start);
    };
    const onOpen = (ev: Event): void => {
      const d = (ev as CustomEvent<GlassStats>).detail;
      if (!d) return;
      openAt = Date.now();
      tickUp();
      setText(hit.current, `(${Math.round(d.x)}, ${Math.round(d.y)})`);
      if (reduce) showCounts(d.shards, d.crack);
      else countTo(d.shards, d.crack);
    };
    const onReset = (): void => {
      openAt = 0;
      cancelAnimationFrame(rafId);
      setText(hit.current, w.idleHit);
      setText(shards.current, w.idleValue);
      setText(crack.current, w.idleValue);
      setText(up.current, w.idleUp);
    };
    document.addEventListener(EVENT_OPEN, onOpen);
    document.addEventListener(EVENT_RESET, onReset);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(rafId);
      document.removeEventListener(EVENT_OPEN, onOpen);
      document.removeEventListener(EVENT_RESET, onReset);
    };
  }, [w.crackUnit, w.idleHit, w.idleUp, w.idleValue]);

  return (
    <>
      <div>
        <dt>{w.hitLabel}</dt>
        <dd ref={hit}>{w.idleHit}</dd>
      </div>
      <div>
        <dt>{w.shardsLabel}</dt>
        <dd ref={shards}>{w.idleValue}</dd>
      </div>
      <div>
        <dt>{w.crackLabel}</dt>
        <dd ref={crack}>{w.idleValue}</dd>
      </div>
      <div>
        <dt>{w.upLabel}</dt>
        <dd ref={up}>{w.idleUp}</dd>
      </div>
    </>
  );
}
