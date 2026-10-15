import { ReplayButton } from "@/components/sections/ReplayButton";
import { QualityControl } from "@/components/shell/QualityControl";
import { LinkButton } from "@/components/ui/LinkButton";
import { features, site } from "@/content/site";

export function Final() {
  return (
    <section className="slab ovl s-final" id="final" aria-labelledby="h-final">
      <h2 className="sr-only" id="h-final">
        <span lang="en">{site.teamName}</span>
      </h2>
      <p className="giant" aria-hidden="true">
        BREAKPOINT
      </p>
      <footer className="wrap foot">
        <div className="meta mono">
          <span>
            {site.teamName} #{site.teamNumber}
          </span>
          <span>{site.school}</span>
          <span>{site.city}</span>
          <span>{site.season}</span>
        </div>
        <div className="foot-act">
          {features.qualitySelector ? <QualityControl /> : null}
          <LinkButton href="#sponsorluk" variant="ghost">
            Sponsor ol
          </LinkButton>
          <ReplayButton />
        </div>
      </footer>
    </section>
  );
}
