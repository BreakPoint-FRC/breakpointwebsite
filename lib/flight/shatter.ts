import { clamp, mulberry, sstep } from "./math";

/** [seçici, kıymık payı, tutucu sınıfı]: hero'da hangi parçalar dağılır. */
const SH_TARGETS: Array<[string, number, string]> = [
  [".title", 1.0, ""],
  [".dbg", 0.1, ""],
  [".lead", 0.32, ""],
  [".hero-copy .btn", 0.14, "hero-copy"],
  [".watch", 0.4, ""],
  [".cue", 0.07, ""],
];

interface Piece {
  el: HTMLElement;
  delay: number;
  vx: number;
  vy: number;
  vz: number;
  ax: number;
  ay: number;
  az: number;
  ang: number;
  on: boolean;
}

export interface HeroShatter {
  readonly active: boolean;
  /** Boyut değişti: bir sonraki kullanımda yeniden kurulmalı. */
  stale: boolean;
  build(ox: number, oy: number, W: number, H: number, lite: boolean): void;
  update(hp: number): void;
  destroy(): void;
}

function stripClone(n: Node): void {
  if (n.nodeType !== 1) return;
  const el = n as Element;
  el.removeAttribute("id");
  el.removeAttribute("href");
  el.removeAttribute("for");
  if (el.tagName === "A" || el.tagName === "BUTTON") el.setAttribute("tabindex", "-1");
  for (let c = el.firstChild; c; c = c.nextSibling) stripClone(c);
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Hero parçalanması: metin ve ekran parçaları kaydırdıkça kıymıklara ayrılıp kameraya doğru savrulur.
 * Her kıymık, hero öğesinin klonunun bir üçgene kırpılmış kopyasıdır (yalnız transform/opacity animasyonu).
 */
export function createHeroShatter(heroEl: HTMLElement): HeroShatter {
  let layer: HTMLElement | null = null;
  let pieces: Piece[] = [];
  const state = { active: false, stale: false };

  const destroy = (): void => {
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
    pieces = [];
    state.active = false;
  };

  return {
    get active() {
      return state.active;
    },
    get stale() {
      return state.stale;
    },
    set stale(v: boolean) {
      state.stale = v;
    },
    build(ox: number, oy: number, W: number, H: number, lite: boolean): void {
      destroy();
      const lay = document.createElement("div");
      lay.className = "shat";
      lay.setAttribute("aria-hidden", "true");
      lay.inert = true;
      lay.style.perspectiveOrigin = `${Math.round(ox)}px ${Math.round(oy)}px`;
      const total = lite ? 40 : 78;
      const rg = mulberry(31);
      const maxd = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
      const hr = heroEl.getBoundingClientRect();
      for (const tg of SH_TARGETS) {
        const el = heroEl.querySelector<HTMLElement>(tg[0]);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        const n = Math.max(2, Math.round(total * tg[1]));
        const cols = Math.max(1, Math.round(Math.sqrt(((n / 2) * r.width) / r.height)));
        const rows = Math.max(1, Math.round(n / 2 / cols));
        const gx: Array<Array<[number, number]>> = [];
        for (let j = 0; j <= rows; j++) {
          gx[j] = [];
          for (let i = 0; i <= cols; i++) {
            let px = (r.width * i) / cols;
            let py = (r.height * j) / rows;
            if (i > 0 && i < cols) px += (rg() - 0.5) * 0.6 * (r.width / cols);
            if (j > 0 && j < rows) py += (rg() - 0.5) * 0.6 * (r.height / rows);
            gx[j][i] = [px, py];
          }
        }
        const tris: Array<[[number, number], [number, number], [number, number]]> = [];
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const p00 = gx[j][i];
            const p10 = gx[j][i + 1];
            const p11 = gx[j + 1][i + 1];
            const p01 = gx[j + 1][i];
            if (rg() < 0.5) {
              tris.push([p00, p10, p11]);
              tris.push([p00, p11, p01]);
            } else {
              tris.push([p00, p10, p01]);
              tris.push([p10, p11, p01]);
            }
          }
        }
        for (const tr of tris) {
          const cx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3;
          const cy = (tr[0][1] + tr[1][1] + tr[2][1]) / 3;
          const pts = tr.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(",");
          const sp = document.createElement("div");
          sp.className = "sp";
          sp.style.cssText = `left:${(r.left - hr.left).toFixed(2)}px;top:${(r.top - hr.top).toFixed(2)}px;width:${r.width.toFixed(2)}px;height:${r.height.toFixed(2)}px;clip-path:polygon(${pts});transform-origin:${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
          const holder = document.createElement("div");
          holder.className = tg[2] ? `spi ${tg[2]}` : "spi";
          const cl = el.cloneNode(true) as HTMLElement;
          stripClone(cl);
          cl.style.margin = "0";
          if (tg[0] === ".watch") {
            const ob = el.querySelectorAll<HTMLElement>(".sig i");
            const nb = cl.querySelectorAll<HTMLElement>(".sig i");
            for (let b = 0; b < ob.length && b < nb.length; b++) nb[b].style.transform = getComputedStyle(ob[b]).transform;
          }
          holder.appendChild(cl);
          sp.appendChild(holder);
          const svg = document.createElementNS(SVG_NS, "svg");
          svg.setAttribute("class", "se");
          svg.setAttribute("viewBox", `0 0 ${r.width.toFixed(1)} ${r.height.toFixed(1)}`);
          const pg = document.createElementNS(SVG_NS, "polygon");
          pg.setAttribute("points", tr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "));
          svg.appendChild(pg);
          sp.appendChild(svg);
          lay.appendChild(sp);
          const ax = r.left - hr.left + cx;
          const ay = r.top - hr.top + cy;
          const dx = ax - ox;
          const dy = ay - oy;
          const dist = Math.hypot(dx, dy) + 1;
          const an = rg() * 6.283;
          pieces.push({
            el: sp,
            delay: Math.min(0.42, 0.34 * Math.pow(dist / maxd, 0.8) + rg() * 0.08),
            vx: (dx / dist) * (160 + rg() * 520) + (rg() - 0.5) * 140,
            vy: (dy / dist) * (120 + rg() * 380) + (rg() - 0.5) * 120,
            vz: 180 + rg() * 760,
            ax: Math.cos(an),
            ay: Math.sin(an),
            az: (rg() - 0.5) * 1.2,
            ang: (rg() - 0.5) * 260,
            on: false,
          });
        }
      }
      heroEl.appendChild(lay);
      layer = lay;
      state.active = true;
      state.stale = false;
    },
    update(hp: number): void {
      for (const p of pieces) {
        const t = clamp((hp - p.delay) / (1 - p.delay), 0, 1);
        if (t <= 0) {
          if (p.on) {
            p.el.style.transform = "";
            p.el.style.opacity = "";
            p.on = false;
          }
          continue;
        }
        const e = Math.pow(t, 1.7);
        p.on = true;
        p.el.style.transform = `translate3d(${(p.vx * e).toFixed(1)}px,${(p.vy * e + 240 * e * e).toFixed(1)}px,${(p.vz * e).toFixed(1)}px) rotate3d(${p.ax.toFixed(3)},${p.ay.toFixed(3)},${p.az.toFixed(3)},${(p.ang * e).toFixed(1)}deg)`;
        p.el.style.opacity = (1 - sstep(0.5, 1, t)).toFixed(3);
      }
    },
    destroy,
  };
}
