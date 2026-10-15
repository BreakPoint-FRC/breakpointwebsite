import { HeroRems } from "@/components/sections/HeroRems";
import { WatchLive } from "@/components/sections/WatchLive";
import { LinkButton } from "@/components/ui/LinkButton";
import { hero, site } from "@/content/site";

const LETTERS = Array.from("BREAKPOINT");
const LETTER_INDEX = ["[--i:0]", "[--i:1]", "[--i:2]", "[--i:3]", "[--i:4]", "[--i:5]", "[--i:6]", "[--i:7]", "[--i:8]", "[--i:9]"] as const;
const BARS = Array.from({ length: 16 }, (_, i) => i);

export function Hero() {
  return (
    <section className="slab ovl s-hero" id="top" aria-labelledby="h-title">
      <div className="scar" id="scar" aria-hidden="true"></div>
      <HeroRems />
      <div className="hero wrap">
        <h1 className="title" id="h-title" aria-label={site.teamName}>
          {LETTERS.map((c, i) => (
            <span key={i} className={`ch ${LETTER_INDEX[i]}`} aria-hidden="true" data-c={c}>
              {c}
            </span>
          ))}
        </h1>
        <p className="dbg mono">
          <span className="dot" aria-hidden="true"></span>
          <span className="ln">{site.teamNumber}</span>
          <span className="cm">{hero.commentLine}</span>
        </p>
        <div className="hero-row">
          <div className="hero-copy">
            <p className="lead">{hero.lead}</p>
            <LinkButton href={hero.ctaHref}>{hero.ctaLabel}</LinkButton>
          </div>
          <aside className="watch mono" aria-label={hero.watch.ariaLabel}>
            <div className="watch-in">
              <div className="w-head">
                <span className="w-dot" aria-hidden="true"></span>
                {hero.watch.title}
              </div>
              <dl>
                <div>
                  <dt>{hero.watch.teamLabel}</dt>
                  <dd>{site.teamNumber}</dd>
                </div>
                <div>
                  <dt>{hero.watch.schoolLabel}</dt>
                  <dd>{site.school}</dd>
                </div>
                <WatchLive />
              </dl>
              <div className="sig" aria-hidden="true">
                {BARS.map((b) => (
                  <i key={b}></i>
                ))}
              </div>
              <div className="sig-l">
                <span>{hero.watch.signalLabel}</span>
                <span>{hero.watch.sensorName}</span>
              </div>
            </div>
          </aside>
        </div>
        <p className="cue mono">
          <i aria-hidden="true"></i>
          {hero.scrollCue}
        </p>
      </div>
    </section>
  );
}
