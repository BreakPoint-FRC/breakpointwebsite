import { PACE, PACE_R, PH } from "./config";
import { clamp, lerp, sstep } from "./math";
import type { PathData } from "./world";

export type StationKind = "hero" | "slab" | "robot" | "final";

export interface StationDef {
  id: string;
  kind: StationKind;
  /** Levha istasyonunun Station dizisindeki indeksi. */
  k?: number;
  /** Dinlenme uzunluğu (ekran yüksekliği cinsinden). */
  dw: number;
  /** Sonraki istasyona geçiş uzunluğu (ekran yüksekliği cinsinden). */
  tr: number;
  name: string;
}

export const STS: StationDef[] = [
  { id: "top", kind: "hero", dw: 0.5, tr: 0.95, name: "giriş" },
  { id: "frc", kind: "slab", k: 0, dw: 0.62, tr: 0.9, name: "FRC nedir" },
  { id: "robot", kind: "robot", dw: 4.4, tr: 0.95, name: "robot" },
  { id: "takim", kind: "slab", k: 1, dw: 0.62, tr: 0.9, name: "takım" },
  { id: "sponsorluk", kind: "slab", k: 2, dw: 0.62, tr: 0.9, name: "sponsorluk" },
  { id: "iletisim", kind: "slab", k: 3, dw: 0.62, tr: 0.95, name: "iletişim" },
  { id: "final", kind: "final", dw: 1.9, tr: 0, name: "BreakPoint" },
];

/** STS dizisinde her levha istasyonunun indeksi (Station k → STS indeksi). */
export const SLAB_STS_INDEX = [1, 3, 4, 5] as const;

export interface Seg {
  /** d: dinlenme, t: geçiş. */
  t: "d" | "t";
  i: number;
  a: number;
  b: number;
  extra: number;
}

export interface ScrollMap {
  segs: Seg[];
  total: number;
  H: number;
}

/** Geçiş hız profili: dinlenmeden yumuşak kalkış, levha geçişinde yavaş plato, sonra seyir, varışta yumuşak duruş. */
function spd(f: number): number {
  return sstep(0, 0.16, f) * (0.5 + 0.5 * sstep(0.42, 0.66, f)) * sstep(1.0, 0.68, f);
}

const PROF_N = 200;
const PROF = ((): Float32Array => {
  const t = new Float32Array(PROF_N + 1);
  let acc = 0;
  for (let i = 1; i <= PROF_N; i++) {
    acc += spd((i - 0.5) / PROF_N);
    t[i] = acc;
  }
  for (let i = 1; i <= PROF_N; i++) t[i] /= acc;
  return t;
})();

export function profile(f: number): number {
  const x = clamp(f, 0, 1) * PROF_N;
  const i = Math.min(PROF_N - 1, Math.floor(x));
  return PROF[i] + (PROF[i + 1] - PROF[i]) * (x - i);
}

/** Levha istasyonunda içerik kaydırmasından önceki bekleme (px). */
export function lead(H: number): number {
  return 0.3 * H * PACE;
}

/** slabOver: her levhanın taşan içerik yüksekliği (Station.over), indeks = Station k. */
export function buildMap(H: number, slabOver: number[]): ScrollMap {
  const segs: Seg[] = [];
  let y = 0;
  for (let i = 0; i < STS.length; i++) {
    const s = STS[i];
    const extra = s.kind === "slab" && s.k !== undefined ? (slabOver[s.k] ?? 0) : 0;
    const kd = s.kind === "robot" || s.kind === "final" ? PACE_R : PACE;
    const len = s.dw * H * kd + extra;
    segs.push({ t: "d", i, a: y, b: y + len, extra });
    y += len;
    if (i < STS.length - 1) {
      const tl = s.tr * H * PACE;
      segs.push({ t: "t", i, a: y, b: y + tl, extra: 0 });
      y += tl;
    }
  }
  return { segs, total: y + H, H };
}

export function stationY(map: ScrollMap, id: string): number {
  for (let i = 0; i < STS.length; i++) {
    if (STS[i].id !== id) continue;
    const s = STS[i];
    const seg = map.segs[i * 2];
    if (s.kind === "robot") return seg.a + (seg.b - seg.a) * 0.02;
    if (s.kind === "final") return seg.a + (seg.b - seg.a) * 0.78;
    return seg.a + lead(map.H) * 0.6;
  }
  return -1;
}

/** Robot parça k'sının başlangıç kaydırma konumu (parça listesinden tıklayınca gidilir). */
export function phaseY(map: ScrollMap, k: number): number {
  const seg = map.segs[4];
  const rho = clamp((PH.end[k] - 0.0012 - PH.pre) / (1 - PH.pre), 0, 1);
  return Math.round(seg.a + (seg.b - seg.a) * rho);
}

export interface MapEval {
  i: number;
  ph: "d" | "t";
  f: number;
  fe: number;
  /** Eğri indeksi (0: A, 1: B) ve eğri üzerindeki konum. */
  c: number;
  idx: number;
  orb: number;
  rho: number;
  psi: number;
  q: number;
  pre: number;
  leave: number;
  near: number;
}

export function createEval(): MapEval {
  return { i: 0, ph: "d", f: 0, fe: 0, c: 0, idx: 0, orb: 0, rho: 0, psi: 0, q: 0, pre: 0, leave: 0, near: 0 };
}

/** Kaydırma konumu y için sahne durumunu hesaplar (E'yi yerinde günceller). */
export function evalMap(map: ScrollMap, path: PathData, y0: number, E: MapEval): MapEval {
  const { segs, total, H } = map;
  const y = clamp(y0, 0, Math.max(0, total - H));
  let sg = segs[segs.length - 1];
  for (const cand of segs) {
    if (y <= cand.b) {
      sg = cand;
      break;
    }
  }
  const f = clamp((y - sg.a) / Math.max(1, sg.b - sg.a), 0, 1);
  const i = sg.i;
  const s = STS[i];
  E.i = i;
  E.ph = sg.t;
  E.f = f;
  E.orb = 0;
  E.rho = 0;
  E.psi = 0;
  E.q = 0;
  E.pre = 0;
  E.leave = 0;
  E.fe = 0;
  if (sg.t === "d") {
    const si = path.SI[i];
    E.c = si.c;
    E.idx = si.i0 + si.dr * f;
    E.near = i;
    if (s.kind === "robot") {
      E.orb = 1;
      E.rho = f;
      E.pre = 1;
      E.idx = si.i0;
    } else if (s.kind === "slab") {
      E.q = sg.extra > 0 ? clamp((y - sg.a - lead(H)) / sg.extra, 0, 1) : 0;
    } else if (s.kind === "final") {
      E.psi = clamp((y - sg.a - 0.08 * H) / (1.25 * H * PACE_R), 0, 1);
    }
  } else {
    const tr = path.TR[i];
    const fe = profile(f);
    E.fe = fe;
    E.c = tr.c;
    E.idx = lerp(tr.a, tr.b, fe);
    E.near = f < 0.5 ? i : i + 1;
    if (i === 1) {
      E.orb = sstep(0.5, 1.0, fe);
      E.pre = sstep(0.3, 1.0, fe);
    }
    if (i === 2) {
      E.orb = 1 - sstep(0.0, 0.55, fe);
      E.rho = 1;
      E.pre = 1;
      E.leave = fe;
    }
    if (i === 5) E.psi = 0;
  }
  if (i > 2) {
    E.rho = 1;
    E.pre = 1;
  }
  return E;
}
