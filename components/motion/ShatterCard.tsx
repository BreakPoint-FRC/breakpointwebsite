"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { jumpTo } from "@/lib/nav/jump";
import { cardOutline, centroid, fanShards, polygonCss } from "@/lib/nav/shards";

interface ShatterCardProps {
  className: string;
  /** Kırılma bitince anında gidilecek bölüm kimliği (örn. "iletisim"). */
  targetId: string;
  children: ReactNode;
}

const CUT = 21;
const STEP = 80;
const SHARD_MS = 640;
const MAX_DELAY_MS = 110;
const RESTORE_MS = 260;

/**
 * Karta tıklanınca kart tıklama noktasından parçalanır, parçalar düşüp sönünce `targetId` bölümüne anında gidilir.
 * Parçalar kartın kendi içinde (aynı koordinat uzayında) çizildiği için 3B uçuşta da düz sayfada da aynı çalışır.
 */
export function ShatterCard({ className, targetId, children }: ShatterCardProps) {
  const ref = useRef<HTMLLIElement>(null);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
    };
  }, []);

  const onClick = (e: MouseEvent<HTMLLIElement>): void => {
    const li = ref.current;
    const face = li?.querySelector<HTMLElement>(":scope > .card-in");
    const link = (e.target instanceof Element ? e.target.closest("a") : null) ?? null;
    if (link) e.preventDefault();
    if (!li || !face || busy.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      jumpTo(targetId);
      return;
    }

    busy.current = true;
    const w = face.offsetWidth;
    const h = face.offsetHeight;
    const box = face.getBoundingClientRect();
    // Klavye ile tetiklenen tıklamada (detail 0) imleç konumu yoktur: kartın ortasından kır.
    const fromPointer = e.detail > 0 && box.width > 0 && box.height > 0;
    const ox = fromPointer ? ((e.clientX - box.left) / box.width) * w : w / 2;
    const oy = fromPointer ? ((e.clientY - box.top) / box.height) * h : h / 2;
    const origin = { x: Math.min(w - 2, Math.max(2, ox)), y: Math.min(h - 2, Math.max(2, oy)) };

    const triangles = fanShards(cardOutline(w, h, CUT), origin, STEP);
    const reach = Math.hypot(w, h);
    const shards: HTMLElement[] = [];

    for (const tri of triangles) {
      const shard = face.cloneNode(true) as HTMLElement;
      const c = centroid(tri);
      const dx = c.x - origin.x;
      const dy = c.y - origin.y;
      const dist = Math.hypot(dx, dy) || 1;
      const push = 50 + Math.random() * 120;
      const tx = (dx / dist) * push;
      const ty = (dy / dist) * push + 150 + Math.random() * 260;
      const rot = (Math.random() - 0.5) * 70;

      shard.classList.add("shard");
      shard.setAttribute("aria-hidden", "true");
      shard.setAttribute("inert", "");
      shard.style.cssText = [
        "position:absolute",
        `left:${face.offsetLeft}px`,
        `top:${face.offsetTop}px`,
        `width:${w}px`,
        `height:${h}px`,
        `clip-path:${polygonCss(tri)}`,
        `transform-origin:${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`,
        "pointer-events:none",
        "will-change:transform,opacity",
      ].join(";");
      li.appendChild(shard);
      shards.push(shard);

      shard.animate(
        [
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${(tx * 0.12).toFixed(1)}px,${(ty * 0.05).toFixed(1)}px) rotate(${(rot * 0.1).toFixed(1)}deg)`, opacity: 1, offset: 0.18 },
          { transform: `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`, opacity: 0 },
        ],
        {
          duration: SHARD_MS,
          delay: (dist / reach) * MAX_DELAY_MS,
          easing: "cubic-bezier(0.4, 0, 0.9, 0.6)",
          fill: "both",
        },
      );
    }

    li.classList.add("shattering");

    const done = window.setTimeout(() => {
      jumpTo(targetId);
      const restore = window.setTimeout(() => {
        for (const s of shards) s.remove();
        li.classList.remove("shattering");
        busy.current = false;
      }, RESTORE_MS);
      timers.current.push(restore);
    }, SHARD_MS + MAX_DELAY_MS);
    timers.current.push(done);
  };

  return (
    <li ref={ref} className={className} onClick={onClick}>
      {children}
    </li>
  );
}
