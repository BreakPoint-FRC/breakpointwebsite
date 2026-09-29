"use client";

import { useRef } from "react";
import { budget } from "@/content/budget";
import { contact } from "@/content/contact";
import { packages } from "@/content/sponsorTiers";
import { SceneFrame } from "@/components/layout/SceneFrame";
import { BudgetBar, SWATCH } from "@/components/ui/BudgetBar";
import { DownloadIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { LinkButton } from "@/components/ui/LinkButton";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TierCard, TierRow } from "@/components/ui/TierCard";
import { MOTION_QUERIES, ScrollTrigger, gsap, readConditions, useGSAP } from "@/lib/gsap";
import { setRise, windowed } from "@/lib/motion";

const hotTier = packages.tiers.find((t) => t.recommended) ?? packages.tiers[0];
const otherTiers = packages.tiers.filter((t) => t !== hotTier);

export function Packages() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        if (!readConditions(ctx.conditions).desktop) return;
        const cards = gsap.utils.selector(root)("[data-desktop-tiers] [data-tier]");
        const render = (p: number) => {
          cards.forEach((el, i) => setRise(el, windowed(p, 0.1 + i * 0.12, 0.45), 100));
        };
        ScrollTrigger.create({
          trigger: root.current,
          start: "top 78%",
          end: "+=900",
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
    <SceneFrame index={6} label="Paketler">
      <div ref={root} className="flex flex-col gap-14 px-16 py-56 lg:gap-48 lg:pt-128 lg:pr-64 lg:pb-160 lg:pl-112">
        <div className="flex flex-col gap-14 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-24">
          <div className="flex flex-col gap-16 lg:col-span-7">
            <SectionLabel text={packages.labelMobile} className="lg:hidden" />
            <SectionLabel text={packages.label} className="hidden lg:inline" />
            <h2 data-fit-leading className="sr-only m-0 font-display font-semibold uppercase lg:not-sr-only lg:fs-84 lg:leading-display">
              {packages.title}
              <br />
              <span className="text-bp-yellow">{packages.titleAccent}</span>
            </h2>
          </div>
          <div className="flex flex-col gap-10 lg:col-span-4 lg:col-start-9">
            <BudgetBar items={budget.items} isExample={budget.isExample} className="h-28 lg:h-44" />
            <p className="m-0 text-bp-muted fs-14 lg:hidden">
              {budget.items.map((i) => i.shortLabel).join(" · ")} — {budget.items[0].amount}
              {budget.isExample ? ` ${budget.exampleNoteMobile}` : ""}
            </p>
            <ul className="m-0 hidden list-none grid-cols-2 gap-x-16 gap-y-6 p-0 fs-15 lg:grid">
              {budget.items.map((item) => (
                <li key={item.label}>
                  <span aria-hidden="true" className={SWATCH[item.tone]}>
                    ■
                  </span>{" "}
                  {item.label} {item.amount}
                </li>
              ))}
            </ul>
            {budget.isExample ? (
              <span className="hidden font-code text-bp-muted fs-12 lg:block">{budget.exampleNote}</span>
            ) : null}
          </div>
        </div>

        {/* Masaüstü: 3 kart yan yana, ortadaki sarı. */}
        <div data-desktop-tiers className="hidden grid-cols-3 gap-24 lg:grid">
          {packages.tiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        {/* Mobil: önerilen paket açık kart, diğerleri katlanır satır. */}
        <div className="flex flex-col gap-14 lg:hidden">
          <TierCard tier={hotTier} />
          {otherTiers.map((tier) => (
            <TierRow key={tier.id} tier={tier} />
          ))}
        </div>

        <div className="flex flex-col gap-14 lg:flex-row lg:items-center lg:justify-between lg:gap-32 lg:border lg:border-bp-line lg:bg-bp-surface lg:px-32 lg:py-28">
          <div className="flex items-center gap-14 border border-bp-line p-16 lg:gap-20 lg:border-0 lg:p-0">
            <span className="relative flex size-52 shrink-0 items-center justify-center overflow-hidden bg-bp-surface lg:size-64 lg:border lg:border-bp-line lg:bg-bp-black">
              <MediaSlot media={contact.person.photo} sizes="64px" placeholderClassName="fs-10 lg:fs-11 lg:ls-2" />
            </span>
            <div className="flex flex-col gap-2 lg:gap-4">
              <strong className="font-label fs-18 lg:fs-22 lg:ls-1">{contact.person.name}</strong>
              <span className="text-bp-muted fs-14 lg:fs-16">
                {contact.person.role}
                <span className="hidden lg:inline"> · {contact.person.phone}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-12 lg:flex-row">
            <LinkButton href={contact.whatsapp.href} className="hidden gap-10 px-22 py-16 fs-15 ls-2 lg:inline-flex">
              <WhatsAppIcon className="size-18" />
              {contact.whatsapp.label}
            </LinkButton>
            <LinkButton href={contact.sponsorPdf.href} variant="outline" className="h-52 gap-10 fs-15 ls-2 lg:h-auto lg:px-22 lg:py-16">
              <DownloadIcon className="size-18" />
              {contact.sponsorPdf.label}
              <span className="lg:hidden"> (PDF)</span>
            </LinkButton>
          </div>
        </div>
      </div>
    </SceneFrame>
  );
}
