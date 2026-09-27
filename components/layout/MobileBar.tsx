"use client";

import { useRef } from "react";
import { contact } from "@/content/contact";
import { headerCta } from "@/content/nav";
import { mobileBarStats, watchSets } from "@/content/watch";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { useGSAP } from "@/lib/gsap";
import { sceneBus } from "@/lib/sceneBus";

const stepText = (i: number) => `adım ${String(i + 1).padStart(2, "0")} / ${String(watchSets.length).padStart(2, "0")}`;

/** Mobil alt bar: izleme panelinin küçük hâli + WhatsApp + Sponsor Ol. */
export function MobileBar() {
  const step = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = step.current;
    if (!el) return;
    const off = sceneBus.onScene((i) => {
      el.textContent = stepText(i);
    });
    return off;
  });

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex h-72 items-center gap-10 border-t border-bp-line bg-bp-black px-12 lg:hidden">
      <div className="flex min-w-0 grow flex-col gap-2 font-code fs-11 [&>span]:truncate">
        <span className="text-bp-muted">
          <span className="text-bp-yellow">●</span> <span ref={step}>{stepText(0)}</span>
        </span>
        <span>
          sponsor: <span className="text-bp-yellow">{mobileBarStats.sponsor}</span> · bütçe:{" "}
          <span className="text-bp-yellow">{mobileBarStats.budget}</span>
        </span>
      </div>
      <a
        href={contact.whatsapp.href}
        aria-label="WhatsApp ile yaz"
        className="flex size-48 shrink-0 items-center justify-center border border-bp-line text-bp-white"
      >
        <WhatsAppIcon className="size-20" />
      </a>
      <a
        href={headerCta.href}
        className="flex h-48 shrink-0 items-center bg-bp-yellow px-14 font-label font-semibold whitespace-nowrap uppercase text-bp-black fs-15 ls-1"
      >
        {headerCta.label}
      </a>
    </div>
  );
}
