"use client";

import { useRef } from "react";
import { contact } from "@/content/contact";
import { mainNav } from "@/content/nav";
import { site } from "@/content/site";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { LinkButton } from "@/components/ui/LinkButton";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { buildGlass, coverRadius, pointsAttr, type GlassGeometry } from "@/lib/glass";
import { GlassRenderer, type GlassLayout, type GlassTextLine } from "@/lib/glassRenderer";
import { MOTION_QUERIES, PIN, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { clamp01, easeInOutCubic, easeOutCubic } from "@/lib/math";
import { sceneBus } from "@/lib/sceneBus";
import { scrollToY } from "@/lib/scroll";

const upper = (s: string) => s.toLocaleUpperCase("tr-TR");
const SPOKES = 11;
const RINGS = 4;

/** Metni verilen genişliğe sığacak font boyutu (mobil). */
function fitSize(ctx: CanvasRenderingContext2D, text: string, family: string, base: number, maxWidth: number): number {
  ctx.font = `600 ${base}px ${family}`;
  const width = ctx.measureText(text).width;
  return width > maxWidth ? Math.floor((base * maxWidth) / width) : base;
}

function computeLayout(stage: HTMLElement, family: string, desktop: boolean): GlassLayout {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, desktop ? 1.5 : 2);
  const l1 = upper(contact.glassLine1);
  const l2 = upper(contact.glassLine2);
  const l3 = upper(contact.glassLine3);
  let lines: GlassTextLine[];
  let geometry: GlassGeometry;

  if (desktop) {
    // Prototip 1440×900: darbe (740,430), metin left 112 / top 130 (132px) ve top 560 (200px).
    const u = Math.min(w / 1440, h / 900);
    const cx = 740 * u;
    const cy = 430 * u;
    lines = [
      { text: l1, x: 112 * u, top: 130 * u, size: 132 * u, lineHeight: 0.9 },
      { text: l2, x: 112 * u, top: 130 * u + 132 * 0.9 * u, size: 132 * u, lineHeight: 0.9 },
      { text: l3, x: 112 * u, top: 560 * u, size: 200 * u, lineHeight: 0.85 },
    ];
    geometry = buildGlass({
      cx,
      cy,
      radiusScale: u,
      outerRadius: Math.max(1800 * u, coverRadius(cx, cy, w, h)),
      fallScale: h / 900,
    });
  } else {
    const probe = document.createElement("canvas").getContext("2d");
    const maxW = w - 32;
    const s1 = probe ? Math.min(fitSize(probe, l1, family, 46, maxW), fitSize(probe, l2, family, 46, maxW)) : 40;
    const s3 = probe ? fitSize(probe, l3, family, 88, maxW) : 72;
    const cx = w * 0.51;
    const cy = h * 0.48;
    const rs = h / 900;
    lines = [
      { text: l1, x: 16, top: 104, size: s1, lineHeight: 0.9 },
      { text: l2, x: 16, top: 104 + s1 * 0.9, size: s1, lineHeight: 0.9 },
      { text: l3, x: 16, top: h * 0.6, size: s3, lineHeight: 0.85 },
    ];
    geometry = buildGlass({
      cx,
      cy,
      radiusScale: rs,
      outerRadius: Math.max(1800 * rs, coverRadius(cx, cy, w, h)),
      fallScale: h / 900,
    });
  }
  return { width: w, height: h, dpr, fontFamily: family, lines, geometry };
}

export function GlassFinale() {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const revealed = useRef(false);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const c = readConditions(ctx.conditions);
        if (c.reduce) {
          revealed.current = true;
          return;
        }
        const [stage] = q("[data-stage]");
        const [canvas] = q<HTMLCanvasElement>("canvas[data-glass]");
        const [cracks] = q("[data-cracks]");
        const [impact] = q<SVGCircleElement>("[data-impact]");
        const spokeEls = q<SVGPolylineElement>("[data-spoke]");
        const ringEls = q<SVGPolylineElement>("[data-ring-line]");
        const [back] = q("[data-back]");
        const words = q("[data-word]");
        const [probe] = q("[data-font-probe]");
        const watch = document.querySelector<HTMLElement>("[data-watch-panel]");
        const renderer = new GlassRenderer(canvas);
        let progress = 0;
        let alive = true;

        const layoutCracks = (g: GlassGeometry) => {
          cracks.setAttribute("viewBox", `0 0 ${stage.clientWidth} ${stage.clientHeight}`);
          spokeEls.forEach((el, i) => el.setAttribute("points", pointsAttr(g.spokes[i])));
          ringEls.forEach((el, j) => el.setAttribute("points", pointsAttr(g.rings[j])));
          impact.setAttribute("cx", g.cx.toFixed(1));
          impact.setAttribute("cy", g.cy.toFixed(1));
        };

        const rebuild = () => {
          const family = getComputedStyle(probe).fontFamily;
          const layout = computeLayout(stage, family, c.desktop);
          renderer.build(layout);
          layoutCracks(layout.geometry);
          render(progress, true);
        };

        const render = (p: number, force = false) => {
          if (!force && p === progress) return;
          progress = p;
          // (1) p 0.06 → 0.30: önce kollar, sonra halkalar çizilir.
          spokeEls.forEach((el, i) => {
            el.style.strokeDashoffset = String(1 - easeInOutCubic(clamp01((p - 0.06 - i * 0.008) / 0.2)));
          });
          ringEls.forEach((el, j) => {
            el.style.strokeDashoffset = String(1 - easeInOutCubic(clamp01((p - 0.14 - j * 0.04) / 0.16)));
          });
          impact.setAttribute("r", (4 + 6 * clamp01(p / 0.08)).toFixed(2));
          // (2) p 0.34 → 0.40: parçalar 5px açılır, çatlaklar söner. (3) p 0.40 → 1: düşüş.
          cracks.style.opacity = String(1 - clamp01((p - 0.38) / 0.06));
          renderer.draw(p);

          const rev = easeOutCubic(clamp01((p - 0.42) / 0.3));
          back.style.opacity = String(rev);
          back.style.transform = `scale(${1.06 - 0.06 * rev})`;
          revealed.current = rev > 0.8;
          back.style.pointerEvents = revealed.current ? "auto" : "none";
          const word = easeOutCubic(clamp01((p - 0.68) / 0.24));
          words.forEach((el) => {
            el.style.opacity = String(word);
            el.style.transform = `translate3d(0, ${(1 - word) * (c.desktop ? 80 : 40)}px, 0)`;
          });
          if (watch) watch.style.opacity = String(1 - rev);

          sceneBus.setVar("glass", p < 0.08 ? '"sağlam"' : p < 0.4 ? '"çatladı"' : '"kırıldı"', p < 0.08 ? "white" : "yellow");
          sceneBus.setVar("reveal", rev > 0.5 ? "hazır" : "yükleniyor", "yellow");
        };

        trigger.current = ScrollTrigger.create({
          trigger: stage,
          start: "top top",
          end: `+=${c.desktop ? PIN.glass.desktop : PIN.glass.mobile}`,
          pin: true,
          scrub: true,
          onUpdate: (self) => render(self.progress),
          onRefresh: (self) => render(self.progress, true),
        });

        rebuild();
        // Cam yazısı fontla çizilir: fontlar yüklenince yeniden kes.
        const fontsReady = async () => {
          try {
            await document.fonts.load(`600 40px ${getComputedStyle(probe).fontFamily}`, "BİRSONRAKİ");
            await document.fonts.ready;
            if (alive) rebuild();
          } catch {
            // Font yüklenemezse fallback fontla çizilmiş hâl kalır.
          }
        };
        void fontsReady();

        let resizeTimer = 0;
        const ro = new ResizeObserver(() => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(rebuild, 150);
        });
        ro.observe(stage);

        return () => {
          alive = false;
          window.clearTimeout(resizeTimer);
          ro.disconnect();
          renderer.destroy();
          if (watch) watch.style.opacity = "";
          trigger.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  /** Klavye odağı arka katmana gelirse ve cam henüz kırılmadıysa, açılmış konuma kaydır. */
  const revealOnFocus = () => {
    const st = trigger.current;
    if (!st || revealed.current) return;
    scrollToY(st.end);
  };

  return (
    <SceneFrame index={7} label="İletişim">
      <h2 className="sr-only">
        {contact.glassLine1} {contact.glassLine2} {contact.glassLine3.toLocaleLowerCase("tr-TR")}
      </h2>
      <div ref={root}>
        {/* Reduced-motion: cam kırılmaz, başlık durağan sarı panelde. */}
        <div aria-hidden="true" className="hidden bg-glass px-16 py-56 text-bp-black motion-reduce:block lg:px-112 lg:py-96">
          <p className="m-0 font-display font-semibold uppercase fs-44 leading-[0.9] lg:fs-132">
            {contact.glassLine1}
            <br />
            {contact.glassLine2}
          </p>
          <p className="m-0 mt-24 font-display font-semibold fs-80 leading-[0.85] lg:mt-40 lg:fs-200">{contact.glassLine3}</p>
        </div>

        <div
          data-stage
          className="relative h-svh overflow-hidden bg-bp-black lg:h-screen motion-reduce:h-auto motion-reduce:lg:h-auto"
        >
          <div
            data-back
            onFocusCapture={revealOnFocus}
            className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-24 px-16 pt-40 pb-96 opacity-0 [transform:scale(1.06)] lg:gap-0 lg:pt-112 lg:pr-64 lg:pb-36 lg:pl-112 motion-reduce:pointer-events-auto motion-reduce:relative motion-reduce:opacity-100 motion-reduce:[transform:none] motion-reduce:lg:min-h-900"
          >
            <div className="flex flex-col gap-20 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-24">
              <div className="flex flex-col gap-10 border border-bp-line bg-bp-surface p-20 font-code fs-14 lg:col-span-7 lg:gap-14 lg:p-32 lg:fs-19">
                <span className="hidden whitespace-pre font-label uppercase text-bp-muted fs-13 ls-3 lg:block">
                  <span className="text-bp-yellow">●</span>
                  {"  "}
                  {contact.consoleLabel}
                </span>
                <div>
                  <span className="text-bp-yellow">&gt;</span> iletisim()
                </div>
                {contact.consoleLines.map((line) => (
                  <div key={line.key} className={`whitespace-pre text-bp-muted ${line.mobile ? "" : "max-lg:hidden"}`}>
                    {"  "}
                    {line.key} →{" "}
                    <a href={line.link.href} className="text-bp-yellow hover:text-bp-white">
                      {line.link.label}
                    </a>
                  </div>
                ))}
                <div>
                  <span className="text-bp-yellow">&gt;</span>{" "}
                  <span className="inline-block h-18 w-9 animate-bp-blink bg-bp-yellow align-middle lg:h-22 lg:w-11 motion-reduce:animate-none" />
                </div>
              </div>

              <div className="flex flex-col gap-12 lg:col-span-4 lg:col-start-9 lg:gap-20">
                <div className="hidden items-center gap-16 lg:flex">
                  <span className="relative flex size-60 shrink-0 items-center justify-center overflow-hidden border border-bp-line bg-bp-surface">
                    <MediaSlot media={contact.person.photo} sizes="60px" placeholderClassName="fs-11" />
                  </span>
                  <div className="flex flex-col gap-2">
                    <strong className="font-label fs-22">{contact.person.name}</strong>
                    <span className="text-bp-muted fs-15">{contact.person.role}</span>
                  </div>
                </div>
                <LinkButton href={contact.sponsorCta.href} className="h-56 fs-16 ls-2">
                  {contact.sponsorCta.label}
                </LinkButton>
                <div className="grid grid-cols-2 gap-12">
                  <LinkButton href={contact.whatsapp.href} variant="outline" className="h-52 fs-14 ls-2">
                    {contact.whatsapp.label}
                  </LinkButton>
                  <LinkButton href={contact.joinCta.href} variant="outline" className="h-52 fs-14 ls-2">
                    {contact.joinCta.label}
                  </LinkButton>
                </div>
                <nav aria-label="Alt menü" className="hidden flex-wrap gap-x-20 gap-y-8 pt-8 font-label uppercase fs-15 ls-2 lg:flex">
                  {mainNav.map((item) => (
                    <a key={item.href} href={item.href} className="text-bp-white hover:text-bp-yellow">
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <div className="flex flex-col gap-12 lg:gap-18">
              <p
                data-word
                data-font-probe
                aria-label="BreakPoint"
                className="m-0 font-display font-semibold whitespace-nowrap opacity-0 fs-56 leading-[0.85] ls-2 lg:fs-236 motion-reduce:opacity-100"
              >
                BREAK<span className="text-bp-yellow">POINT</span>
              </p>
              <div data-word className="flex flex-col gap-4 text-bp-muted opacity-0 fs-13 lg:flex-row lg:justify-between lg:fs-14 motion-reduce:opacity-100">
                <span>
                  © {site.copyrightYear} {site.teamName} ·<span className="lg:hidden"> FRC {site.teamNumber}</span>
                  <span className="hidden lg:inline"> FIRST Robotics Competition Takım {site.teamNumber}</span>
                </span>
                <span>{contact.schoolLine}</span>
              </div>
            </div>
          </div>

          {/* Ön katman: sarı cam (canvas) + çatlak çizgileri. */}
          <canvas data-glass aria-hidden="true" className="pointer-events-none absolute inset-0 size-full motion-reduce:hidden" />
          <svg data-cracks aria-hidden="true" className="pointer-events-none absolute inset-0 size-full motion-reduce:hidden">
            {Array.from({ length: SPOKES }, (_, i) => (
              <polyline key={`s${i}`} data-spoke pathLength={1} fill="none" strokeWidth="3" strokeLinejoin="bevel" strokeDasharray="1" strokeDashoffset="1" className="stroke-bp-black" />
            ))}
            {Array.from({ length: RINGS }, (_, j) => (
              <polyline key={`r${j}`} data-ring-line pathLength={1} fill="none" strokeWidth="2" strokeLinejoin="bevel" strokeDasharray="1" strokeDashoffset="1" className="stroke-bp-black" />
            ))}
            <circle data-impact r="4" opacity="0.9" className="fill-bp-black" />
          </svg>
        </div>
      </div>
    </SceneFrame>
  );
}
