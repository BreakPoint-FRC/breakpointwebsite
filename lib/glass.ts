import { seeded } from "./math";

/**
 * Cam kırılma geometrisi — H.dc.html'deki `this.glass` üretecinin birebir portu.
 * 11 radyal kol × 5 halka = 55 parça (her kolda 1 üçgen + 4 dörtgen).
 * Koordinatlar ekran pikselinde üretilir; tasarım değerleri `radiusScale` ile ölçeklenir.
 */

export type Point = readonly [number, number];

export interface Shard {
  poly: Point[];
  /** Ağırlık merkezi: dönme noktası. */
  ox: number;
  oy: number;
  /** Darbe noktasından dışa birim vektör (pop için). */
  nx: number;
  ny: number;
  delay: number;
  fall: number;
  drift: number;
  spin: number;
}

export interface GlassGeometry {
  cx: number;
  cy: number;
  spokes: Point[][];
  rings: Point[][];
  shards: Shard[];
}

export interface GlassOptions {
  cx: number;
  cy: number;
  /** Tasarım yarıçaplarının (80, 200, 360, 600) ölçeği. */
  radiusScale: number;
  /** Son halka yarıçapı: ekranın tamamını örtmeli. */
  outerRadius: number;
  /** Düşme mesafesi ölçeği (ekran yüksekliği / 900). */
  fallScale: number;
}

const N = 11;
const DESIGN_RADII = [80, 200, 360, 600] as const;

export function buildGlass({ cx, cy, radiusScale, outerRadius, fallScale }: GlassOptions): GlassGeometry {
  const radii = [...DESIGN_RADII.map((r) => r * radiusScale), outerRadius];
  const last = radii.length - 1;

  const ang: number[] = [];
  for (let i = 0; i < N; i++) ang.push(((i * 360) / N + (seeded(i) - 0.5) * 18) * (Math.PI / 180));

  const P = (i: number, j: number): Point => {
    const ii = ((i % N) + N) % N;
    const r = radii[j] * (j === last ? 1 : 0.85 + seeded(ii * 7 + j * 13) * 0.3);
    return [cx + Math.cos(ang[ii]) * r, cy + Math.sin(ang[ii]) * r];
  };

  const spokes: Point[][] = [];
  for (let i = 0; i < N; i++) {
    const pts: Point[] = [[cx, cy]];
    for (let j = 0; j < radii.length; j++) pts.push(P(i, j));
    spokes.push(pts);
  }

  const rings: Point[][] = [];
  for (let j = 0; j < last; j++) {
    const pts: Point[] = [];
    for (let i = 0; i <= N; i++) pts.push(P(i, j));
    rings.push(pts);
  }

  const shards: Shard[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < radii.length; j++) {
      const poly: Point[] =
        j === 0 ? [[cx, cy], P(i, 0), P(i + 1, 0)] : [P(i, j - 1), P(i, j), P(i + 1, j), P(i + 1, j - 1)];
      let mx = 0;
      let my = 0;
      poly.forEach(([x, y]) => {
        mx += x;
        my += y;
      });
      mx /= poly.length;
      my /= poly.length;
      const dx = mx - cx;
      const dy = my - cy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const seed = i * 17 + j * 5;
      shards.push({
        poly,
        ox: mx,
        oy: my,
        nx: dx / len,
        ny: dy / len,
        delay: 0.4 + j * 0.06 + seeded(seed) * 0.08,
        fall: (1150 + seeded(seed + 1) * 400) * fallScale,
        drift: dx * 0.12 + (seeded(seed + 2) - 0.5) * 120 * radiusScale,
        spin: (seeded(seed + 3) - 0.5) * 90,
      });
    }
  }

  return { cx, cy, spokes, rings, shards };
}

export const pointsAttr = (pts: Point[]): string => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Son halkanın (akor kısalmasıyla birlikte) ekranı örtmesi için gereken yarıçap. */
export function coverRadius(cx: number, cy: number, w: number, h: number): number {
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
  return far / 0.82;
}
