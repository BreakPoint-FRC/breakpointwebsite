"use client";

import { useRef } from "react";
import { robot } from "@/content/robotParts";
import { site } from "@/content/site";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MOTION_QUERIES, PIN, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { sceneBus } from "@/lib/sceneBus";

const ZOOM = 1.8;

/** Prototip: p < 0.08 genel görünüm, sonra k = floor((p − 0.08) / 0.23). */
const partIndexAt = (p: number, count: number) => (p < 0.08 ? -1 : Math.min(count - 1, Math.floor((p - 0.08) / 0.23)));

export function RobotParts() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const parts = robot.parts;
      const q = gsap.utils.selector(root);
      const dots = q("[data-dot]");
      // Noktaların konumu içerikten gelir (yüzde); inline style yerine GSAP ile yazılır.
      dots.forEach((el, i) => gsap.set(el, { left: `${parts[i].x}%`, top: `${parts[i].y}%` }));

      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const c = readConditions(ctx.conditions);
        if (c.reduce) return;
        const [stage] = q("[data-stage]");
        const [cam] = q("[data-cam]");
        const [idx] = q("[data-idx]");
        const [no] = q("[data-no]");
        const [name] = q("[data-name]");
        const [desc] = q("[data-desc]");
        const bars = q("[data-bar]");

        let current = -2;
        const apply = (k: number) => {
          if (k === current) return;
          current = k;
          const part = k >= 0 ? parts[k] : null;
          // scale(1.8) + transform-origin = parça ⇔ translate(−0.8·x%, −0.8·y%) scale(1.8), origin 0 0.
          cam.style.transform = part
            ? `translate3d(${-(ZOOM - 1) * part.x}%, ${-(ZOOM - 1) * part.y}%, 0) scale(${ZOOM})`
            : "translate3d(0, 0, 0) scale(1)";
          idx.textContent = `robot.parca[${k >= 0 ? k : "null"}]`;
          no.textContent = part ? part.no : "00";
          name.textContent = part ? part.name : site.robotName;
          desc.textContent = part ? part.description : robot.overviewText;
          bars.forEach((b, i) => {
            b.dataset.on = String(i <= k);
          });
          dots.forEach((d, i) => {
            d.dataset.active = String(i === k);
          });
          sceneBus.setVar("part", part ? `"${part.name}"` : "null", "white");
          sceneBus.setVar("partIndex", part ? String(k) : "-", "yellow");
          sceneBus.setVar("camera", part ? `zoom ${ZOOM}x` : "genel", "white");
        };

        ScrollTrigger.create({
          trigger: stage,
          start: "top top",
          end: `+=${c.desktop ? PIN.robot.desktop : PIN.robot.mobile}`,
          pin: true,
          scrub: true,
          onUpdate: (self) => apply(partIndexAt(self.progress, parts.length)),
          onRefresh: (self) => apply(partIndexAt(self.progress, parts.length)),
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <SceneFrame index={2} label="Robot">
      <h2 className="sr-only">Robot, parça parça</h2>
      <div ref={root}>
        <div
          data-stage
          className="relative flex h-svh flex-col justify-center gap-16 overflow-hidden bg-bp-surface px-16 py-40 lg:grid lg:h-screen lg:grid-cols-12 lg:gap-x-24 lg:gap-y-0 lg:bg-transparent lg:pt-112 lg:pr-40 lg:pb-40 lg:pl-112 motion-reduce:h-auto motion-reduce:py-56 motion-reduce:lg:h-auto motion-reduce:lg:min-h-900"
        >
          <SectionLabel text={robot.label} className="lg:hidden" />

          <div className="relative h-300 shrink-0 overflow-hidden border border-bp-line bg-bp-black lg:col-span-7 lg:h-auto lg:bg-bp-surface motion-reduce:lg:min-h-700">
            <div
              data-cam
              className="absolute inset-0 origin-top-left transition-transform duration-1000 ease-[cubic-bezier(.65,0,.35,1)] will-change-transform"
            >
              <div className="absolute inset-0 hidden items-center justify-center lg:flex">
                <MediaSlot media={robot.photo} sizes="60vw" imageClassName="object-contain" placeholderClassName="fs-14 ls-3" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center lg:hidden">
                <MediaSlot media={robot.photoMobile} sizes="100vw" imageClassName="object-contain" placeholderClassName="fs-12 ls-3" />
              </div>
              {robot.parts.map((part) => (
                <span key={part.no} data-dot data-active="false" className="group absolute -mt-9 -ml-9 size-18 lg:-mt-10 lg:-ml-10 lg:size-20">
                  <span className="absolute inset-0 rounded-full bg-bp-yellow opacity-0 group-data-[active=true]:animate-bp-pulse motion-reduce:animate-none" />
                  <span className="absolute inset-0 box-border rounded-full border-2 border-bp-yellow bg-bp-black group-data-[active=true]:bg-bp-yellow" />
                </span>
              ))}
            </div>
            <span data-idx className="absolute top-10 left-12 font-code text-bp-muted fs-11 lg:top-16 lg:left-20 lg:fs-13">
              robot.parca[null]
            </span>
          </div>

          {/* Kaydırmaya bağlı tek parça görünümü (ekran okuyucudan gizli; liste aşağıda). */}
          <div aria-hidden="true" className="flex flex-col gap-16 lg:col-span-4 lg:col-start-9 lg:justify-center lg:gap-28 motion-reduce:hidden">
            <SectionLabel text={robot.label} className="hidden lg:block" />
            <div className="flex items-baseline gap-16 lg:flex-col lg:items-start lg:gap-28">
              <span data-no className="font-display font-semibold leading-[0.9] text-outline-yellow-thin fs-72 lg:leading-[0.85] lg:text-outline-yellow lg:fs-200">
                00
              </span>
              <span data-name className="font-label font-semibold uppercase leading-none fs-32 lg:fs-52">
                {site.robotName}
              </span>
            </div>
            <p data-desc className="m-0 leading-[1.5] text-bp-muted fs-16 lg:-mt-18 lg:fs-19">
              {robot.overviewText}
            </p>
            <div className="grid grid-cols-4 gap-6 lg:gap-8">
              {robot.parts.map((part) => (
                <span key={part.no} data-bar data-on="false" className="h-4 bg-bp-line data-[on=true]:bg-bp-yellow" />
              ))}
            </div>
          </div>

          {/* Reduced-motion'da görünen, ekran okuyucuya her zaman açık tam liste. */}
          <ol className="sr-only m-0 list-none flex-col gap-24 p-0 motion-reduce:not-sr-only motion-reduce:flex lg:col-span-4 lg:col-start-9 lg:justify-center">
            {robot.parts.map((part) => (
              <li key={part.no} className="flex flex-col gap-6">
                <span className="flex items-baseline gap-12">
                  <span className="font-display font-semibold leading-none text-outline-yellow-thin fs-40 lg:fs-64">{part.no}</span>
                  <span className="font-label font-semibold uppercase fs-24 lg:fs-32">{part.name}</span>
                </span>
                <span className="text-bp-muted fs-15 lg:fs-17">{part.description}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </SceneFrame>
  );
}
