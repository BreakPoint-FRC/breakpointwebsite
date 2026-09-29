"use client";

import { useRef } from "react";
import { team } from "@/content/team";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { LinkButton } from "@/components/ui/LinkButton";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MOTION_QUERIES, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { setRise, windowed } from "@/lib/motion";

export function Team() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const c = readConditions(ctx.conditions);
        if (c.reduce) return;
        const members = gsap.utils.selector(root)("[data-member]");
        const cols = c.desktop ? 5 : 2;

        const render = (p: number) => {
          members.forEach((el, i) => {
            const delay = 0.1 + (i % cols) * 0.06 + Math.floor(i / cols) * (c.desktop ? 0.12 : 0.08);
            setRise(el, windowed(p, delay, 0.35), 70);
          });
        };

        ScrollTrigger.create({
          trigger: root.current,
          start: c.desktop ? "top 78%" : "top 85%",
          end: c.desktop ? "+=900" : "+=900",
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
    <SceneFrame index={3} label="Takım">
      <div
        ref={root}
        className="flex flex-col gap-20 px-16 py-56 lg:min-h-1100 lg:justify-center lg:gap-48 lg:py-0 lg:pt-72 lg:pr-64 lg:pl-112"
      >
        <div className="flex flex-col gap-20 lg:flex-row lg:items-end lg:justify-between lg:gap-48">
          <div className="flex flex-col gap-20 lg:gap-16">
            <SectionLabel text={team.label} />
            <h2 data-fit-leading className="m-0 font-display font-semibold uppercase fs-44 leading-display lg:fs-80">
              <span className="lg:hidden">
                {team.titleMobile} <span className="text-bp-yellow">{team.titleAccentMobile}</span>
              </span>
              <span className="hidden lg:inline">
                {team.title}
                <br />
                <span className="text-bp-yellow">{team.titleAccent}</span>
              </span>
            </h2>
          </div>
          <LinkButton href={team.joinCta.href} variant="outline-yellow" className="hidden px-28 py-18 fs-16 ls-2 lg:inline-flex">
            {team.joinCta.label}
          </LinkButton>
        </div>

        <ul className="m-0 grid list-none grid-cols-2 gap-12 p-0 lg:grid-cols-5 lg:gap-20">
          {team.members.map((m) => (
            <li key={m.role} data-member className="flex flex-col gap-6 lg:gap-10">
              <div className="relative flex h-180 items-center justify-center bg-bp-surface lg:h-240 lg:border lg:border-bp-line">
                <MediaSlot media={m.photo} sizes="(min-width: 1024px) 20vw, 50vw" placeholderClassName="fs-11 ls-2 lg:fs-12 lg:ls-3" />
              </div>
              <span className="font-code fs-12 lg:fs-13">
                <span className="text-bp-muted">{m.role}:</span> <span className="text-bp-white">&quot;{m.name}&quot;</span>
              </span>
            </li>
          ))}
        </ul>

        <LinkButton href={team.joinCta.href} variant="outline-yellow" className="h-52 fs-15 ls-2 lg:hidden">
          {team.joinCta.label}
        </LinkButton>
      </div>
    </SceneFrame>
  );
}
