"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/** Alt satırdaki harfin tepesi ile üst satırdaki harfin dibi arasında bırakılacak en az boşluk (em). */
const MIN_GAP_EM = 0.06;

interface Glyph {
  left: number;
  right: number;
  /** Üst harfin tabandan aşağı inen mürekkebi / alt harfin tabandan yukarı çıkan mürekkebi (px). */
  descent: number;
  ascent: number;
  baseline: number;
}

let ctx: CanvasRenderingContext2D | null = null;

function glyphsOf(el: HTMLElement): Glyph[] {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return [];
  const out: Glyph[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!parent || !parent.getClientRects().length) continue;
    const cs = getComputedStyle(parent);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const fontAscent = ctx.measureText("H").fontBoundingBoxAscent;
    const shown = cs.textTransform === "uppercase" ? text.data.toLocaleUpperCase("tr") : text.data;
    if (shown.length !== text.data.length) continue;
    const range = document.createRange();
    for (let i = 0; i < text.data.length; i++) {
      const ch = shown[i];
      if (/\s/.test(ch)) continue;
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      const rect = range.getClientRects()[0];
      if (!rect || !rect.width) continue;
      const m = ctx.measureText(ch);
      out.push({
        left: rect.left - m.actualBoundingBoxLeft,
        right: rect.left + m.actualBoundingBoxRight,
        descent: m.actualBoundingBoxDescent,
        ascent: m.actualBoundingBoxAscent,
        baseline: rect.top + fontAscent,
      });
    }
  }
  return out;
}

/**
 * Satırlar nerede kırılırsa kırılsın, üst satırdaki Ç/Ş/[ ] ile alt satırdaki İ/Ö/Ü/Ğ
 * mürekkebi çakışmayacak kadar satır aralığı açar. Sınıftaki satır aralığı taban kalır;
 * yalnız o genişlikteki kırılım gerektiriyorsa büyütülür.
 */
function fit(el: HTMLElement): boolean {
  const before = el.style.lineHeight;
  el.style.lineHeight = "";
  const fontSize = parseFloat(getComputedStyle(el).fontSize);
  const baseLeading = parseFloat(getComputedStyle(el).lineHeight);
  const glyphs = glyphsOf(el);

  // Satırları taban çizgisine göre grupla.
  const lines: Glyph[][] = [];
  for (const g of [...glyphs].sort((a, b) => a.baseline - b.baseline)) {
    const last = lines.at(-1);
    if (last && g.baseline - last[0].baseline < fontSize * 0.5) last.push(g);
    else lines.push([g]);
  }

  let extra = 0;
  for (let i = 1; i < lines.length; i++) {
    const distance = lines[i][0].baseline - lines[i - 1][0].baseline;
    for (const upper of lines[i - 1]) {
      for (const lower of lines[i]) {
        if (lower.left >= upper.right || lower.right <= upper.left) continue;
        extra = Math.max(extra, upper.descent + lower.ascent + MIN_GAP_EM * fontSize - distance);
      }
    }
  }

  const next = extra > 0 && Number.isFinite(baseLeading) ? `${((baseLeading + extra) / fontSize).toFixed(3)}` : "";
  el.style.lineHeight = next;
  return next !== before;
}

/** `data-fit-leading` taşıyan başlıkları yazı tipi yüklenince ve genişlik değişince yeniden ölçer. */
export function FitLeading() {
  useEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>("[data-fit-leading]")];
    const widths = new WeakMap<HTMLElement, number>();
    let frame = 0;
    let cancelled = false;

    const run = () => {
      frame = 0;
      let changed = false;
      for (const el of targets) changed = fit(el) || changed;
      if (changed) ScrollTrigger.refresh();
    };
    const schedule = () => {
      if (!frame && !cancelled) frame = requestAnimationFrame(run);
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const width = Math.round(entry.contentRect.width);
        if (widths.get(el) === width) continue;
        widths.set(el, width);
        schedule();
      }
    });
    targets.forEach((el) => observer.observe(el));
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
