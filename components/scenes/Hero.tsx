"use client";

import { useRef } from "react";
import { hero, site } from "@/content/site";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { ArrowDownIcon } from "@/components/ui/Icons";
import { LinkButton } from "@/components/ui/LinkButton";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { MOTION_QUERIES, PIN, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { clamp01, easeInOutCubic } from "@/lib/math";

/** Kırılmadan sonra çatlak çizgisi ekranda kalmaz (kullanıcı düzeltmesi). */
const crackOpacity = (p: number) => (0.55 + 0.45 * clamp01(p / 0.1)) * (1 - clamp01((p - 0.14) / 0.12));

const GUTTER_COLS = "grid-cols-[calc(var(--spacing)*120)_minmax(0,1fr)]";

function CodeRow({ no, children }: { no: string; children: React.ReactNode }) {
  return (
    <div className={`grid h-46 items-center ${GUTTER_COLS}`}>
      <span className="pr-24 text-right text-bp-line fs-14">{no}</span>
      <span className="border-l border-bp-line pl-16 leading-46 text-bp-muted">{children}</span>
    </div>
  );
}

function RobotCaption({ className = "" }: { className?: string }) {
  return (
    <p className={`flex justify-center font-label font-semibold uppercase text-bp-yellow ${className}`}>
      <span>{site.robotName}</span>
      <span aria-hidden="true">●</span>
      <span>{site.robotYear} robotu</span>
    </p>
  );
}

function HeroDesktop() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        if (!readConditions(ctx.conditions).desktop) return;
        const q = gsap.utils.selector(root);
        const [stage] = q("[data-stage]");
        const [left] = q("[data-left]");
        const [right] = q("[data-right]");
        const [media] = q("[data-media]");
        const [caption] = q("[data-caption]");
        const [hint] = q("[data-hint]");
        const [crack] = q("[data-crack]");

        const render = (p: number) => {
          const e = easeInOutCubic(clamp01((p - 0.1) / 0.75));
          // Prototip: sol translate(-780px,-140px) rotate(-9deg), sağ translate(780px,160px) rotate(8deg) @1440×900.
          left.style.transform = `translate3d(${-e * 54.1667}%, ${-e * 15.5556}%, 0) rotate(${-e * 9}deg)`;
          right.style.transform = `translate3d(${e * 54.1667}%, ${e * 17.7778}%, 0) rotate(${e * 8}deg)`;
          media.style.transform = `scale(${1.35 - 0.35 * e})`;
          media.style.opacity = String(0.3 + 0.7 * e);
          caption.style.opacity = String(clamp01((p - 0.72) / 0.18));
          hint.style.opacity = String(1 - clamp01(p / 0.08));
          crack.style.opacity = String(crackOpacity(p));
        };

        ScrollTrigger.create({
          trigger: stage,
          start: "top top",
          end: `+=${PIN.hero.desktop}`,
          pin: true,
          scrub: true,
          onUpdate: (self) => render(self.progress),
          onRefresh: (self) => render(self.progress),
        });
        render(0);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="hidden lg:block">
      <div data-stage className="relative h-screen overflow-hidden bg-bp-surface">
        {/* Arka: robot medyası, kırılınca açılır. */}
        <div
          data-media
          className="absolute top-1/2 left-1/2 -mt-260 -ml-440 flex h-580 w-880 items-center [transform:scale(1.35)] justify-center bg-bp-black opacity-30 clip-media will-change-transform motion-reduce:hidden"
        >
          <MediaSlot media={hero.media} sizes="880px" placeholderClassName="fs-15 ls-3" />
        </div>
        <div data-caption className="absolute inset-x-0 bottom-40 opacity-0 motion-reduce:hidden">
          <RobotCaption className="gap-28 fs-18 ls-5" />
        </div>

        {/* Sol parça: gerçek <h1> burada. */}
        <div data-left className="absolute inset-0 origin-[0%_50%] bg-bp-black clip-hero-left will-change-transform">
          <div className="absolute inset-x-0 top-140 flex flex-col font-code fs-20">
            <CodeRow no="01">{hero.codeComment}</CodeRow>
            <CodeRow no="02">
              <span className="text-bp-yellow">{hero.codeKeyword}</span>
              <span className="text-bp-white"> {site.teamName} </span>
              {"{"}
            </CodeRow>
            <div className={`my-12 grid h-256 items-center bg-bp-yellow text-bp-black ${GUTTER_COLS}`}>
              <span className="flex items-center justify-end gap-10 pr-24 fs-14">
                <span className="size-14 rounded-full bg-bp-black" />
                03
              </span>
              <h1 className="m-0 border-l border-bp-black pl-16 font-display font-semibold whitespace-nowrap fs-232 leading-256 ls-2">
                BREAKPOINT
              </h1>
            </div>
            <CodeRow no="04">{"}"}</CodeRow>
          </div>
        </div>

        {/* Sağ parça: aynı içerik (kopya aria-hidden), alt yazı ve CTA'lar burada. */}
        <div data-right className="absolute inset-0 origin-[100%_50%] bg-bp-black clip-hero-right will-change-transform">
          <div className="absolute inset-x-0 top-140 flex flex-col font-code fs-20">
            <div className="h-46" />
            <div className="h-46" />
            <div className={`my-12 grid h-256 items-center bg-bp-yellow text-bp-black ${GUTTER_COLS}`}>
              <span />
              <div
                aria-hidden="true"
                className="border-l border-bp-black pl-16 font-display font-semibold whitespace-nowrap fs-232 leading-256 ls-2"
              >
                BREAKPOINT
              </div>
            </div>
          </div>
          <div className="absolute right-64 bottom-60 flex w-560 flex-col gap-24">
            <p className="m-0 leading-[1.4] text-bp-white fs-24">{hero.subtitle}</p>
            <div className="flex gap-14">
              <LinkButton href={hero.primaryCta.href} className="px-28 py-18 fs-16 ls-2">
                {hero.primaryCta.label}
              </LinkButton>
              <LinkButton href={hero.secondaryCta.href} variant="outline" className="px-28 py-18 fs-16 ls-2">
                {hero.secondaryCta.label}
              </LinkButton>
            </div>
          </div>
          <div
            data-hint
            aria-hidden="true"
            className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-12 font-label uppercase text-bp-muted fs-14 ls-4 motion-reduce:hidden"
          >
            {hero.scrollHint}
            <ArrowDownIcon className="size-16" />
          </div>
        </div>

        <svg
          data-crack
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full opacity-55 motion-reduce:opacity-100"
        >
          <polyline
            points="60,0 57,14 62,24 52,38 47,46 49,55 45,64 47,76 41,88 43,100"
            fill="none"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            className="stroke-bp-yellow"
          />
        </svg>
      </div>
    </div>
  );
}

function HeroMobile() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        if (!readConditions(ctx.conditions).mobile) return;
        const q = gsap.utils.selector(root);
        const [stage] = q("[data-stage]");
        const [top] = q("[data-top]");
        const [bottom] = q("[data-bottom]");
        const [media] = q("[data-media]");
        const [caption] = q("[data-caption]");
        const [crack] = q("[data-crack]");

        const render = (p: number) => {
          const e = easeInOutCubic(clamp01((p - 0.1) / 0.75));
          top.style.transform = `translate3d(${-e * 6}%, ${-e * 58}%, 0) rotate(${-e * 7}deg)`;
          bottom.style.transform = `translate3d(${e * 6}%, ${e * 92}%, 0) rotate(${e * 6}deg)`;
          media.style.transform = `scale(${1.35 - 0.35 * e})`;
          media.style.opacity = String(0.3 + 0.7 * e);
          caption.style.opacity = String(clamp01((p - 0.72) / 0.18));
          crack.style.opacity = String(crackOpacity(p));
        };

        ScrollTrigger.create({
          trigger: stage,
          start: "top top",
          end: `+=${PIN.hero.mobile}`,
          pin: true,
          scrub: true,
          onUpdate: (self) => render(self.progress),
          onRefresh: (self) => render(self.progress),
        });
        render(0);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="lg:hidden">
      <div data-stage className="relative h-svh min-h-[620px] overflow-hidden bg-bp-surface">
        <div className="absolute inset-x-16 top-[24%] bottom-[30%] motion-reduce:hidden">
          <div
            data-media
            className="relative flex size-full items-center [transform:scale(1.35)] justify-center bg-bp-black opacity-30 clip-media will-change-transform"
          >
            <MediaSlot media={hero.media} sizes="100vw" placeholderClassName="fs-12 ls-3" />
          </div>
        </div>
        <div data-caption className="absolute inset-x-0 bottom-[calc(72px+40px)] opacity-0 motion-reduce:hidden">
          <RobotCaption className="gap-16 fs-14 ls-4" />
        </div>

        {/* Üst parça: BREAK + gerçek <h1>. Fay hattı BREAK / POINT arasından geçer. */}
        <div data-top className="absolute inset-0 origin-[0%_0%] bg-bp-black clip-hero-top-m will-change-transform">
          <p className="absolute inset-x-16 top-28 font-code text-bp-muted fs-13">01 // FRC · Takım {site.teamNumber}</p>
          <div className="absolute inset-x-0 top-64 flex h-230 flex-col justify-center bg-bp-yellow pl-16 text-bp-black">
            <h1 className="m-0 font-display font-semibold fs-104 leading-[0.92]">
              BREAK
              <br />
              POINT
            </h1>
          </div>
        </div>

        {/* Alt parça: POINT (kopya aria-hidden) + alt yazı. */}
        <div data-bottom className="absolute inset-0 origin-[100%_100%] bg-bp-black clip-hero-bottom-m will-change-transform">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-64 flex h-230 flex-col justify-center bg-bp-yellow pl-16 font-display font-semibold text-bp-black fs-104 leading-[0.92]"
          >
            <span>BREAK</span>
            <span>POINT</span>
          </div>
          <p className="absolute inset-x-16 bottom-[calc(72px+28px)] m-0 leading-[1.45] fs-18">{hero.subtitle}</p>
        </div>

        <svg
          data-crack
          viewBox="0 0 100 400"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-400 w-full opacity-55 motion-reduce:opacity-100"
        >
          <polyline
            points="0,176 12,204 27,169 44,212 63,148 80,190 100,155"
            fill="none"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            className="stroke-bp-yellow"
          />
        </svg>
      </div>
    </div>
  );
}

/** Reduced-motion: robot medyası hero'nun altında normal akışta. */
function HeroReducedMedia() {
  return (
    <div className="hidden px-16 pt-40 pb-56 motion-reduce:block lg:px-64 lg:pl-112">
      <div className="relative mx-auto flex h-300 max-w-880 items-center justify-center bg-bp-surface clip-media lg:h-580">
        <MediaSlot media={hero.media} sizes="880px" placeholderClassName="fs-12 ls-3 lg:fs-15" />
      </div>
      <RobotCaption className="mt-24 gap-16 fs-14 ls-4 lg:gap-28 lg:fs-18 lg:ls-5" />
    </div>
  );
}

export function Hero() {
  return (
    <SceneFrame index={0} label="Giriş">
      <HeroDesktop />
      <HeroMobile />
      <HeroReducedMedia />
    </SceneFrame>
  );
}
