"use client";

import { useEffect, useRef, useState } from "react";
import { orbit, packages } from "@/content/sponsorTiers";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MOTION_QUERIES, PIN, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { clamp01, easeInOutCubic, easeOutCubic } from "@/lib/math";
import { sceneBus } from "@/lib/sceneBus";
import { scrollToY } from "@/lib/scroll";

/** Yörünge kutusu 720×720 koordinatlarında (prototip). */
const BOX = 720;
const CENTER = 360;
const RADIUS = 290;
const TURN_MS = 48000;

// Logo iniş noktaları: tampon, yan panel, kol, üst. + SİZ tamponun ortasında.
const TARGETS_DESKTOP: ReadonlyArray<readonly [number, number]> = [
  [200, 560],
  [520, 560],
  [240, 445],
  [480, 445],
  [465, 235],
  [465, 118],
];
const TARGETS_MOBILE: ReadonlyArray<readonly [number, number]> = [
  [240, 445],
  [480, 445],
  [465, 235],
  [465, 118],
];
const YOU_TARGET: readonly [number, number] = [360, 560];
const MOBILE_SPONSORS = 4;

/** Prototip `landOf`: p 0.4 → 0.75 arası easeInOutCubic. */
const landAt = (p: number) => easeInOutCubic(clamp01((p - 0.4) / 0.35));

const legend = [...packages.tiers].sort((a, b) => Number(b.recommended) - Number(a.recommended));

const brandOf = (value: string) => value.trim().toLocaleUpperCase("tr-TR");

function Legend({ className = "" }: { className?: string }) {
  return (
    <dl className={`m-0 grid grid-cols-[auto_1fr] gap-x-16 gap-y-4 font-code text-bp-muted lg:gap-y-6 ${className}`}>
      {legend.map((tier) => (
        <div key={tier.id} className="contents">
          <dt className="text-bp-yellow">{tier.placementLabel}</dt>
          <dd className="m-0">→ {tier.name}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OrbitLanding() {
  const root = useRef<HTMLDivElement>(null);
  const [company, setCompany] = useState("");
  const land = useRef(0);
  const paused = useRef(false);
  const trigger = useRef<ScrollTrigger | null>(null);
  const brand = brandOf(company);

  useEffect(() => {
    sceneBus.setVar("brand", brand ? `"${brand}"` : "undefined", brand ? "yellow" : "muted");
  }, [brand]);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const [box] = q("[data-box]");
      const [ticks] = q("[data-ticks]");
      const [ring] = q("[data-ring]");
      const [robotSvg] = q("[data-robot]");
      const orbitTexts = q("[data-orbit-text]");
      const landTexts = q("[data-land-text]");
      const allLogos = q("[data-logo]");
      const you = q("[data-you]")[0];

      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const c = readConditions(ctx.conditions);
        const mobile = !window.matchMedia("(min-width: 1024px)").matches;
        const targets = mobile ? TARGETS_MOBILE : TARGETS_DESKTOP;
        const logos = [...allLogos.slice(0, targets.length), you];
        const n = logos.length;
        let angle = 0;
        let k = box.offsetWidth / BOX;

        const place = () => {
          const l = land.current;
          logos.forEach((el, i) => {
            const a = ((angle + (i * 360) / n - 90) * Math.PI) / 180;
            const ox = CENTER + RADIUS * Math.cos(a);
            const oy = CENTER + RADIUS * Math.sin(a);
            const t = el === you ? YOU_TARGET : targets[i];
            const x = (ox + (t[0] - ox) * l) * k;
            const y = (oy + (t[1] - oy) * l) * k;
            const s = el === you ? 1 + l * 0.2 : 1 - l * 0.25;
            el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
          });
          ticks.style.transform = `rotate(${-angle * 0.4}deg)`;
        };

        const setLandVisuals = (l: number) => {
          robotSvg.style.opacity = String(l);
          const orbitO = 1 - clamp01((l - 0.2) / 0.3);
          const landO = clamp01((l - 0.5) / 0.3);
          orbitTexts.forEach((el) => {
            el.style.opacity = String(orbitO);
          });
          landTexts.forEach((el) => {
            el.style.opacity = String(landO);
            el.style.pointerEvents = l > 0.6 ? "auto" : "none";
          });
          sceneBus.setVar("place", l > 0.5 ? '"tampon"' : '"yörünge"', "white");
        };

        const ro = new ResizeObserver(() => {
          k = box.offsetWidth / BOX;
          place();
        });
        ro.observe(box);

        if (c.reduce) {
          // Yörünge durağan: logolar robota inmiş, son hâl.
          land.current = 1;
          setLandVisuals(1);
          place();
          return () => ro.disconnect();
        }

        const render = (p: number) => {
          const l = landAt(p);
          land.current = l;
          ring.style.opacity = String(clamp01(p / 0.18) * (1 - l));
          ring.style.transform = `scale(${0.7 + 0.3 * easeOutCubic(clamp01(p / 0.25))})`;
          setLandVisuals(l);
        };

        trigger.current = ScrollTrigger.create({
          trigger: q("[data-stage]")[0],
          start: "top top",
          end: `+=${c.desktop ? PIN.orbit.desktop : PIN.orbit.mobile}`,
          pin: true,
          scrub: true,
          onUpdate: (self) => render(self.progress),
          onRefresh: (self) => render(self.progress),
        });

        // Sahne ekranda değilken transform yazmayı atla (açı yine ilerler).
        const visibility = ScrollTrigger.create({ trigger: root.current, start: "top bottom", end: "bottom top" });

        // Dönüş kaydırmadan bağımsız: gsap.ticker + closure'daki açı, React state yok.
        const tick = (_time: number, deltaTime: number) => {
          if (!paused.current) angle += (Math.min(deltaTime, 100) * 360) / TURN_MS;
          if (visibility.isActive) place();
        };
        gsap.ticker.add(tick);
        place();

        return () => {
          // useGSAP/matchMedia tween'leri geri alır ama ticker callback'lerini kaldırmaz.
          gsap.ticker.remove(tick);
          visibility.kill();
          ro.disconnect();
          trigger.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  /** Klavyeyle input'a gelinirse ve logolar henüz inmediyse, iniş konumuna kaydır. */
  const revealInput = () => {
    const st = trigger.current;
    if (!st || land.current >= 0.6) return;
    scrollToY(st.start + (st.end - st.start) * 0.8);
  };

  const input = (id: string, className: string) => (
    <input
      id={id}
      type="text"
      maxLength={14}
      autoComplete="organization"
      value={company}
      onChange={(e) => setCompany(e.target.value.slice(0, 14))}
      onFocus={revealInput}
      placeholder={orbit.inputPlaceholder.toLocaleUpperCase("tr-TR")}
      className={`border border-bp-line bg-bp-black font-label uppercase text-bp-white placeholder:text-bp-muted ls-2 ${className}`}
    />
  );

  return (
    <SceneFrame index={5} label="Sponsor yörüngesi" className="bg-bp-surface">
      <div ref={root}>
        <div
          data-stage
          className="relative flex h-svh flex-col justify-center gap-16 overflow-hidden px-16 pt-24 pb-88 lg:grid lg:h-screen lg:grid-cols-12 lg:items-center lg:gap-x-24 lg:gap-y-0 lg:pt-72 lg:pr-40 lg:pb-0 lg:pl-112 motion-reduce:h-auto motion-reduce:py-56 motion-reduce:lg:h-auto motion-reduce:lg:py-96"
        >
          {/* Masaüstü sol kolon: iki metin üst üste, inişle yer değiştirir. */}
          <div className="relative hidden h-520 lg:col-span-5 lg:block">
            <div data-orbit-text className="absolute inset-0 flex flex-col justify-center gap-28 motion-reduce:hidden">
              <SectionLabel text={orbit.label} />
              <h2 className="m-0 font-display font-semibold uppercase fs-92 leading-[0.9]">
                {orbit.title}
                <br />
                <span className="text-bp-yellow">{orbit.titleAccent}</span>
                <br />
                {orbit.titleEnd}
              </h2>
            </div>
            <div
              data-land-text
              className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-24 opacity-0 motion-reduce:pointer-events-auto motion-reduce:opacity-100"
            >
              <SectionLabel text={orbit.landLabel} />
              <h2 className="m-0 font-display font-semibold uppercase fs-92 leading-[0.9]">
                {orbit.landTitle} <span className="text-bp-yellow">{orbit.landTitleAccent}</span>
              </h2>
              <label htmlFor="bp-company" className="text-bp-muted fs-17">
                {orbit.inputLabel}
              </label>
              {input("bp-company", "h-56 px-18 fs-20")}
              <Legend className="fs-14" />
            </div>
          </div>

          {/* Mobil başlık: iki metin aynı hücrede üst üste. */}
          <div className="grid lg:hidden">
            <div data-orbit-text className="flex flex-col gap-12 [grid-area:1/1] motion-reduce:hidden">
              <SectionLabel text={orbit.label} />
              <h2 className="m-0 font-display font-semibold uppercase fs-40 leading-[0.9]">
                {orbit.title} <span className="text-bp-yellow">{orbit.titleAccent}</span> {orbit.titleEnd}
              </h2>
            </div>
            <div data-land-text className="pointer-events-none flex flex-col gap-12 opacity-0 [grid-area:1/1] motion-reduce:pointer-events-auto motion-reduce:opacity-100">
              <SectionLabel text={orbit.landLabel} />
              <h2 className="m-0 font-display font-semibold uppercase fs-52 leading-[0.9]">
                {orbit.landTitle} <span className="text-bp-yellow">{orbit.landTitleAccent}</span>
              </h2>
            </div>
          </div>

          {/* Yörünge → robot. */}
          <div
            className="relative flex shrink-0 items-center justify-center lg:col-span-6 lg:col-start-7 lg:block lg:h-760"
            // Yalnız fare hover'ı duraklatır; dokunmatikte mouseleave gelmediği için yörünge takılı kalırdı.
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") paused.current = true;
            }}
            onPointerLeave={() => {
              paused.current = false;
            }}
          >
            <div
              data-box
              className="relative size-[min(358px,42svh)] lg:absolute lg:top-1/2 lg:right-0 lg:-mt-360 lg:size-720"
            >
              <div data-ring className="absolute inset-0 opacity-0 [transform:scale(0.7)] motion-reduce:hidden">
                <svg data-ticks viewBox="0 0 720 720" aria-hidden="true" className="absolute inset-0 size-full">
                  <circle cx="360" cy="360" r="352" fill="none" strokeWidth="8" strokeDasharray="1.5 14" opacity="0.7" className="stroke-bp-yellow" />
                  <circle cx="360" cy="360" r="290" fill="none" strokeWidth="1" strokeDasharray="6 8" opacity="0.5" className="stroke-bp-muted" />
                </svg>
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2 -mt-44 -ml-44 flex size-88 items-center justify-center bg-bp-yellow font-display font-semibold text-bp-black clip-bp fs-42 lg:-mt-88 lg:-ml-88 lg:size-176 lg:fs-84"
                >
                  BP
                </span>
              </div>

              <svg
                data-robot
                viewBox="0 0 720 720"
                role="img"
                aria-label="Robot üzerinde logo yerleri: tampon, yan panel, kol"
                className="absolute inset-0 size-full opacity-0 motion-reduce:opacity-100"
              >
                <g className="fill-bp-black">
                  <rect x="120" y="360" width="480" height="170" strokeWidth="2" className="stroke-bp-white" />
                  <rect x="430" y="110" width="70" height="250" strokeWidth="2" className="stroke-bp-white" />
                  <rect x="370" y="90" width="190" height="56" strokeWidth="2" className="stroke-bp-white" />
                  <rect x="96" y="520" width="528" height="80" strokeWidth="3" className="stroke-bp-yellow" />
                  <circle cx="190" cy="628" r="26" strokeWidth="2" className="stroke-bp-white" />
                  <circle cx="530" cy="628" r="26" strokeWidth="2" className="stroke-bp-white" />
                </g>
                <g className="fill-bp-muted font-code" fontSize="12">
                  <text x="104" y="512">tampon</text>
                  <text x="128" y="354">yan panel</text>
                  <text x="508" y="104">kol</text>
                </g>
              </svg>

              {orbit.sponsors.map((sponsor, i) => (
                <div
                  key={i}
                  data-logo
                  aria-hidden="true"
                  className={`absolute top-0 left-0 -mt-22 -ml-48 flex h-44 w-96 items-center justify-center overflow-hidden border border-bp-line bg-bp-black font-label font-semibold whitespace-nowrap text-bp-muted fs-11 ls-2 will-change-transform lg:-mt-32 lg:-ml-68 lg:h-64 lg:w-136 lg:fs-14 ${
                    i >= MOBILE_SPONSORS ? "max-lg:hidden" : ""
                  }`}
                >
                  {sponsor.logo ? (
                    <MediaSlot media={sponsor.logo} sizes="136px" imageClassName="object-contain p-8" />
                  ) : (
                    sponsor.name
                  )}
                </div>
              ))}
              <div
                data-you
                aria-hidden="true"
                className="absolute top-0 left-0 -mt-22 -ml-48 flex h-44 w-96 items-center justify-center overflow-hidden border border-bp-yellow bg-bp-yellow font-label font-semibold whitespace-nowrap text-bp-black fs-11 ls-2 will-change-transform lg:-mt-32 lg:-ml-68 lg:h-64 lg:w-136 lg:fs-14"
              >
                {brand || orbit.youSlot}
              </div>
            </div>
          </div>

          {/* Mobil: input + lejant, inişle belirir. */}
          <div data-land-text className="pointer-events-none flex flex-col gap-8 opacity-0 lg:hidden motion-reduce:pointer-events-auto motion-reduce:opacity-100">
            <label htmlFor="bp-company-m" className="text-bp-muted fs-15">
              {orbit.inputLabelMobile}
            </label>
            {input("bp-company-m", "h-52 px-14 fs-16")}
            <Legend className="fs-13" />
          </div>
        </div>
      </div>
    </SceneFrame>
  );
}
