import * as THREE from "three";
import type { GlassStats } from "../glass/opening";
import type { Ambient } from "./ambient";
import { buildAmbient } from "./ambient";
import type { Bloom } from "./bloom";
import { PH, type FlightQuality } from "./config";
import { createLetters, type Letters } from "./letters";
import { STS, SLAB_STS_INDEX, buildMap, createEval, evalMap, phaseY, stationY, type ScrollMap } from "./map";
import { clamp, lerp, sstep, sstep5 } from "./math";
import { EVENT_GOTO } from "../nav/jump";
import { buildRobot, type Robot } from "./robot";
import { createShared } from "./shared";
import { createHeroShatter, type HeroShatter } from "./shatter";
import { createSlabs, homography, projectSlab, projected, type Slabs } from "./slabs";
import {
  DF,
  DR,
  F_PULL,
  LC0,
  RC,
  cpt,
  createDims,
  createStations,
  ctan,
  lookQ,
  makePath,
  orbitPos,
  type Dims,
  type PathData,
  type Station,
} from "./world";

const V3 = THREE.Vector3;
const Q4 = THREE.Quaternion;

/** Hata ayıklama ve doğrulama için anlık durum (yalnız okunur). */
export interface FlightStat {
  y: number;
  i: number;
  ph: string;
  f: number;
  orb: number;
  rho: number;
  psi: number;
  lam: number;
  b: number[];
  intro: number;
  dpr: number;
  total: number;
  cam: number[];
  locked: number;
  calls: number;
  triangles: number;
  frames: number;
  slabTris: number;
  geometries: number;
  textures: number;
}

export interface FlightDebug {
  stat(): FlightStat;
  /** Kaydırma haritası: toplam yükseklik ve bölüm sınırları. */
  map(): { total: number; segs: Array<[string, number, number, number]>; stations: Record<string, number> };
  /** Yumuşatılmış kaydırmayı anında güncel konuma çeker. */
  snap(): void;
}

declare global {
  interface Window {
    __bpFlight?: FlightDebug;
  }
}

export interface FlightOptions {
  quality: FlightQuality;
  canvas: HTMLCanvasElement;
  /** Hareket azaltma açık (3B yine de zorla istenmişse): giriş düşüşü ve parıltı atlanır. */
  reducedMotion: boolean;
  /** Bloom modülü (yalnız T3'te çağıran tarafından yüklenir). */
  createBloom: typeof import("./bloom").createBloom | null;
  /** Kare penceresi ortalaması (ms) her 60 karede bir bildirilir (governor besler). */
  onFrameWindow?: (avgMs: number, engine: FlightEngine) => void;
  /** WebGL bağlamı kaybolursa ya da başlatma çökerse. */
  onFail: (reason: string) => void;
}

export interface FlightEngine {
  start(): void;
  stop(): void;
  onGlassOpen(stats: GlassStats | null): void;
  onGlassReset(): void;
  goTo(id: string, instant?: boolean): boolean;
  /** Robot parçası k'nın evresine kaydırır. */
  goToPart(k: number): void;
  readonly quality: FlightQuality;
  readonly dpr: number;
  hasBloom(): boolean;
  killBloom(): void;
  setDpr(next: number): void;
  ambientCount(): number;
  setAmbientCount(n: number): void;
  dispose(): void;
}

const TIME_STEP_MAX = 0.05;
const WINDOW_FRAMES = 60;
/** T1 talep üzerine çizim: kaydırma ya da hareket yokken en fazla bu aralıkta bir kare (≈10 fps). */
const IDLE_DRAW_MS = 100;

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function createFlight(opts: FlightOptions): FlightEngine {
  const { quality, canvas } = opts;
  const root = document.documentElement;
  const lite = quality.lite;
  const coarse = quality.coarse;
  const reduce = opts.reducedMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.msaa && !coarse, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const dprMax = Math.min(window.devicePixelRatio || 1, quality.dprMax);
  let dpr = dprMax;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x12100c, 0.026);
  const FOG = (scene.fog as THREE.FogExp2).density;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 260);
  const shared = createShared(FOG);

  const ST: Station[] = createStations();
  const dims: Dims = createDims();
  let path: PathData = makePath(ST, dims);
  const Cf = new V3().copy(LC0);

  /* DOM bağlantıları */
  const heroEl = el<HTMLElement>("top");
  const robotEl = el<HTMLElement>("robot");
  const finalEl = el<HTMLElement>("final");
  const trackEl = el<HTMLElement>("track");
  const stnEl = el<HTMLElement>("stn");
  const stnT = el<HTMLElement>("stn-t");
  const stageEl = el<HTMLElement>("stage");
  const topBar = el<HTMLElement>("top-bar");
  const footEl = document.querySelector<HTMLElement>(".s-final .foot");
  const flashEl = el<HTMLElement>("flash");
  const flEl = el<HTMLElement>("flight");
  const flT = el<HTMLElement>("fl-t");
  const flB = el<HTMLElement>("fl-b");
  const hudPh = el<HTMLElement>("hud-ph");
  const hudN = el<HTMLElement>("hud-n");
  const hudT = el<HTMLElement>("hud-t");
  const hudBar = el<HTMLElement>("hud-bar");
  const brkEl = document.querySelector<HTMLElement>(".brk");
  const parts = Array.from(document.querySelectorAll<HTMLElement>(".part"));
  if (!heroEl || !robotEl || !finalEl || !trackEl || !footEl || !flEl || !stageEl) {
    renderer.dispose();
    throw new Error("flight: gerekli DOM öğeleri yok");
  }
  for (const pane of Array.from(document.querySelectorAll<HTMLElement>(".pane[data-k]"))) {
    const k = parseInt(pane.getAttribute("data-k") ?? "-1", 10);
    if (k >= 0 && k < ST.length) ST[k].el = pane;
  }

  /* sahne parçaları */
  let ambient: Ambient;
  let slabs: Slabs;
  let robot: Robot;
  let letters: Letters;
  let shat: HeroShatter;
  try {
    ambient = buildAmbient(scene, path, ST, shared, { count: quality.ambientShards, lite });
    slabs = createSlabs(scene, shared, lite);
    robot = buildRobot(scene, shared, lite);
    letters = createLetters(scene, shared, lite);
    shat = createHeroShatter(heroEl);
  } catch (err) {
    // Parça kurulumu çökerse WebGL bağlamı sızmasın.
    renderer.dispose();
    try {
      renderer.getContext().getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // bağlam zaten kapalı
    }
    throw err;
  }
  let bloom: Bloom | null = null;
  let slabTris = 0;

  const NR = robot.count;
  if (hudT) hudT.textContent = String(NR);

  /* ölçü ve düzen */
  let W = 0;
  let H = 0;
  let lastW = 0;
  let lastH = 0;
  let map: ScrollMap = buildMap(1, [0, 0, 0, 0]);
  const E = createEval();
  let dirty = true;

  const layout = (): void => {
    // Küçültülmüş pencere / gizli iframe: boyut 0 iken düzen hesaplanmaz (sonsuz döngü ve NaN önlenir).
    if (window.innerWidth < 1 || window.innerHeight < 1) return;
    W = window.innerWidth;
    H = window.innerHeight;
    lastW = W;
    lastH = H;
    dims.W = W;
    dims.H = H;
    dims.aspect = W / H;
    dims.fovBase = dims.aspect < 1 ? 54 : 40;
    camera.fov = dims.fovBase;
    camera.aspect = dims.aspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    bloom?.setSize(W, H, dpr);
    shat.stale = true;
    dims.ppu = H / (2 * DR * Math.tan((dims.fovBase * Math.PI) / 360));
    dims.Rk = dims.aspect < 1 ? 1.35 : 1;
    ambient.pointUniforms.uScale.value = (H * dpr) / (2 * Math.tan((dims.fovBase * Math.PI) / 360));
    robot.uniforms.uScatScale.value.set(dims.aspect < 1 ? 0.55 : 1, dims.aspect < 1 ? 1.35 : 1, 1);
    dims.topH = topBar ? topBar.offsetHeight : 64;
    dims.gutPx = Math.max(16, Math.min(56, W * 0.04));
    dims.availH = Math.max(280, H - dims.topH - 46);
    dims.dyPx = (dims.topH - 46) / 2;
    const narrow = W < 860;
    root.classList.toggle("short", !narrow && H < 820);
    ST.forEach((s) => {
      if (!s.el) return;
      const w = Math.min(s.wpx, W - 2 * dims.gutPx - (narrow ? 0 : 36));
      s.w = Math.round(w);
      s.el.style.width = `${s.w}px`;
      s.el.style.height = "auto";
      s.el.style.setProperty("--ch", `${narrow ? 18 : 24}px`);
      const inner = s.el.firstElementChild as HTMLElement | null;
      s.nat = inner ? Math.ceil(inner.offsetHeight) : s.h;
      s.h = Math.min(s.nat, Math.round(dims.availH));
      s.over = Math.max(0, s.nat - s.h);
      s.el.style.height = `${s.h}px`;
    });
    dims.kPx = (2 * Math.tan((dims.fovBase * Math.PI) / 360) * DF) / H;
    path = makePath(ST, dims);
    Cf.copy(LC0);
    slabTris = slabs.build(ST, dims.ppu);
    map = buildMap(H, ST.map((s) => s.over));
    trackEl.style.height = `${Math.round(map.total)}px`;
    letters.build({ W, H, aspect: dims.aspect, dpr, kPx: dims.kPx, Cf });
    dirty = true;
  };

  /* kamera */
  const camPos = new V3();
  const camQ = new Q4();
  const qA = new Q4();
  const tgv = new V3();
  const orbV = new V3();
  const pathV = new V3();
  const qOrb = new Q4();
  const qOff = new Q4();
  const eul = new THREE.Euler();
  const rightV = new V3();
  const upV = new V3();
  const origin = new V3(0, 0, 0);
  const tgtR = new V3(RC.x, RC.y + 1.5, RC.z);
  const QHERO = new Q4();
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  let introT = 1;
  let introOn = false;

  const computeCamera = (): void => {
    const e = E;
    cpt(path, e.c, e.idx, pathV);
    ctan(path, e.c, e.idx, tgv);
    const qp = lookQ(origin, tgv, qA).clone();
    /* dinlenme yönelimleri */
    ST.forEach((s, k) => {
      const si = path.SI[1 + (k === 0 ? 0 : k + 1)];
      if (e.c !== si.c) return;
      const w = 1 - sstep(0.12, 0.85, Math.abs(e.idx - si.i0));
      if (w > 0) qp.slerp(s.q, w);
    });
    if (e.c === 0) {
      const wh = 1 - sstep(0.02, 0.7, e.idx);
      if (wh > 0) qp.slerp(QHERO, wh);
    }
    if (e.c === 1) {
      const wf = 1 - sstep(0.1, 0.9, Math.abs(e.idx - path.MK.B.final));
      if (wf > 0) qp.slerp(QHERO, wf);
    }
    const pos = pathV;
    if (e.i === 6 && e.ph === "d") {
      const pe = sstep5(0, 1, e.psi);
      pos.z += F_PULL * pe;
    }
    if (e.orb > 0) {
      orbitPos(e.rho, dims.Rk, orbV);
      lookQ(orbV, tgtR, qOrb);
      const visH = 2 * Math.tan((dims.fovBase * Math.PI) / 360) * orbV.distanceTo(tgtR);
      const visW = visH * dims.aspect;
      camPos.lerpVectors(pos, orbV, e.orb);
      qp.slerp(qOrb, e.orb);
      camQ.copy(qp);
      if (dims.aspect >= 1) {
        rightV.set(1, 0, 0).applyQuaternion(camQ);
        camPos.addScaledVector(rightV, -visW * 0.19 * e.orb);
      } else {
        upV.set(0, 1, 0).applyQuaternion(camQ);
        camPos.addScaledVector(upV, -visH * 0.2 * e.orb);
      }
    } else {
      camPos.copy(pos);
      camQ.copy(qp);
    }
    /* paralaks */
    const par = (e.i === 6 && e.ph === "d" ? 0.35 : 1) * (coarse ? 0.3 : 1);
    rightV.set(1, 0, 0).applyQuaternion(camQ);
    upV.set(0, 1, 0).applyQuaternion(camQ);
    camPos.addScaledVector(rightV, ptr.sx * 0.3 * par).addScaledVector(upV, -ptr.sy * 0.2 * par);
    eul.set(-ptr.sy * 0.022 * par, -ptr.sx * 0.04 * par, 0, "YXZ");
    qOff.setFromEuler(eul);
    camQ.multiply(qOff);
    /* düşüş */
    let fovNow = dims.fovBase;
    if (introOn && introT < 1) {
      const off = Math.pow(1 - introT, 3);
      camPos.y += 4.2 * off;
      camPos.z += 17 * off;
      eul.set(-0.34 * off, 0, 0.05 * off, "YXZ");
      qOff.setFromEuler(eul);
      camQ.multiply(qOff);
      fovNow = dims.fovBase + 20 * off;
    }
    camera.position.copy(camPos);
    camera.quaternion.copy(camQ);
    if (Math.abs(camera.fov - fovNow) > 0.01) {
      camera.fov = fovNow;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
  };

  /* DOM bağlama */
  const onWas = [false, false, false, false];
  let opMax = 0;
  const tmpP = new V3();
  const hideSlab = (k: number, node: HTMLElement): void => {
    if (node.classList.contains("vis")) {
      node.classList.remove("vis", "act", "on");
      node.style.opacity = "0";
      node.style.transform = "none";
    }
    onWas[k] = false;
    if (k === 2 && brkEl) brkEl.classList.remove("go");
  };
  const syncSlabs = (): void => {
    const bv = slabs.uniforms.uBrk.value;
    opMax = 0;
    ST.forEach((s, k) => {
      const dS = tmpP.copy(camera.position).sub(s.c).dot(s.n);
      const b = 1 - sstep(0.7, DR * 0.96, dS);
      if (k === 0) bv.x = b;
      else if (k === 1) bv.y = b;
      else if (k === 2) bv.z = b;
      else bv.w = b;
      const node = s.el;
      if (!node) return;
      const show = b < 0.2 && dS > 1.0 && projectSlab(s, dims.ppu, camera, W, H);
      if (!show) {
        hideSlab(k, node);
        return;
      }
      const topW = Math.hypot(projected[2] - projected[0], projected[3] - projected[1]);
      const sf = topW / s.w;
      const op = sstep(0.42, 0.8, sf) * (1 - sstep(0.015, 0.1, b));
      const m = homography(s.w, s.h, projected);
      if (!m || op < 0.01) {
        hideSlab(k, node);
        return;
      }
      if (op > opMax) opMax = op;
      if (!node.classList.contains("vis")) node.classList.add("vis");
      node.style.transform = m;
      node.style.opacity = op.toFixed(3);
      if (!onWas[k] && op > 0.88 && b < 0.02) {
        onWas[k] = true;
        node.classList.add("on");
        if (k === 2 && brkEl) brkEl.classList.add("go");
      }
      node.classList.toggle("act", op > 0.7);
      const inner = node.firstElementChild as HTMLElement | null;
      if (inner) {
        const si2 = SLAB_STS_INDEX[k];
        const qq2 = E.i < si2 ? 0 : E.i === si2 ? (E.ph === "d" ? E.q : 1) : 1;
        const ty = s.over > 0 ? -(s.over * qq2) : 0;
        inner.style.transform = ty ? `translate3d(0,${ty.toFixed(1)}px,0)` : "";
      }
    });
  };

  /* güncelleme */
  let sY = 0;
  let glintT = -1;
  let glintOn = false;
  let tmAcc = 0;
  const avs = [0, 0, 0, 0];
  let lastN = -1;
  let lastPh = "";
  let lastPP = -1;
  let lastIdx = -1;
  let lastStn = -1;
  let lastFl = "";
  let lam = 0;
  let lastLocked = 0;
  const phNames = ["şasi", "mekanizma", "elektronik", "yazılım"];
  let openStats: GlassStats | null = null;
  let glassOpen = root.classList.contains("live");
  const lightSel: number[] = [0, 0, 0, 0];

  const countLocked = (): number => {
    let n = 0;
    for (let q = 0; q < NR; q++) if ((avs[robot.groups[q]] - 0.6 * robot.delays[q]) / 0.4 >= 0.999) n++;
    return n;
  };

  const emit = (name: string, detail: unknown): void => {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      // olay yayılamazsa arayüz bu güncellemeyi almaz, sahne çalışır
    }
  };

  const update = (dt: number, tm: number): void => {
    const y = window.scrollY;
    const stp = (y - sY) * (1 - Math.exp(-dt * 6.5));
    const lim = H * 3.2 * dt;
    const before = sY;
    sY += clamp(stp, -lim, lim);
    if (Math.abs(sY - y) < 0.3) sY = y;
    const px0 = ptr.sx;
    const py0 = ptr.sy;
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 3));
    ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 3));
    if (introOn && introT < 1) {
      introT = Math.min(1, introT + dt / 2.6);
      dirty = true;
    }
    if (sY !== before || Math.abs(ptr.sx - px0) > 1e-4 || Math.abs(ptr.sy - py0) > 1e-4) dirty = true;
    evalMap(map, path, sY, E);
    computeCamera();

    /* mağara ışığı: kameraya en yakın dört sarı nokta */
    const lp = ambient.lightPos;
    const bd = [1e9, 1e9, 1e9, 1e9];
    for (let li = 0; li < lp.length; li++) {
      const d2 = lp[li].distanceToSquared(camera.position);
      for (let s2 = 0; s2 < 4; s2++) {
        if (d2 < bd[s2]) {
          for (let z = 3; z > s2; z--) {
            bd[z] = bd[z - 1];
            lightSel[z] = lightSel[z - 1];
          }
          bd[s2] = d2;
          lightSel[s2] = li;
          break;
        }
      }
    }
    const LUv = ambient.uniforms.uL.value;
    for (let s2 = 0; s2 < 4; s2++) if (lp.length) LUv[s2].copy(lp[lightSel[s2]]);
    shared.time.value = tm;
    ambient.uniforms.uAmb.value = sstep(0, 0.5, introT) * 0.88;

    /* robot */
    lam = PH.pre * E.pre + (1 - PH.pre) * E.rho;
    for (let k = 0; k < 4; k++) avs[k] = clamp((lam - PH.start[k]) / (PH.end[k] - PH.start[k]), 0, 1);
    const RU = robot.uniforms;
    RU.uAv.value.set(avs[0], avs[1], avs[2], avs[3]);
    const bk = E.i > 2 ? 1 : E.i === 2 && E.ph === "t" ? sstep(0.12, 0.9, E.leave) : 0;
    RU.uBreak.value = bk;
    RU.uRing.value = tm * 0.18;
    RU.uSoft.value = avs[3] * (1 - bk);
    RU.uElec.value = sstep(0.6, 1.0, avs[2]);
    robot.floorOp.value = avs[0] * (1 - sstep(0.1, 0.6, bk));
    const dRobot = camera.position.distanceTo(RC);
    robot.mesh.visible = robot.floor.visible = dRobot < 80;
    robot.group.rotation.y = tm * 0.03;

    /* final yazısı */
    const dLet = camera.position.distanceTo(letters.txtMesh.position);
    const inFinal = letters.isReady() && dLet < 120;
    letters.setVisible(inFinal);
    const psi = E.i === 6 && E.ph === "d" ? E.psi : 0;
    const build = psi < 0.001 && E.i < 6 ? 0 : sstep5(0.03, 0.82, psi) * 1.08;
    letters.letUniforms.uBuild.value = build;
    const bx = (build - 0.1) / 0.8;
    const txtA = sstep(0.9, 0.97, psi);
    letters.letUniforms.uAlpha.value = 1 - sstep(0.97, 1.0, psi) * 1.0;
    letters.txtUniforms.uA.value = txtA;
    /* son ışın: tamamlanınca bir kez yazının üstünden geçer */
    if (psi >= 0.985 && !glintOn) {
      glintOn = true;
      glintT = 0;
    }
    if (psi < 0.9) {
      glintOn = false;
      glintT = -1;
    }
    if (glintT >= 0 && glintT < 1) {
      glintT = Math.min(1, glintT + dt / 1.4);
      dirty = true;
    }
    let beamU = -1;
    let beamA = 0;
    const tb = letters.bounds;
    if (glintOn && glintT >= 0 && glintT < 1) {
      const gp = sstep(0, 1, glintT);
      beamU = lerp(-0.12, 1.12, gp);
      beamA = Math.sin(Math.PI * clamp(glintT, 0, 1)) * 1.0;
      letters.txtUniforms.uG.value = tb.u0 + beamU * (tb.u1 - tb.u0);
      letters.txtUniforms.uGa.value = beamA;
    } else {
      letters.txtUniforms.uGa.value = 0;
      if (psi > 0.01 && psi < 0.9) {
        beamU = bx;
        beamA = sstep(-0.1, 0.05, bx) * (1 - sstep(1.05, 1.18, bx));
      }
    }
    letters.beamUniforms.uA.value = beamA * 1.15;
    letters.beamMesh.visible = beamA > 0.01 && letters.isReady();
    if (letters.beamMesh.visible) letters.beamMesh.position.x = lerp(tb.x0, tb.x1, beamU);
    letters.txtMesh.visible = letters.isReady() && txtA > 0.003;

    syncSlabs();

    /* hero, robot ve final: DOM */
    const hp = E.i === 0 && E.ph === "t" ? clamp(E.f / 0.6, 0, 1) : E.i > 0 ? 1 : 0;
    const heroOp = hp >= 1 ? 0 : 1;
    if (hp > 0.0005 && hp < 1) {
      if (!shat.active || shat.stale) {
        const ox = openStats ? openStats.x : W * 0.7;
        const oy = openStats ? openStats.y : H * 0.34;
        shat.build(ox, oy, W, H, lite);
      }
      heroEl.classList.add("shat-on");
      shat.update(hp);
    } else {
      if (shat.active) shat.destroy();
      heroEl.classList.remove("shat-on");
    }
    heroEl.style.setProperty("--hp", hp.toFixed(3));
    heroEl.style.opacity = heroOp.toFixed(3);
    heroEl.style.transform = "";
    heroEl.classList.toggle("vis", heroOp > 0.01);
    heroEl.classList.toggle("act", hp < 0.0005);
    ambient.uniforms.uBurst.value = E.i === 0 && E.ph === "t" ? sstep(0.0, 0.75, E.f) : E.i > 0 ? 1 : 0;
    const rOp = sstep(0.55, 0.95, E.orb);
    robotEl.style.opacity = rOp.toFixed(3);
    robotEl.classList.toggle("vis", rOp > 0.01);
    robotEl.classList.toggle("act", rOp > 0.6);
    const fOp = E.i === 6 && E.ph === "d" ? sstep(0.15, 0.4, E.f) : 0;
    finalEl.style.opacity = E.i === 6 ? "1" : "0";
    finalEl.classList.toggle("vis", fOp > 0.01 || E.i === 6);
    const fa = E.i === 6 && E.ph === "d" ? sstep(0.8, 1.0, psi) : 0;
    footEl.style.opacity = fa.toFixed(3);
    finalEl.classList.toggle("act", fa > 0.5);

    /* uçuş göstergesi: levha geçişlerinde ve ekran boşken sıradaki bölüm + ince ilerleme */
    const cvis = Math.max(opMax, hp < 1 ? 1 - sstep(0.1, 0.7, hp) : 0, rOp, fa);
    const flOp = E.ph === "t" ? clamp(0.2 + 0.8 * (1 - cvis), 0, 1) : 0;
    flEl.style.opacity = flOp.toFixed(2);
    if (E.ph === "t") {
      const fn = `sıradaki: ${STS[E.i + 1].name}`;
      if (fn !== lastFl) {
        lastFl = fn;
        if (flT) flT.textContent = fn;
      }
      if (flB) flB.style.transform = `scaleX(${clamp(E.f, 0, 1).toFixed(3)})`;
    }

    /* robot parça listesi + HUD (yalnız görünürken) */
    if (rOp > 0.01) {
      const idx = lam < PH.start[1] ? 0 : lam < PH.start[2] ? 1 : lam < PH.start[3] ? 2 : 3;
      if (idx !== lastIdx) {
        lastIdx = idx;
        emit("bp:part", { index: idx });
      }
      const pp = clamp(avs[idx], 0, 1);
      if (Math.abs(pp - lastPP) > 0.004 && parts[idx]) {
        lastPP = pp;
        parts[idx].style.setProperty("--pp", pp.toFixed(3));
      }
      const cnt = countLocked();
      if (cnt !== lastN) {
        lastN = cnt;
        lastLocked = cnt;
        if (hudN) hudN.textContent = String(cnt);
        if (hudBar) hudBar.style.transform = `scaleX(${(cnt / NR).toFixed(3)})`;
      }
      const phn = bk > 0.05 ? "kırıldı" : lam < 0.01 ? "dağınık" : phNames[idx];
      if (phn !== lastPh) {
        lastPh = phn;
        if (hudPh) hudPh.textContent = phn;
      }
    }
    /* konum etiketi + menü */
    const near = E.near;
    if (near !== lastStn) {
      lastStn = near;
      if (stnT) stnT.textContent = STS[near].name;
      if (stnEl) stnEl.style.opacity = near === 6 || near === 0 ? "0" : "";
      emit("bp:station", { id: STS[near].id });
    }
  };

  const draw = (dt: number): void => {
    if (bloom) bloom.render(dt);
    else renderer.render(scene, camera);
  };

  /* boyut ve yeniden düzen */
  let rzT = 0;
  let relayT = 0;
  const onResize = (): void => {
    window.clearTimeout(rzT);
    rzT = window.setTimeout(() => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      if (nw < 1 || nh < 1) return;
      if (nw === lastW && Math.abs(nh - lastH) < 140) {
        renderer.setSize(nw, nh, false);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        W = nw;
        H = nh;
        bloom?.setSize(W, H, dpr);
        dirty = true;
        return;
      }
      layout();
    }, 160);
  };
  const relayoutSoon = (): void => {
    window.clearTimeout(relayT);
    relayT = window.setTimeout(layout, 80);
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (W < 1 || H < 1) return;
    ptr.x = (e.clientX / W) * 2 - 1;
    ptr.y = (e.clientY / H) * 2 - 1;
  };

  /* döngü */
  let running = false;
  let rafId = 0;
  let last = 0;
  let lastDraw = 0;
  let ftSum = 0;
  let ftN = 0;
  let disposed = false;
  const self: FlightEngine = {
    start,
    stop,
    onGlassOpen,
    onGlassReset,
    goTo,
    goToPart,
    quality,
    get dpr() {
      return dpr;
    },
    hasBloom: () => bloom !== null,
    killBloom,
    setDpr,
    ambientCount: () => ambient.mesh.count,
    setAmbientCount(n: number): void {
      ambient.mesh.count = clamp(Math.round(n), 200, ambient.fullCount);
      dirty = true;
    },
    dispose,
  };

  function frame(now: number): void {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(TIME_STEP_MAX, (now - last) / 1000));
    last = now;
    tmAcc += dt;
    update(dt, tmAcc);
    if (!quality.onDemand || dirty || now - lastDraw >= IDLE_DRAW_MS) {
      draw(dt);
      lastDraw = now;
      dirty = false;
    }
    ftSum += dt;
    ftN++;
    if (ftN >= WINDOW_FRAMES) {
      const avg = ftSum / ftN;
      ftSum = 0;
      ftN = 0;
      opts.onFrameWindow?.(avg * 1000, self);
    }
  }
  function start(): void {
    if (running || disposed || document.hidden || !glassOpen) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop(): void {
    running = false;
    cancelAnimationFrame(rafId);
  }
  function killBloom(): void {
    if (!bloom) return;
    bloom.dispose();
    bloom = null;
    shared.glow.value = 1;
    robot.uniforms.uTone.value = 1;
    dirty = true;
  }
  function setDpr(next: number): void {
    dpr = Math.max(1, Math.min(dprMax, next));
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    bloom?.setSize(W, H, dpr);
    ambient.pointUniforms.uScale.value = (H * dpr) / (2 * Math.tan((dims.fovBase * Math.PI) / 360));
    dirty = true;
  }
  function onGlassOpen(stats: GlassStats | null): void {
    openStats = stats;
    glassOpen = true;
    introT = reduce ? 1 : 0;
    introOn = !reduce;
    layout();
    update(0.016, tmAcc);
    start();
    /* darbe ışığı: vuruş noktasından sarı bir parıltı */
    if (flashEl && !reduce) {
      const fx = stats ? stats.x : W * 0.7;
      const fy = stats ? stats.y : H * 0.34;
      flashEl.style.background = `radial-gradient(circle at ${Math.round(fx)}px ${Math.round(fy)}px, rgba(254,210,51,.6), rgba(254,210,51,.14) 30%, transparent 58%)`;
      flashEl.style.transition = "none";
      flashEl.style.opacity = "1";
      void flashEl.offsetWidth;
      flashEl.style.transition = "opacity 1.1s ease-out";
      flashEl.style.opacity = "0";
    }
  }
  function onGlassReset(): void {
    glassOpen = false;
    introOn = false;
    introT = 1;
    stop();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    sY = 0;
  }
  function goTo(id: string, instant = false, snap = false): boolean {
    const yy = id === "top" ? 0 : stationY(map, id);
    if (yy < 0) return false;
    window.scrollTo({ top: yy, behavior: instant || reduce ? "instant" : "smooth" });
    // Kamera kaydırmayı yumuşatarak izler; snap ile hedefe uçmadan doğrudan oturur.
    if (snap) {
      sY = window.scrollY;
      dirty = true;
    }
    return true;
  }
  const onGoTo = (e: Event): void => {
    const d = (e as CustomEvent<{ id: string }>).detail;
    if (d && typeof d.id === "string") goTo(d.id, true, true);
  };

  function goToPart(k: number): void {
    window.scrollTo({ top: phaseY(map, clamp(Math.round(k), 0, 3)), behavior: reduce ? "instant" : "smooth" });
  }
  const onGoToPart = (e: Event): void => {
    const d = (e as CustomEvent<{ index: number }>).detail;
    if (d && typeof d.index === "number") goToPart(d.index);
  };
  const onVisibility = (): void => {
    if (document.hidden) stop();
    else start();
  };
  const onContextLost = (ev: Event): void => {
    ev.preventDefault();
    stop();
    opts.onFail("webglcontextlost");
  };
  const onDocClick = (e: MouseEvent): void => {
    const t = e.target instanceof Element ? e.target : null;
    const a = t?.closest('a[href^="#"]');
    // Başka bir işleyici (menü, sponsor kartı) geçişi kendisi yönetiyorsa uçuş başlatma.
    if (e.defaultPrevented || !a || !root.classList.contains("gl")) return;
    const id = (a.getAttribute("href") ?? "").slice(1);
    if (goTo(id)) e.preventDefault();
  };
  const onStageScroll = (): void => {
    stageEl.scrollTop = 0;
    stageEl.scrollLeft = 0;
  };
  const onFocusIn = (e: FocusEvent): void => {
    const t = e.target instanceof Element ? e.target : null;
    const sl = t?.closest<HTMLElement>(".slab");
    if (!sl || !root.classList.contains("gl") || parseFloat(sl.style.opacity || "0") > 0.5) return;
    goTo(sl.id, true);
  };

  /* başlat */
  root.classList.add("gl");
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("load", relayoutSoon);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("click", onDocClick);
  document.addEventListener("bp:gotopart", onGoToPart);
  document.addEventListener(EVENT_GOTO, onGoTo);
  canvas.addEventListener("webglcontextlost", onContextLost, false);
  stageEl.addEventListener("scroll", onStageScroll);
  stageEl.addEventListener("focusin", onFocusIn);
  try {
    if (document.fonts && document.fonts.ready) {
      void document.fonts.ready.then(() => {
        if (!disposed) relayoutSoon();
      });
    }
  } catch {
    // yazı tipi hazır sinyali yoksa yalnız load olayı yeniden düzen tetikler
  }
  try {
    layout();
    if (opts.createBloom) {
      try {
        bloom = opts.createBloom(renderer, scene, camera, W, H, dpr, quality.msaa);
        shared.glow.value = 0;
        robot.uniforms.uTone.value = 0.82;
      } catch {
        bloom = null;
        shared.glow.value = 1;
      }
    }
    update(0.016, 0);
    if (!bloom) renderer.compile(scene, camera);
    draw(0.016);
  } catch (err) {
    dispose();
    throw err;
  }

  window.__bpFlight = {
    stat(): FlightStat {
      const info = renderer.info;
      return {
        y: Math.round(sY),
        i: E.i,
        ph: E.ph,
        f: +E.f.toFixed(3),
        orb: +E.orb.toFixed(2),
        rho: +E.rho.toFixed(3),
        psi: +E.psi.toFixed(3),
        lam: +lam.toFixed(3),
        b: [slabs.uniforms.uBrk.value.x, slabs.uniforms.uBrk.value.y, slabs.uniforms.uBrk.value.z, slabs.uniforms.uBrk.value.w].map((v) => +v.toFixed(2)),
        intro: +introT.toFixed(2),
        dpr,
        total: Math.round(map.total),
        cam: [camera.position.x, camera.position.y, camera.position.z].map((v) => +v.toFixed(1)),
        locked: lastLocked,
        calls: info.render.calls,
        triangles: info.render.triangles,
        frames: info.render.frame,
        slabTris,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      };
    },
    map() {
      const stations: Record<string, number> = {};
      for (const s of STS) stations[s.id] = s.id === "top" ? 0 : stationY(map, s.id);
      return { total: map.total, segs: map.segs.map((g) => [g.t, g.i, Math.round(g.a), Math.round(g.b)] as [string, number, number, number]), stations };
    },
    snap(): void {
      sY = window.scrollY;
    },
  };

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    stop();
    window.clearTimeout(rzT);
    window.clearTimeout(relayT);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", relayoutSoon);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("click", onDocClick);
    document.removeEventListener(EVENT_GOTO, onGoTo);
    document.removeEventListener("bp:gotopart", onGoToPart);
    canvas.removeEventListener("webglcontextlost", onContextLost, false);
    stageEl?.removeEventListener("scroll", onStageScroll);
    stageEl?.removeEventListener("focusin", onFocusIn);
    shat.destroy();
    bloom?.dispose();
    bloom = null;
    ambient.dispose();
    slabs.dispose();
    robot.dispose();
    letters.dispose();
    renderer.dispose();
    try {
      renderer.getContext().getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // bağlam zaten kapalı
    }
    /* DOM'u prototipteki düz akışa geri al */
    root.classList.remove("gl", "short");
    for (const node of Array.from(document.querySelectorAll<HTMLElement>(".slab, .slab-in"))) node.removeAttribute("style");
    for (const node of [heroEl, robotEl, finalEl]) node?.classList.remove("vis", "act", "shat-on", "on");
    for (const s of ST) s.el?.classList.remove("vis", "act", "on");
    footEl?.removeAttribute("style");
    flEl?.removeAttribute("style");
    if (trackEl) trackEl.style.height = "";
    if (window.__bpFlight) delete window.__bpFlight;
  }

  return self;
}
