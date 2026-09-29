"use client";

import { useRef } from "react";
import { manifesto } from "@/content/manifesto";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { MOTION_QUERIES, PIN, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { clamp01 } from "@/lib/math";

const words = manifesto.segments.flatMap((seg) =>
  seg.text.split(" ").map((text) => ({ text, highlight: Boolean(seg.highlight) })),
);

export function Manifesto() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const c = readConditions(ctx.conditions);
        if (c.reduce) return;
        const q = gsap.utils.selector(root);
        const spans = q("[data-word]");
        const n = spans.length;

        // Prototip: o = 0.14 + 0.86 · clamp(p·(n+2) − i − 0.5)
        const render = (p: number) => {
          spans.forEach((el, i) => {
            el.style.opacity = String(0.14 + 0.86 * clamp01(p * (n + 2) - i - 0.5));
          });
        };

        ScrollTrigger.create(
          c.desktop
            ? {
                trigger: q("[data-stage]")[0],
                start: "top top",
                end: `+=${PIN.manifesto.desktop}`,
                pin: true,
                scrub: true,
                onUpdate: (self) => render(self.progress),
                onRefresh: (self) => render(self.progress),
              }
            : {
                // Mobilde pin yok: kelimeler bölüm ekrandan geçerken yanar.
                trigger: root.current,
                start: "top 75%",
                end: "bottom 50%",
                scrub: true,
                onUpdate: (self) => render(self.progress),
                onRefresh: (self) => render(self.progress),
              },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <SceneFrame index={4} label="Manifesto">
      <div ref={root}>
        <div
          data-stage
          className="flex flex-col justify-center gap-20 px-16 py-56 lg:h-screen lg:gap-36 lg:px-160 lg:py-0 lg:pt-72 motion-reduce:lg:h-auto motion-reduce:lg:py-160"
        >
          <span className="whitespace-pre font-code text-bp-muted fs-13 lg:fs-15">
            <span className="text-bp-yellow">●</span> {manifesto.label}
          </span>
          <p data-fit-leading className="m-0 flex flex-wrap gap-x-12 gap-y-4 font-label font-semibold uppercase fs-48 leading-display lg:gap-x-28 lg:fs-116">
            {words.map((w, i) => (
              <span
                key={i}
                data-word
                className={`opacity-[0.14] motion-reduce:opacity-100 ${w.highlight ? "text-bp-yellow" : "text-bp-white"}`}
              >
                {w.text}
              </span>
            ))}
          </p>
        </div>
      </div>
    </SceneFrame>
  );
}
