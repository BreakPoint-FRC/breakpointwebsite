import { BreakTitle } from "@/components/motion/BreakTitle";
import { CardGlow } from "@/components/motion/CardGlow";
import { ShatterCard } from "@/components/motion/ShatterCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { sponsor } from "@/content/sponsorTiers";

const CRACKS = [
  "M100 14 L84 24 L89 34 L66 46 L71 54 L47 68 L52 75 L30 100",
  "M0 22 L14 30 L10 41 L33 49 L28 58 L54 66 L50 76 L78 84 L100 80",
  "M62 0 L58 14 L72 22 L64 36 L82 44 L76 58 L100 66",
  "M0 40 L16 46 L12 57 L36 64 L30 74 L58 80 L54 90 L80 100",
  "M100 30 L82 38 L88 50 L62 58 L68 68 L40 76 L46 88 L22 100",
] as const;
const DELAYS = ["[--d:0s]", "[--d:0.1s]", "[--d:0.2s]", "[--d:0.3s]", "[--d:0.4s]"] as const;

export function Sponsor() {
  return (
    <section className="slab pane s-spon" id="sponsorluk" data-k="2" aria-labelledby="h-spon">
      <div className="slab-in">
        <div className="sec-head">
          <BreakTitle id="h-spon" text={sponsor.title} />
          <p>{sponsor.intro}</p>
        </div>
        <CardGlow targetId="packs" />
        <ul className="packs" id="packs">
          {sponsor.tiers.map((tier, i) => (
            <ShatterCard
              key={tier.id}
              className={`${tier.featured ? "card feat" : "card"} reveal ${DELAYS[i] ?? DELAYS[0]}`}
              targetId={sponsor.ctaHref.slice(1)}
            >
              <div className="card-in">
                <svg className="crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path pathLength="100" d={CRACKS[i % CRACKS.length]} />
                </svg>
                {tier.featured ? <span className="chip">{sponsor.featuredChip}</span> : null}
                <h3>{tier.name}</h3>
                <p className="price">{tier.price}</p>
                <ul className="perks">
                  {tier.perks.map((perk, j) => (
                    <li key={j}>{perk}</li>
                  ))}
                </ul>
                <LinkButton href={sponsor.ctaHref} variant={tier.featured ? "dark" : "ghost"}>
                  {sponsor.ctaLabel}
                </LinkButton>
              </div>
            </ShatterCard>
          ))}
        </ul>
      </div>
    </section>
  );
}
