import * as THREE from "three";
import { clamp } from "./math";

const V3 = THREE.Vector3;

/** Levhanın önünde kameranın durduğu uzaklık (birim). */
export const DR = 9.0;
/** Levhadan geçiş derinliği. */
export const THRU = 1.6;
export const RC = new V3(-3, 0, -56); // robot merkezi
export const LC0 = new V3(0.8, 1.4, -160); // final dinlenme kamerası
export const F_PULL = 3.0;
export const DF = 18;

/** Ölçü ve düzen durumu; layout() her yeniden hesapta günceller. */
export interface Dims {
  W: number;
  H: number;
  aspect: number;
  fovBase: number;
  /** Dünya biriminin ekrandaki piksel karşılığı (levha düzleminde). */
  ppu: number;
  availH: number;
  topH: number;
  gutPx: number;
  dyPx: number;
  /** Dar ekranda yörünge yarıçapı çarpanı. */
  Rk: number;
  kPx: number;
}

export function createDims(): Dims {
  return { W: 0, H: 0, aspect: 1, fovBase: 40, ppu: 100, availH: 700, topH: 64, gutPx: 24, dyPx: 12, Rk: 1, kPx: 0.03 };
}

export interface Station {
  c: THREE.Vector3;
  q: THREE.Quaternion;
  n: THREE.Vector3;
  up: THREE.Vector3;
  wpx: number;
  el: HTMLElement | null;
  w: number;
  h: number;
  /** İçerik levhadan yüksekse taşan miktar (px); levha içinde kaydırılır. */
  over: number;
  nat: number;
}

interface StationDef {
  c: [number, number, number];
  yaw: number;
  pitch: number;
  roll: number;
  wpx: number;
}

const STATION_DEFS: StationDef[] = [
  { c: [0.5, 0.2, -24], yaw: 0.28, pitch: 0.02, roll: 0.025, wpx: 1200 },
  { c: [7, 1.0, -88], yaw: -0.32, pitch: -0.02, roll: -0.03, wpx: 1200 },
  { c: [-2, -0.4, -114], yaw: 0.24, pitch: 0.03, roll: 0.02, wpx: 1200 },
  { c: [4, 0.8, -140], yaw: -0.2, pitch: -0.02, roll: -0.025, wpx: 980 },
];

export function createStations(): Station[] {
  return STATION_DEFS.map((d) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(d.pitch, d.yaw, d.roll, "YXZ"));
    return {
      c: new V3(d.c[0], d.c[1], d.c[2]),
      q,
      n: new V3(0, 0, 1).applyQuaternion(q),
      up: new V3(0, 1, 0).applyQuaternion(q),
      wpx: d.wpx,
      el: null,
      w: 800,
      h: 500,
      over: 0,
      nat: 500,
    };
  });
}

const ORB = { R: 11.5, th0: -0.6, sweep: 2.5 };

/** Robot çevresindeki yörünge konumu; rho 0..1. */
export function orbitPos(rho: number, Rk: number, out: THREE.Vector3): THREE.Vector3 {
  const r = clamp(rho, 0, 1);
  const e = r * r * (3 - 2 * r) * 0.4 + r * 0.6;
  const th = ORB.th0 + ORB.sweep * e;
  const R = ORB.R * Rk * (1 + 0.08 * Math.sin(r * Math.PI));
  const h = 2.3 + 2.6 * Math.sin(r * Math.PI * 0.9);
  return out.set(RC.x + Math.sin(th) * R, RC.y + h, RC.z + Math.cos(th) * R);
}

export interface PathCurve {
  curve: THREE.CatmullRomCurve3;
  /** Denetim noktası sayısı (indeks haritası için). */
  n: number;
}

export interface PathData {
  curves: PathCurve[];
  MK: { A: { hero: number; frc: number; robot: number }; B: { robotX: number; team: number; spon: number; cont: number; final: number } };
  /** İstasyon dinlenme bölümleri: hangi eğri, hangi indeks, sürüklenme payı. */
  SI: Array<{ c: number; i0: number; dr: number }>;
  /** Geçiş bölümleri. */
  TR: Array<{ c: number; a: number; b: number }>;
}

export function makePath(ST: Station[], dims: Dims): PathData {
  const dyU = dims.dyPx / dims.ppu;
  const C = ST.map((s) => s.c.clone().addScaledVector(s.n, DR).addScaledVector(s.up, dyU));
  const T_ = ST.map((s) => s.c.clone().addScaledVector(s.n, -THRU));
  const Cr0 = orbitPos(0, dims.Rk, new V3());
  const Cr1 = orbitPos(1, dims.Rk, new V3());
  const C0 = new V3(0, 0, 0);
  let pts = [C0, new V3(1.6, -0.9, -8.5), C[0], T_[0], new V3(-2.5, 1.4, -34.5), new V3(-6.5, 2.2, -41.5), Cr0];
  const A = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const fin = LC0.clone().add(new V3(0, 0, -F_PULL));
  pts = [Cr1, new V3(7.4, 2.2, -70), C[1], T_[1], new V3(5, 0.5, -98), C[2], T_[2], new V3(-1, 0.3, -124), C[3], T_[3], new V3(3, 1.0, -151), fin];
  const B = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const MK = { A: { hero: 0, frc: 2, robot: 6 }, B: { robotX: 0, team: 2, spon: 5, cont: 8, final: 11 } };
  return {
    curves: [
      { curve: A, n: 7 },
      { curve: B, n: 12 },
    ],
    MK,
    SI: [
      { c: 0, i0: 0, dr: 0.05 },
      { c: 0, i0: MK.A.frc, dr: 0.05 },
      { c: 0, i0: MK.A.robot, dr: 0 },
      { c: 1, i0: MK.B.team, dr: 0.05 },
      { c: 1, i0: MK.B.spon, dr: 0.05 },
      { c: 1, i0: MK.B.cont, dr: 0.05 },
      { c: 1, i0: MK.B.final, dr: 0 },
    ],
    TR: [
      { c: 0, a: 0.05, b: MK.A.frc },
      { c: 0, a: MK.A.frc + 0.05, b: MK.A.robot },
      { c: 1, a: 0, b: MK.B.team },
      { c: 1, a: MK.B.team + 0.05, b: MK.B.spon },
      { c: 1, a: MK.B.spon + 0.05, b: MK.B.cont },
      { c: 1, a: MK.B.cont + 0.05, b: MK.B.final },
    ],
  };
}

const tmpP = new V3();
const tmpP2 = new V3();

export function cpt(path: PathData, c: number, idx: number, out: THREE.Vector3): THREE.Vector3 {
  const pc = path.curves[c];
  return pc.curve.getPoint(clamp(idx / (pc.n - 1), 0, 1), out);
}

export function ctan(path: PathData, c: number, idx: number, out: THREE.Vector3): THREE.Vector3 {
  const pc = path.curves[c];
  const m = pc.n - 1;
  let i1 = idx;
  let i2 = idx + 0.4;
  if (i2 > m) {
    i2 = m;
    i1 = m - 0.4;
  }
  if (i1 < 0) {
    i1 = 0;
    i2 = 0.4;
  }
  pc.curve.getPoint(i1 / m, tmpP);
  pc.curve.getPoint(i2 / m, tmpP2);
  return out.subVectors(tmpP2, tmpP).normalize();
}

const mLook = new THREE.Matrix4();
const UPV = new V3(0, 1, 0);

export function lookQ(eye: THREE.Vector3, target: THREE.Vector3, out: THREE.Quaternion): THREE.Quaternion {
  mLook.lookAt(eye, target, UPV);
  return out.setFromRotationMatrix(mLook);
}
