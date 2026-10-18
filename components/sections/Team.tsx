import { features, site } from "@/content/site";
import { team } from "@/content/team";

const K = ["[--k:0]", "[--k:1]", "[--k:2]", "[--k:3]"] as const;
const CARD_R = ["[--r:2]", "[--r:3]", "[--r:4]", "[--r:5]"] as const;

export function Team() {
  return (
    <section className="slab pane s-team" id="takim" data-k="1" aria-labelledby="h-takim">
      <div className="slab-in">
        <div className="team-h">
          <h2 id="h-takim" className="rv [--r:0]">
            {team.title}
          </h2>
          <p className="lead rv [--r:1]">{team.lead}</p>
        </div>
        {features.teamCards ? (
          <div className="cards">
            {team.cards.map((card, i) => (
              <div key={i} className={`idc rv ${K[i]} ${CARD_R[i]}`}>
                <div className="idc-in">
                  <div className="slot"></div>
                  <div className="strip">
                    <span lang="en">{site.teamName}</span> {site.teamNumber}
                  </div>
                  <div className="photo">
                    {card.photo.src !== null ? (
                      // next/image burada `unoptimized` + `fill` idi: optimizasyon yapmıyordu, yalnız ~6 KB gzip istemci kodu ekliyordu.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.photo.src}
                        alt={card.photo.alt}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <svg viewBox="0 0 100 100" aria-hidden="true">
                          <circle cx="50" cy="38" r="18" />
                          <path d="M14 100c0-22 16-34 36-34s36 12 36 34z" />
                        </svg>
                        <em>{team.photoLabel}</em>
                      </>
                    )}
                  </div>
                  <div className="nm">{card.name}</div>
                  <div className="rl">{card.role}</div>
                  <div className="bc" aria-hidden="true"></div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
