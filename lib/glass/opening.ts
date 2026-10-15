import { buildShards, scarPath, TAU, type BreakPlan, type Shard } from "./voronoi";

/** Cam kırıldığında (site kilidi açılınca) document üzerinde yayılır; detail: GlassStats. */
export const EVENT_OPEN = "bp:open";
/** "Tekrar kır" ile cam yeniden kapandığında yayılır. */
export const EVENT_RESET = "bp:reset";
/** Arayüzden (Final bölümü) yeniden kırma isteği; GlassOpening dinler. */
export const EVENT_REPLAY = "bp:replay";

export interface GlassStats {
  x: number;
  y: number;
  shards: number;
  crack: number;
}

let lastOpenStats: GlassStats | null = null;
/** Cam en son kırıldığında yayılan istatistik (3B motor geç başlarsa buradan okur); hiç kırılmadıysa null. */
export function getLastOpenStats(): GlassStats | null {
  return lastOpenStats;
}

export interface GlassElements {
  glass: HTMLButtonElement;
  base: HTMLCanvasElement;
  fx: HTMLCanvasElement;
  site: HTMLElement;
  scar: HTMLElement | null;
}

export interface GlassOptions {
  /** İlk çizim çözünürlük ölçeği (zayıf/dokunmatik cihazda 0.6): ilk çizim pahalıdır, tespit bitmeden doğru ölçekle başlanır. */
  initialScale?: number;
}

export interface GlassController {
  /** Cam kapalı başlar; hareket azaltma açıksa camsız açılır. */
  start(): void;
  /** Çözünürlük ölçeğini değiştirir (düşük kademede 0.6); yalnız beklerken yeniden çizer. */
  setScale(scale: number): void;
  isOpen(): boolean;
  destroy(): void;
}

type GlassState = "idle" | "cracking" | "falling" | "open";

const DISP = 'Oswald, "Arial Narrow", Impact, sans-serif';
const BODY = '"Roboto Condensed", "Arial Narrow", sans-serif';
const SVG_NS = "http://www.w3.org/2000/svg";
const FONT_WAIT_MS = 1200;

function makeNoise(): HTMLCanvasElement {
  const s = 220;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d");
  if (!g) return c;
  const id = g.createImageData(s, s);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = Math.random();
    if (r < 0.55) {
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.random() * 34;
    } else if (r < 0.7) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = Math.random() * 30;
    }
  }
  g.putImageData(id, 0, 0);
  return c;
}

function notchPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number): void {
  g.beginPath();
  g.moveTo(x + c, y);
  g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c);
  g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h);
  g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c);
  g.lineTo(x, y + c);
  g.closePath();
}

function setSpacing(g: CanvasRenderingContext2D, px: number): void {
  if ("letterSpacing" in g) g.letterSpacing = `${px}px`;
}

export function createGlassOpening(els: GlassElements, options: GlassOptions = {}): GlassController {
  const { glass, base: baseCv, fx: fxCv, site, scar } = els;
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bctx = baseCv.getContext("2d");
  const fx = fxCv.getContext("2d");
  const noop: GlassController = { start() {}, setScale() {}, isOpen: () => true, destroy() {} };
  if (!bctx || !fx) return noop;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let scale = options.initialScale ?? 1;
  let state: GlassState = "idle";
  let rafId = 0;
  let noiseCv: HTMLCanvasElement | null = null;
  let S: BreakPlan | null = null;
  let t0 = 0;
  let spritesMode = false;
  let resizeTimer = 0;
  let destroyed = false;
  let started = false;
  /** Cam çizildi ve etkileşime hazır (yazı tipi beklenirken false). */
  let armed = false;
  let lastStats: GlassStats = { x: 0, y: 0, shards: 0, crack: 0 };
  const hint = { x: 0, y: 0 };
  const ptr = { x: 0, y: 0, lx: 0, ly: 0, a: 0, ta: 0 };

  function measure(): void {
    const r = glass.getBoundingClientRect();
    W = Math.round(r.width) || window.innerWidth;
    H = Math.round(r.height) || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
    const narrow = W < 720;
    hint.x = W * (narrow ? 0.5 : 0.7);
    hint.y = H * (narrow ? 0.3 : 0.34);
  }

  function sizeCanvases(): void {
    for (const c of [baseCv, fxCv]) {
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(H * dpr));
    }
  }

  function renderBase(): void {
    const g = bctx as CanvasRenderingContext2D;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    g.fillStyle = "rgba(18,16,12,0.40)";
    g.fillRect(0, 0, W, H);

    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, "rgba(255,252,240,0.20)");
    gr.addColorStop(0.45, "rgba(255,252,240,0.06)");
    gr.addColorStop(1, "rgba(255,252,240,0.15)");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    if (!noiseCv) noiseCv = makeNoise();
    const pat = g.createPattern(noiseCv, "repeat");
    if (pat) {
      g.fillStyle = pat;
      g.fillRect(0, 0, W, H);
    }

    // çapraz yansımalar
    g.save();
    g.translate(W * 0.5, H * 0.5);
    g.rotate(-0.5);
    const L = Math.hypot(W, H);
    const bands: Array<[number, number, number]> = [
      [-0.3, 0.1, 0.11],
      [-0.06, 0.05, 0.07],
      [0.17, 0.16, 0.1],
      [0.36, 0.03, 0.06],
    ];
    for (const b of bands) {
      const x = b[0] * L;
      const bw = b[1] * L;
      const lg = g.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
      lg.addColorStop(0, "rgba(255,255,255,0)");
      lg.addColorStop(0.5, `rgba(255,255,255,${b[2]})`);
      lg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = lg;
      g.fillRect(x - bw / 2, -L, bw, 2 * L);
    }
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(-0.19 * L, -L, 1.5, 2 * L);
    g.fillRect(0.27 * L, -L, 1, 2 * L);
    g.restore();

    // kenar kararması
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.38)");
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);

    // çerçeve (çentikli köşeler)
    const p = Math.max(10, Math.min(W, H) * 0.025);
    notchPath(g, p, p, W - 2 * p, H - 2 * p, 18);
    g.strokeStyle = "rgba(255,255,255,0.28)";
    g.lineWidth = 1;
    g.stroke();

    // rozet + isim
    const pad = p + 20;
    const bs = W < 720 ? 40 : 52;
    g.beginPath();
    g.moveTo(pad, pad);
    g.lineTo(pad + bs, pad);
    g.lineTo(pad + bs, pad + bs * 0.64);
    g.lineTo(pad + bs * 0.76, pad + bs * 0.58);
    g.lineTo(pad + bs * 0.62, pad + bs);
    g.lineTo(pad, pad + bs);
    g.closePath();
    g.fillStyle = "#FED233";
    g.fill();
    g.fillStyle = "#12100C";
    g.textBaseline = "alphabetic";
    g.textAlign = "center";
    g.font = `700 ${Math.round(bs * 0.5)}px ${DISP}`;
    setSpacing(g, 0);
    g.fillText("BP", pad + bs * 0.46, pad + bs * 0.62);
    g.textAlign = "left";
    const nameFs = W < 720 ? 20 : 26;
    g.font = `700 ${nameFs}px ${DISP}`;
    setSpacing(g, W < 720 ? 2.5 : 3.5);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillText("BREAKPOINT #12050", pad + bs + 15, pad + bs * 0.5 + nameFs * 0.36 + 1.5);
    g.fillStyle = "rgba(255,255,255,0.94)";
    g.fillText("BREAKPOINT #12050", pad + bs + 14, pad + bs * 0.5 + nameFs * 0.36);
    setSpacing(g, 0);

    // yönerge
    const lines = ["KIRMAK İÇİN", "VUR."];
    g.font = `700 100px ${DISP}`;
    const mw = Math.max(g.measureText(lines[0]).width, g.measureText(lines[1]).width) || 520;
    const fs = Math.max(36, Math.min(150, ((W - 2 * pad) / mw) * 100, H * 0.2));
    const lh = fs * 1.12;
    const subFs = W < 720 ? 17 : 20;
    const subY = H - p - 22;
    const y2 = subY - subFs - 18;
    const y1 = y2 - lh;
    g.font = `700 ${fs}px ${DISP}`;
    const rows: Array<[string, number]> = [
      [lines[0], y1],
      [lines[1], y2],
    ];
    for (const [text, y] of rows) {
      g.fillStyle = "rgba(0,0,0,0.38)";
      g.fillText(text, pad + 3, y + 3);
      g.fillStyle = "rgba(255,255,255,0.92)";
      g.fillText(text, pad, y);
    }
    g.font = `400 ${subFs}px ${BODY}`;
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.fillText("Cama istediğin yerden tıkla ya da dokun.", pad, subY);
  }

  function drawHint(t: number): void {
    const f = fx as CanvasRenderingContext2D;
    const ph = (t / 1700) % 1;
    f.lineWidth = 2;
    for (let k = 0; k < 2; k++) {
      const p = (ph + k / 2) % 1;
      f.strokeStyle = `rgba(254,210,51,${(0.9 * (1 - p)).toFixed(3)})`;
      f.beginPath();
      f.arc(hint.x, hint.y, 9 + 48 * p, 0, TAU);
      f.stroke();
    }
    f.strokeStyle = "rgba(254,210,51,0.7)";
    f.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4 + Math.PI / 4;
      const c = Math.cos(a);
      const s = Math.sin(a);
      f.beginPath();
      f.moveTo(hint.x + c * 15, hint.y + s * 15);
      f.lineTo(hint.x + c * 22, hint.y + s * 22);
      f.stroke();
    }
    f.fillStyle = "#FED233";
    f.beginPath();
    f.arc(hint.x, hint.y, 5, 0, TAU);
    f.fill();
    f.strokeStyle = "rgba(18,16,12,0.85)";
    f.lineWidth = 1.5;
    f.stroke();
  }

  function frameIdle(t: number): void {
    if (state !== "idle" || destroyed) return;
    const f = fx as CanvasRenderingContext2D;
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.clearRect(0, 0, W, H);
    ptr.a += (ptr.ta - ptr.a) * 0.1;
    ptr.lx += (ptr.x - ptr.lx) * 0.14;
    ptr.ly += (ptr.y - ptr.ly) * 0.14;
    if (ptr.a > 0.01) {
      const R = Math.max(240, Math.min(W, H) * 0.4);
      const g = f.createRadialGradient(ptr.lx, ptr.ly, 0, ptr.lx, ptr.ly, R);
      g.addColorStop(0, `rgba(255,248,225,${(0.26 * ptr.a).toFixed(3)})`);
      g.addColorStop(0.4, `rgba(255,248,225,${(0.09 * ptr.a).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,248,225,0)");
      f.fillStyle = g;
      f.fillRect(0, 0, W, H);
      // ince parlama çizgisi imleci takip eder
      f.save();
      f.translate(ptr.lx, ptr.ly);
      f.rotate(-0.5);
      const lg = f.createLinearGradient(-60, 0, 60, 0);
      lg.addColorStop(0, "rgba(255,255,255,0)");
      lg.addColorStop(0.5, `rgba(255,255,255,${(0.22 * ptr.a).toFixed(3)})`);
      lg.addColorStop(1, "rgba(255,255,255,0)");
      f.fillStyle = lg;
      f.fillRect(-60, -Math.hypot(W, H), 120, 2 * Math.hypot(W, H));
      f.restore();
    }
    drawHint(t);
    rafId = requestAnimationFrame(frameIdle);
  }

  function makeSprite(s: Shard): void {
    const bwPx = Math.ceil(s.bwCss * dpr);
    const bhPx = Math.ceil(s.bhCss * dpr);
    const c = document.createElement("canvas");
    c.width = bwPx;
    c.height = bhPx;
    const bw = bwPx / dpr;
    const bh = bhPx / dpr;
    s.bw = bw;
    s.bh = bh;
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, -s.bx * dpr, -s.by * dpr);
    g.beginPath();
    g.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) g.lineTo(s.pts[i].x, s.pts[i].y);
    g.closePath();

    g.save();
    g.clip();
    g.drawImage(baseCv, s.bx * dpr, s.by * dpr, bwPx, bhPx, s.bx, s.by, bw, bh);
    // her parçaya kendi yüzey eğimi
    const an = Math.random() * TAU;
    const cxm = s.bx + bw / 2;
    const cym = s.by + bh / 2;
    const rr = Math.max(bw, bh) / 2;
    const fg = g.createLinearGradient(cxm - Math.cos(an) * rr, cym - Math.sin(an) * rr, cxm + Math.cos(an) * rr, cym + Math.sin(an) * rr);
    const fa = 0.04 + Math.random() * 0.12;
    fg.addColorStop(0, `rgba(255,255,255,${fa.toFixed(3)})`);
    fg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = fg;
    g.fillRect(s.bx, s.by, bw, bh);
    g.restore();

    // kenar: renk ayrışması + ince açık yansıma çizgisi
    g.save();
    g.clip();
    g.lineJoin = "round";
    g.lineWidth = 2.4;
    g.save();
    g.translate(1, 0);
    g.strokeStyle = "rgba(255,70,90,0.30)";
    g.stroke();
    g.restore();
    g.save();
    g.translate(-1, 0);
    g.strokeStyle = "rgba(70,210,255,0.30)";
    g.stroke();
    g.restore();
    const eg = g.createLinearGradient(s.bx, s.by, s.bx + bw, s.by + bh);
    eg.addColorStop(0, "rgba(255,255,255,0.8)");
    eg.addColorStop(1, "rgba(255,255,255,0.28)");
    g.strokeStyle = eg;
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
    s.spr = c;
  }

  function buildSprites(budgetMs: number, all: boolean): void {
    if (!S) return;
    const end = performance.now() + budgetMs;
    while (S.next < S.shards.length && (all || performance.now() < end)) makeSprite(S.shards[S.next++]);
  }

  function drawCracks(t: number): void {
    if (!S) return;
    const f = fx as CanvasRenderingContext2D;
    const pFar = new Path2D();
    const pNear = new Path2D();
    for (const e of S.edges) {
      if (e.border) continue;
      let p = (t - e.t0) / (e.t1 - e.t0);
      if (p <= 0) continue;
      if (p > 1) p = 1;
      p = 1 - (1 - p) * (1 - p);
      const target = p * e.len;
      let acc = 0;
      const path = e.near ? pNear : pFar;
      const pts = e.cp;
      path.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        const sl = Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
        if (acc + sl <= target) {
          path.lineTo(pts[j].x, pts[j].y);
          acc += sl;
        } else {
          const k = sl > 0 ? (target - acc) / sl : 0;
          path.lineTo(pts[j - 1].x + (pts[j].x - pts[j - 1].x) * k, pts[j - 1].y + (pts[j].y - pts[j - 1].y) * k);
          break;
        }
      }
    }
    f.lineJoin = "round";
    f.lineCap = "round";
    const widths: Array<[Path2D, number]> = [
      [pFar, 1],
      [pNear, 1.7],
    ];
    for (const [path, w] of widths) {
      f.strokeStyle = "rgba(0,0,0,0.38)";
      f.lineWidth = w + 2.2;
      f.stroke(path);
      f.strokeStyle = "rgba(255,255,255,0.88)";
      f.lineWidth = w;
      f.stroke(path);
    }
    // ezilme bölgesi
    f.strokeStyle = "rgba(255,255,255,0.95)";
    f.lineWidth = 1.2;
    f.beginPath();
    for (const l of S.star) {
      f.moveTo(l[0], l[1]);
      f.lineTo(l[2], l[3]);
    }
    f.stroke();
  }

  function drawFlash(t: number): void {
    if (!S) return;
    const f = fx as CanvasRenderingContext2D;
    const p = t / 0.28;
    if (p < 1) {
      const R = 40 + S.D * 0.12 * p;
      const a = (1 - p) * (1 - p);
      const g = f.createRadialGradient(S.ix, S.iy, 0, S.ix, S.iy, R);
      g.addColorStop(0, `rgba(255,255,255,${(0.95 * a).toFixed(3)})`);
      g.addColorStop(0.25, `rgba(254,210,51,${(0.5 * a).toFixed(3)})`);
      g.addColorStop(1, "rgba(254,210,51,0)");
      f.fillStyle = g;
      f.fillRect(0, 0, W, H);
    }
    const q = t / 0.45;
    if (q < 1) {
      f.strokeStyle = `rgba(255,255,255,${(0.22 * (1 - q)).toFixed(3)})`;
      f.lineWidth = 2;
      f.beginPath();
      f.arc(S.ix, S.iy, t * S.D * 2.4, 0, TAU);
      f.stroke();
    }
  }

  function drawShards(t: number): number {
    if (!S) return 0;
    const f = fx as CanvasRenderingContext2D;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, fxCv.width, fxCv.height);
    let alive = 0;
    for (const s of S.shards) {
      if (!s.spr) continue;
      const tf = t - s.fallAt;
      let x = s.cx;
      let y = s.cy;
      let rot = 0;
      let sx = 1;
      if (tf < 0) {
        const lead = s.fallAt - S.Tsw;
        if (lead > 0.05) {
          const ramp = Math.min(1, Math.max(0, (t - S.Tsw) / lead));
          const jit = Math.sin(t * 70 + s.seed) * ramp * ramp * 1.1;
          x += jit;
          rot = jit * 0.004;
        }
      } else {
        x += s.vx * tf;
        y += s.vy * tf + 0.5 * S.G * tf * tf;
        rot = s.w * tf;
        const raw = 0.45 + 0.55 * Math.abs(Math.cos(s.ph + s.wy * tf));
        sx = 1 - (1 - raw) * Math.min(1, tf / 0.25);
        if (y - s.r > H + 40) continue;
      }
      alive++;
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      f.setTransform(dpr * c * sx, dpr * sn * sx, -dpr * sn, dpr * c, dpr * x, dpr * y);
      f.drawImage(s.spr, s.bx - s.cx, s.by - s.cy, s.bw, s.bh);
    }
    return alive;
  }

  function announce(type: string): void {
    lastOpenStats = type === EVENT_OPEN ? lastStats : null;
    try {
      document.dispatchEvent(new CustomEvent<GlassStats>(type, { detail: lastStats }));
    } catch {
      // olay sistemi yoksa canlı panel güncellenmez, sayfa çalışır
    }
  }

  function unlockSite(): void {
    root.classList.remove("glass-on");
    site.inert = false;
    if (!root.classList.contains("live")) {
      root.classList.add("live");
      announce(EVENT_OPEN);
    }
  }

  function finish(): void {
    cancelAnimationFrame(rafId);
    (fx as CanvasRenderingContext2D).setTransform(1, 0, 0, 1, 0, 0);
    (fx as CanvasRenderingContext2D).clearRect(0, 0, fxCv.width, fxCv.height);
    glass.style.transform = "";
    glass.hidden = true;
    unlockSite();
    S = null;
    state = "open";
  }

  function frameBreak(now: number): void {
    if (destroyed || (state !== "cracking" && state !== "falling")) return;
    const f = fx as CanvasRenderingContext2D;
    const t = (now - t0) / 1000;
    if (!spritesMode && S) {
      f.setTransform(dpr, 0, 0, dpr, 0, 0);
      f.clearRect(0, 0, W, H);
      buildSprites(5, false);
      drawFlash(t);
      drawCracks(t);
      if (t < 0.34) {
        const k = 1 - t / 0.34;
        const a = k * k * 4;
        glass.style.transform = `translate(${((Math.random() - 0.5) * a).toFixed(2)}px,${((Math.random() - 0.5) * a).toFixed(2)}px)`;
      } else if (glass.style.transform) {
        glass.style.transform = "";
      }
      if (t >= S.Tsw) {
        buildSprites(0, true);
        spritesMode = true;
        state = "falling";
        baseCv.style.visibility = "hidden";
        unlockSite();
      }
    }
    if (spritesMode) {
      if (drawShards(t) === 0) {
        finish();
        return;
      }
    }
    rafId = requestAnimationFrame(frameBreak);
  }

  function placeScar(plan: BreakPlan, w: number, h: number): void {
    const sp = scarPath(plan);
    lastStats = { x: plan.ix, y: plan.iy, shards: plan.shards.length, crack: sp.crack };
    if (!scar) return;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", sp.d);
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", plan.ix.toFixed(1));
    dot.setAttribute("cy", plan.iy.toFixed(1));
    dot.setAttribute("r", "3.5");
    svg.append(path, dot);
    scar.replaceChildren(svg);
  }

  function shatter(ix: number, iy: number): void {
    if (state !== "idle") return;
    state = "cracking";
    cancelAnimationFrame(rafId);
    glass.classList.add("is-hit");
    S = buildShards(ix, iy, W, H);
    placeScar(S, W, H);
    spritesMode = false;
    const f = fx as CanvasRenderingContext2D;
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.clearRect(0, 0, W, H);
    t0 = performance.now();
    rafId = requestAnimationFrame((n) => {
      t0 = n;
      frameBreak(n);
    });
  }

  function startGlass(): void {
    glass.hidden = false;
    measure();
    sizeCanvases();
    renderBase();
    state = "idle";
    spritesMode = false;
    S = null;
    baseCv.style.visibility = "";
    glass.classList.remove("is-hit");
    glass.style.transform = "";
    root.classList.add("glass-on");
    if (root.classList.contains("live")) {
      root.classList.remove("live");
      announce(EVENT_RESET);
    }
    site.inert = true;
    const f = fx as CanvasRenderingContext2D;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, fxCv.width, fxCv.height);
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frameIdle);
    root.dataset.glassReady = "1";
    armed = true;
  }

  function openWithoutGlass(): void {
    glass.hidden = true;
    root.classList.remove("glass-on");
    site.inert = false;
    state = "open";
    const w = window.innerWidth;
    const h = window.innerHeight;
    placeScar(buildShards(w * 0.72, h * 0.36, w, h), w, h);
    root.classList.add("live");
    root.dataset.glassReady = "1";
    announce(EVENT_OPEN);
  }

  const onPointerMove = (e: PointerEvent): void => {
    const r = glass.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    if (ptr.ta === 0) {
      ptr.lx = ptr.x;
      ptr.ly = ptr.y;
    }
    ptr.ta = 1;
  };
  const onPointerLeave = (): void => {
    ptr.ta = 0;
  };
  const onPointerDown = (e: PointerEvent): void => {
    if (!armed || state !== "idle" || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const r = glass.getBoundingClientRect();
    shatter(e.clientX - r.left, e.clientY - r.top);
  };
  const onClick = (e: MouseEvent): void => {
    if (armed && e.detail === 0 && state === "idle") shatter(hint.x, hint.y); // klavye: Enter / Boşluk
  };
  const onReplay = (): void => {
    if (state !== "open" || mq.matches) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    startGlass();
    try {
      glass.focus({ preventScroll: true });
    } catch {
      // odaklanamazsa cam yine tıklanabilir
    }
  };
  const onResize = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (state === "idle") {
        measure();
        sizeCanvases();
        renderBase();
      } else if (state === "cracking" || state === "falling") {
        finish();
      }
    }, 140);
  };
  const onMotionChange = (): void => {
    if (!mq.matches || state === "open") return;
    // Hareket azaltma çalışma anında açıldı: cam beklerken ya da kırılırken camsız açılışa geç (gerçek iz ve istatistikle).
    if (state === "idle") openWithoutGlass();
    else finish();
  };

  glass.addEventListener("pointermove", onPointerMove);
  glass.addEventListener("pointerleave", onPointerLeave);
  glass.addEventListener("pointerdown", onPointerDown);
  glass.addEventListener("click", onClick);
  document.addEventListener(EVENT_REPLAY, onReplay);
  window.addEventListener("resize", onResize);
  mq.addEventListener("change", onMotionChange);

  return {
    start(): void {
      if (started || destroyed) return;
      started = true;
      if (mq.matches) {
        openWithoutGlass();
        return;
      }
      // Yazı tipleri hazır olmadan çizersek cam iki kez çizilir (yedek yazı tipi + gerçek yazı tipi): her çizim
      // ana iş parçacığını bloklar. Bu yüzden önce yazı tipi beklenir (en çok FONT_WAIT_MS), sonra tek çizim yapılır.
      const fonts = document.fonts;
      if (!fonts || typeof fonts.load !== "function") {
        startGlass();
        return;
      }
      const loads = Promise.all([
        fonts.load("700 40px Oswald", "KIRMAK İÇİN VUR. BREAKPOINT #12050 BP"),
        fonts.load('400 18px "Roboto Condensed"', "Cama istediğin yerden tıkla ya da dokun."),
      ]);
      let timedOut = false;
      const timeout = new Promise<void>((res) => {
        window.setTimeout(() => {
          timedOut = true;
          res();
        }, FONT_WAIT_MS);
      });
      Promise.race([loads, timeout])
        .catch(() => {
          // yazı tipi yüklenemezse yedek yazı tipiyle çizilir
        })
        .then(() => {
          if (destroyed) return;
          startGlass();
          if (timedOut) {
            // geç gelen yazı tipi için bir kez daha çiz
            loads
              .then(() => {
                if (!destroyed && state === "idle") renderBase();
              })
              .catch(() => {
                // yedek yazı tipiyle kalır
              });
          }
        });
    },
    setScale(next: number): void {
      if (next === scale) return;
      scale = next;
      if (armed && state === "idle") {
        measure();
        sizeCanvases();
        renderBase();
      }
    },
    isOpen: () => state === "open",
    destroy(): void {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      glass.removeEventListener("pointermove", onPointerMove);
      glass.removeEventListener("pointerleave", onPointerLeave);
      glass.removeEventListener("pointerdown", onPointerDown);
      glass.removeEventListener("click", onClick);
      document.removeEventListener(EVENT_REPLAY, onReplay);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onMotionChange);
      root.classList.remove("glass-on");
      site.inert = false;
      glass.hidden = true;
      S = null;
    },
  };
}
