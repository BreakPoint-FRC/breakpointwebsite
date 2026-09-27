"use client";

import { useState } from "react";
import type { SponsorTier } from "@/content/types";
import { recommendedSuffix } from "@/content/sponsorTiers";

interface TierCardProps {
  tier: SponsorTier;
  className?: string;
}

const tierJson = (tier: SponsorTier) =>
  JSON.stringify(
    { paket: tier.name, tutar: tier.amount, logo_yeri: tier.placement, karsilik: tier.benefits },
    null,
    2,
  );

/** Düz Türkçe önce; `</> kaynak` ile aynı paket JSON olarak görünür. */
export function TierCard({ tier, className = "" }: TierCardProps) {
  const [showCode, setShowCode] = useState(false);
  const hot = tier.recommended;

  return (
    <div
      data-tier
      className={`flex flex-col gap-12 px-18 py-22 lg:min-h-420 lg:gap-20 lg:p-32 ${
        hot
          ? "bg-bp-yellow text-bp-black clip-corner-24 lg:clip-corner-40"
          : "border border-bp-line bg-bp-surface text-bp-white"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-12">
        <h3 className="m-0 font-label font-semibold uppercase fs-13 ls-3 lg:fs-14">
          {tier.name}
          {hot ? ` · ${recommendedSuffix}` : ""}
        </h3>
        <button
          type="button"
          aria-pressed={showCode}
          onClick={() => setShowCode((v) => !v)}
          className="h-36 shrink-0 cursor-pointer border border-current bg-transparent px-12 font-code fs-11 lg:fs-12"
        >
          {showCode ? "düz metin" : "</> kaynak"}
        </button>
      </div>

      {showCode ? (
        <pre className="m-0 font-code leading-[1.8] whitespace-pre-wrap fs-13 lg:fs-15">{tierJson(tier)}</pre>
      ) : (
        <div className="flex flex-col gap-12 lg:gap-16">
          <span className="font-display font-semibold leading-none fs-40 lg:fs-56">{tier.amount}</span>
          <p className="m-0 fs-15 lg:hidden">{tier.benefits.join(" · ")}</p>
          <ul className="m-0 hidden list-none flex-col gap-12 p-0 fs-17 lg:flex">
            {tier.benefits.map((b, i) => (
              <li key={i} className={`border-t pt-12 ${hot ? "border-bp-black" : "border-bp-line"}`}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Mobil: önerilmeyen paketler katlanır satır olarak. */
export function TierRow({ tier }: { tier: SponsorTier }) {
  return (
    <details className="group border border-bp-line bg-bp-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between p-18 [&::-webkit-details-marker]:hidden">
        <span className="font-label uppercase text-bp-muted fs-13 ls-3">{tier.name}</span>
        <span className="font-display font-semibold fs-26">{tier.amount}</span>
      </summary>
      <ul className="m-0 flex list-none flex-col gap-10 px-18 pt-0 pb-18 fs-15">
        {tier.benefits.map((b, i) => (
          <li key={i} className="border-t border-bp-line pt-10">
            {b}
          </li>
        ))}
      </ul>
    </details>
  );
}
