import type { GlassGeometry, Shard } from "./glass";
import { clamp01, easeOutCubic } from "./math";

/**
 * Cam parçalarını canvas'a çizer.
 * 55 tam ekran DOM kopyası yerine: cam katmanı bir kez offscreen canvas'a çizilir,
 * her parça kendi sınır kutusu kadar ayrı bir sprite'a kesilir; karede yalnız 55 drawImage.
 * Karede clip yok, layout yok.
 */

export interface GlassTextLine {
  text: string;
  x: number;
  top: number;
  size: number;
  lineHeight: number;
}

export interface GlassLayout {
  width: number;
  height: number;
  dpr: number;
  fontFamily: string;
  lines: GlassTextLine[];
  geometry: GlassGeometry;
}

interface Sprite {
  shard: Shard;
  canvas: HTMLCanvasElement;
  bx: number;
  by: number;
  bw: number;
  bh: number;
  reach: number;
}

const INK = "#12100C";
const STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, "#FED233"],
  [0.38, "#FED233"],
  [0.47, "#FFE27A"],
  [0.56, "#FED233"],
  [1, "#F4C51F"],
];

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D desteklenmiyor");
  return ctx;
}

/** CSS `linear-gradient(128deg, …)` ile aynı gradyan çizgisi. */
function paintGlass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const theta = (128 * Math.PI) / 180;
  const dx = Math.sin(theta);
  const dy = -Math.cos(theta);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const g = ctx.createLinearGradient(w / 2 - (dx * len) / 2, h / 2 - (dy * len) / 2, w / 2 + (dx * len) / 2, h / 2 + (dy * len) / 2);
  STOPS.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** CSS satır kutusuyla aynı taban çizgisi: top + (L − (A + D)) / 2 + A. */
function paintText(ctx: CanvasRenderingContext2D, lines: GlassTextLine[], family: string): void {
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  lines.forEach((line) => {
    ctx.font = `600 ${line.size}px ${family}`;
    const m = ctx.measureText(line.text);
    const ascent = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent;
    const descent = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
    const box = line.size * line.lineHeight;
    ctx.fillText(line.text, line.x, line.top + (box - (ascent + descent)) / 2 + ascent);
  });
}

export class GlassRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private source: HTMLCanvasElement | null = null;
  private sprites: Sprite[] = [];
  private layout: GlassLayout | null = null;
  private lastKey = "";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = context2d(canvas);
  }

  build(layout: GlassLayout): void {
    const { width: w, height: h, dpr } = layout;
    this.layout = layout;
    this.lastKey = "";
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);

    const source = document.createElement("canvas");
    source.width = Math.round(w * dpr);
    source.height = Math.round(h * dpr);
    const sctx = context2d(source);
    sctx.scale(dpr, dpr);
    paintGlass(sctx, w, h);
    paintText(sctx, layout.lines, layout.fontFamily);
    this.source = source;

    this.sprites = [];
    layout.geometry.shards.forEach((shard) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      shard.poly.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
      // Ekran dışındaki kısım boştur: kutuyu ekrana kırp.
      const bx = Math.max(0, Math.floor(minX));
      const by = Math.max(0, Math.floor(minY));
      const bw = Math.min(w, Math.ceil(maxX)) - bx;
      const bh = Math.min(h, Math.ceil(maxY)) - by;
      if (bw <= 0 || bh <= 0) return;

      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bw * dpr));
      c.height = Math.max(1, Math.round(bh * dpr));
      const pctx = context2d(c);
      pctx.scale(dpr, dpr);
      pctx.beginPath();
      shard.poly.forEach(([x, y], i) => {
        if (i === 0) pctx.moveTo(x - bx, y - by);
        else pctx.lineTo(x - bx, y - by);
      });
      pctx.closePath();
      pctx.clip();
      pctx.drawImage(source, -bx, -by, w, h);

      const reach = Math.max(Math.hypot(bx - shard.ox, by - shard.oy), Math.hypot(bx + bw - shard.ox, by + bh - shard.oy));
      this.sprites.push({ shard, canvas: c, bx, by, bw, bh, reach });
    });
  }

  /** p = sahne ilerlemesi (0…1). */
  draw(p: number): void {
    const layout = this.layout;
    const source = this.source;
    if (!layout || !source) return;
    const { height: h, dpr } = layout;
    const ctx = this.ctx;
    const pop = easeOutCubic(clamp01((p - 0.34) / 0.06));

    // Cam sağlamken tek parça çiz (sprite kenarlarında kıl payı boşluk olmasın).
    const key = pop <= 0 ? "whole" : p.toFixed(4);
    if (key === this.lastKey) return;
    this.lastKey = key;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (pop <= 0) {
      ctx.drawImage(source, 0, 0);
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of this.sprites) {
      const { shard } = s;
      const f = clamp01((p - shard.delay) / 0.3);
      const ff = f * f;
      const tx = shard.nx * pop * 5 + shard.drift * f;
      const ty = shard.ny * pop * 5 + ff * shard.fall;
      const cy = shard.oy + ty;
      if (cy - s.reach > h || cy + s.reach < 0) continue;
      ctx.save();
      ctx.translate(shard.ox + tx, cy);
      ctx.rotate((shard.spin * ff * Math.PI) / 180);
      ctx.drawImage(s.canvas, s.bx - shard.ox, s.by - shard.oy, s.bw, s.bh);
      ctx.restore();
    }
  }

  destroy(): void {
    this.sprites = [];
    this.source = null;
    this.layout = null;
  }
}
