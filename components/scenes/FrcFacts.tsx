"use client";

import { useRef } from "react";
import { frc } from "@/content/facts";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MOTION_QUERIES, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { setRise, windowed } from "@/lib/motion";

export function FrcFacts() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const c = readConditions(ctx.conditions);
        if (c.reduce) return;
        const q = gsap.utils.selector(root);
        const [intro] = q("[data-intro]");
        const facts = q("[data-fact]");

        const render = (p: number) => {
          setRise(intro, windowed(p, 0, 0.45), 50);
          facts.forEach((el, i) => setRise(el, windowed(p, 0.15 + i * 0.12, 0.4), 60));
        };

        // Prototip: p2 = (top − S1 + 700) / 800 → bölüm üstü ekranın 700/900'ündeyken başlar.
        ScrollTrigger.create({
          trigger: root.current,
          start: c.desktop ? "top 78%" : "top 88%",
          end: c.desktop ? "+=800" : "+=560",
          scrub: true,
          onUpdate: (self) => render(self.progress),
          onRefresh: (self) => render(self.progress),
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <SceneFrame index={1} label="FRC nedir">
      <div
        ref={root}
        className="flex flex-col gap-20 px-16 py-56 lg:grid lg:min-h-900 lg:grid-cols-12 lg:content-center lg:gap-x-24 lg:gap-y-0 lg:py-0 lg:pt-72 lg:pr-64 lg:pl-112"
      >
        <div data-intro className="flex flex-col gap-20 lg:col-span-5 lg:gap-24">
          <SectionLabel text={frc.label} />
          <h2 className="m-0 font-display font-semibold uppercase fs-44 leading-[0.95] lg:fs-76 lg:leading-[0.92]">
            {frc.title} <br className="hidden lg:block" />
            <span className="text-bp-yellow">{frc.titleAccent}</span>
          </h2>
          <p className="m-0 leading-[1.55] text-bp-muted fs-17 lg:leading-[1.6] lg:fs-20">
            <span className="lg:hidden">{frc.bodyShort}</span>
            <span className="hidden lg:inline">{frc.body}</span>
          </p>
        </div>

        <dl className="m-0 flex flex-col lg:col-span-6 lg:col-start-7">
          {frc.facts.map((fact) => (
            <div
              key={fact.value + fact.shortLabel}
              data-fact
              className="flex items-baseline gap-16 border-t border-bp-line py-16 last:border-b lg:grid lg:grid-cols-[calc(var(--spacing)*260)_minmax(0,1fr)] lg:gap-24 lg:py-28 lg:last:border-b-0"
            >
              <dt className="min-w-110 font-display font-semibold leading-none text-bp-yellow fs-44 lg:min-w-0 lg:fs-88">
                {fact.value}
              </dt>
              <dd className="m-0 fs-16 lg:leading-[1.45] lg:fs-20">
                <span className="lg:hidden">{fact.shortLabel}</span>
                <span className="hidden lg:inline">{fact.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SceneFrame>
  );
}
