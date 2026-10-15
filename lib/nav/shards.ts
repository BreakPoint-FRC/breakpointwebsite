export interface Pt {
  x: number;
  y: number;
}

/** Sağ üst köşesi kesik kartın dış hattı (CSS `.card` ile aynı pah). */
export function cardOutline(w: number, h: number, cut: number): Pt[] {
  return [
    { x: 0, y: 0 },
    { x: w - cut, y: 0 },
    { x: w, y: cut },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

/**
 * Dış hattı, uzunluğuna göre `step` pikselde bir noktayla böler, her ardışık nokta çiftini
 * `origin` ile üçgenler. Dış hat dışbükey ve `origin` içeride olduğu için üçgenler hattı boşluksuz kaplar.
 */
export function fanShards(outline: Pt[], origin: Pt, step: number): Pt[][] {
  const boundary: Pt[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) {
      boundary.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
  }
  const shards: Pt[][] = [];
  for (let i = 0; i < boundary.length; i++) {
    shards.push([origin, boundary[i], boundary[(i + 1) % boundary.length]]);
  }
  return shards;
}

export function polygonCss(pts: Pt[]): string {
  return `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

export function centroid(pts: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}
