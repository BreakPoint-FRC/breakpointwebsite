export const TAU = Math.PI * 2;

export interface Pt {
  x: number;
  y: number;
}

export interface Edge {
  pts: Pt[];
  /** Darbe noktasına yakın uçtan başlayan sıra (çatlak oradan yayılır). */
  cp: Pt[];
  len: number;
  border: boolean;
  /** r: radyal (merkezden dışa), t: teğetsel (halka). */
  kind: "r" | "t";
  dNear: number;
  dMid: number;
  t0: number;
  t1: number;
  near: boolean;
}

export interface Shard {
  pts: Pt[];
  cx: number;
  cy: number;
  area: number;
  r: number;
  d: number;
  bx: number;
  by: number;
  bwCss: number;
  bhCss: number;
  bw: number;
  bh: number;
  spr: CanvasImageSource | null;
  seed: number;
  fallAt: number;
  vx: number;
  vy: number;
  w: number;
  ph: number;
  wy: number;
}

export type StarLine = [number, number, number, number];

export interface BreakPlan {
  shards: Shard[];
  edges: Edge[];
  D: number;
  ix: number;
  iy: number;
  Tsw: number;
  G: number;
  star: StarLine[];
  next: number;
}

export type Rng = () => number;

/** Çokgeni (nx, ny) · p ≤ c yarım düzlemine kırpar (Sutherland-Hodgman). */
export function clipHalf(poly: Pt[], nx: number, ny: number, c: number): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const da = nx * a.x + ny * a.y - c;
    const db = nx * b.x + ny * b.y - c;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

function maxR2(poly: Pt[], sx: number, sy: number): number {
  let m = 0;
  for (const p of poly) {
    const dx = p.x - sx;
    const dy = p.y - sy;
    const d = dx * dx + dy * dy;
    if (d > m) m = d;
  }
  return m;
}

function d2(p: Pt, q: Pt): number {
  const x = p.x - q.x;
  const y = p.y - q.y;
  return x * x + y * y;
}

/**
 * Darbe noktası (ix, iy) çevresinde Voronoi tabanlı cam parçaları üretir.
 * Parçalar paylaşılan tırtıklı kenarları kullanır; çatlak ve düşüş zamanlaması hesaplanır.
 */
export function buildShards(ix: number, iy: number, w: number, h: number, rng: Rng = Math.random): BreakPlan {
  const D = Math.max(Math.hypot(ix, iy), Math.hypot(w - ix, iy), Math.hypot(ix, h - iy), Math.hypot(w - ix, h - iy));
  const seeds: Pt[] = [{ x: ix, y: iy }];
  const M = 8;
  const r0 = Math.max(26, D * 0.028);
  const rN = D * 1.05;
  const gR = Math.pow(rN / r0, 1 / (M - 1));
  const counts = [6, 8, 9, 10, 11, 12, 13, 14];
  for (let m = 0; m < M; m++) {
    const r = r0 * Math.pow(gR, m);
    const n = counts[m];
    const a0 = rng() * TAU;
    for (let k = 0; k < n; k++) {
      const ang = a0 + ((k + (rng() - 0.5) * 0.5) * TAU) / n;
      const rr = r * (1 + (rng() - 0.5) * 0.25);
      seeds.push({ x: ix + Math.cos(ang) * rr, y: iy + Math.sin(ang) * rr });
    }
  }
  const inside = (s: Pt): boolean => s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h;
  let vis = seeds.filter(inside).length;
  let guard = 0;
  const lo = Math.log(r0 * 0.8);
  const hi = Math.log(D * 0.7);
  while (vis < 80 && seeds.length < 118 && guard++ < 500) {
    const rd = Math.exp(lo + rng() * (hi - lo));
    const an = rng() * TAU;
    const sx = ix + Math.cos(an) * rd;
    const sy = iy + Math.sin(an) * rd;
    if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
    const min = Math.max(8, rd * 0.22);
    let ok = true;
    for (const q of seeds) {
      if (Math.hypot(q.x - sx, q.y - sy) < min) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    seeds.push({ x: sx, y: sy });
    vis++;
  }

  // hücreler
  const rect: Pt[] = [
    { x: -2, y: -2 },
    { x: w + 2, y: -2 },
    { x: w + 2, y: h + 2 },
    { x: -2, y: h + 2 },
  ];
  const cells: Pt[][] = [];
  for (let i = 0; i < seeds.length; i++) {
    const si = seeds[i];
    let poly = rect;
    let R2 = maxR2(poly, si.x, si.y);
    for (let j = 0; j < seeds.length && poly.length >= 3; j++) {
      if (j === i) continue;
      const sj = seeds[j];
      const dx = sj.x - si.x;
      const dy = sj.y - si.y;
      if (dx * dx + dy * dy > 4 * R2) continue;
      poly = clipHalf(poly, dx, dy, (dx * (si.x + sj.x)) / 2 + (dy * (si.y + sj.y)) / 2);
      R2 = maxR2(poly, si.x, si.y);
    }
    if (poly.length >= 3) cells.push(poly);
  }

  // paylaşılan kenarlar (iki komşu aynı tırtıklı çizgiyi kullanır)
  const edgeMap = new Map<string, Edge>();
  const edges: Edge[] = [];
  const q2 = (p: Pt): string => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
  const getEdge = (a: Pt, b: Pt): Edge => {
    const ka = q2(a);
    const kb = q2(b);
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    const cached = edgeMap.get(key);
    if (cached) return cached;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const border =
      len < 0.6 ||
      (a.x < -1.9 && b.x < -1.9) ||
      (a.x > w + 1.9 && b.x > w + 1.9) ||
      (a.y < -1.9 && b.y < -1.9) ||
      (a.y > h + 1.9 && b.y > h + 1.9);
    const pts: Pt[] = [{ x: a.x, y: a.y }];
    if (!border && len > 14) {
      const kk = Math.max(2, Math.min(7, Math.round(len / 34)));
      const nx = -dy / len;
      const ny = dx / len;
      const amp = Math.min(5, len * 0.04);
      for (let s = 1; s < kk; s++) {
        const t = s / kk + ((rng() - 0.5) * 0.5) / kk;
        const o = (rng() - 0.5) * 2 * amp;
        pts.push({ x: a.x + dx * t + nx * o, y: a.y + dy * t + ny * o });
      }
    }
    pts.push({ x: b.x, y: b.y });
    let plen = 0;
    for (let u = 1; u < pts.length; u++) plen += Math.hypot(pts[u].x - pts[u - 1].x, pts[u].y - pts[u - 1].y);
    const da = Math.hypot(a.x - ix, a.y - iy);
    const db = Math.hypot(b.x - ix, b.y - iy);
    const mx = (a.x + b.x) / 2 - ix;
    const my = (a.y + b.y) / 2 - iy;
    const ml = Math.hypot(mx, my) || 1;
    const cosA = len > 0 ? Math.abs((dx * mx + dy * my) / (len * ml)) : 0;
    const e: Edge = {
      pts,
      cp: da <= db ? pts : pts.slice().reverse(),
      len: plen,
      border,
      kind: cosA > 0.62 ? "r" : "t",
      dNear: Math.min(da, db),
      dMid: ml,
      t0: 0,
      t1: 0,
      near: false,
    };
    e.near = e.dNear < D * 0.16;
    edgeMap.set(key, e);
    edges.push(e);
    return e;
  };

  const shards: Shard[] = [];
  for (const poly of cells) {
    const out: Pt[] = [];
    let area = 0;
    let cx = 0;
    let cy = 0;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const cr = a.x * b.y - b.x * a.y;
      area += cr;
      cx += (a.x + b.x) * cr;
      cy += (a.y + b.y) * cr;
      const e = getEdge(a, b);
      const p = e.pts;
      const fwd = d2(p[0], a) <= d2(p[p.length - 1], a);
      if (fwd) {
        for (let z = 0; z < p.length - 1; z++) out.push(p[z]);
      } else {
        for (let z = p.length - 1; z > 0; z--) out.push(p[z]);
      }
    }
    const absArea = Math.abs(area) / 2;
    if (absArea < 0.5) continue;
    const signed = area / 2;
    const sgn = signed || 1;
    const ccx = cx / (6 * sgn);
    const ccy = cy / (6 * sgn);
    let minx = 1e9;
    let miny = 1e9;
    let maxx = -1e9;
    let maxy = -1e9;
    let rad = 0;
    for (const pp of out) {
      if (pp.x < minx) minx = pp.x;
      if (pp.x > maxx) maxx = pp.x;
      if (pp.y < miny) miny = pp.y;
      if (pp.y > maxy) maxy = pp.y;
      const dd = Math.hypot(pp.x - ccx, pp.y - ccy);
      if (dd > rad) rad = dd;
    }
    const bx = Math.floor(minx) - 3;
    const by = Math.floor(miny) - 3;
    shards.push({
      pts: out,
      cx: ccx,
      cy: ccy,
      area: absArea,
      r: rad,
      d: Math.hypot(ccx - ix, ccy - iy),
      bx,
      by,
      bwCss: Math.ceil(maxx) + 3 - bx,
      bhCss: Math.ceil(maxy) + 3 - by,
      bw: 0,
      bh: 0,
      spr: null,
      seed: rng() * 100,
      fallAt: 0,
      vx: 0,
      vy: 0,
      w: 0,
      ph: 0,
      wy: 0,
    });
  }

  // çatlak zamanlaması
  const vR = Math.max(2600, D * 3.4);
  let Tcrack = 0;
  for (const e of edges) {
    if (e.border) continue;
    if (e.kind === "r") {
      e.t0 = e.dNear / vR;
      e.t1 = e.t0 + Math.max(0.04, (e.len / vR) * 1.2);
    } else {
      e.t0 = 0.12 + e.dMid / (D * 2.8);
      e.t1 = e.t0 + 0.08 + e.len / (vR * 1.3);
    }
    if (e.t1 > Tcrack) Tcrack = e.t1;
  }
  const Tsw = Tcrack + 0.1;

  // düşüş parametreleri
  const G = Math.max(1700, h * 2.3);
  for (const s of shards) {
    const ang = Math.atan2(s.cy - iy, s.cx - ix);
    const push = (40 + rng() * 160) * (1 - Math.min(1, s.d / D) * 0.5);
    s.fallAt = Tsw + Math.pow(Math.min(1, s.d / D), 0.8) * 0.55 + rng() * 0.08;
    s.vx = Math.cos(ang) * push + (rng() - 0.5) * 60;
    s.vy = -(rng() * 120) * (s.d < D * 0.25 ? 1 : 0.3) + Math.sin(ang) * push * 0.5;
    s.w = Math.max(-7, Math.min(7, (rng() - 0.5) * (2.5 + 220 / Math.sqrt(s.area + 40))));
    s.ph = rng() * TAU;
    s.wy = (rng() - 0.5) * 7;
  }
  shards.sort((a, b) => b.d - a.d); // uzaklar önce çizilir, yakınlar üstte kalır

  // darbe merkezi çatlak yıldızı
  const star: StarLine[] = [];
  for (let k = 0; k < 14; k++) {
    const sa = rng() * TAU;
    const sl = 8 + rng() * 26;
    star.push([ix + Math.cos(sa) * 2, iy + Math.sin(sa) * 2, ix + Math.cos(sa) * sl, iy + Math.sin(sa) * sl]);
  }

  return { shards, edges, D, ix, iy, Tsw, G, star, next: 0 };
}

/** Yeniden oluşan sahnede kalıcı çatlak izi için SVG yol verisi ve istatistik. */
export function scarPath(plan: BreakPlan): { d: string; crack: number } {
  let d = "";
  let total = 0;
  for (const e of plan.edges) {
    if (e.border) continue;
    total += e.len;
    if ((e.kind === "r" && e.dNear < plan.D * 0.5) || (e.kind === "t" && e.dMid < plan.D * 0.14)) {
      d += `M${e.cp[0].x.toFixed(1)} ${e.cp[0].y.toFixed(1)}`;
      for (let j = 1; j < e.cp.length; j++) d += `L${e.cp[j].x.toFixed(1)} ${e.cp[j].y.toFixed(1)}`;
    }
  }
  return { d, crack: Math.round(total) };
}
