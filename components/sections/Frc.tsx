import { frc } from "@/content/frc";

const K = ["[--k:0]", "[--k:1]", "[--k:2]"] as const;
const STEP_R = ["[--r:2]", "[--r:3]", "[--r:4]"] as const;

const BOTS = [
  "[--x:10%] [--y:14%] [--c:var(--yellow)] [--d:3.2s] [--mx:300%] [--my:120%] [--mr:20deg]",
  "[--x:14%] [--y:44%] [--c:var(--yellow)] [--d:4.1s] [--mx:260%] [--my:-80%] [--mr:-30deg] [--dl:-1s]",
  "[--x:9%] [--y:72%] [--c:var(--yellow)] [--d:3.7s] [--mx:340%] [--my:-120%] [--mr:15deg] [--dl:-2s]",
  "[--x:80%] [--y:14%] [--c:#FFFFFF] [--d:3.9s] [--mx:-300%] [--my:140%] [--mr:-20deg] [--dl:-0.5s]",
  "[--x:84%] [--y:46%] [--c:#FFFFFF] [--d:3.4s] [--mx:-260%] [--my:-100%] [--mr:30deg] [--dl:-1.7s]",
  "[--x:80%] [--y:72%] [--c:#FFFFFF] [--d:4.4s] [--mx:-320%] [--my:-90%] [--mr:-15deg] [--dl:-2.6s]",
] as const;

export function Frc() {
  return (
    <section className="slab pane s-frc" id="frc" data-k="0" aria-labelledby="h-frc">
      <div className="slab-in">
        <h2 id="h-frc" className="rv [--r:0]">
          {frc.title}
        </h2>
        <div className="frc">
          <div>
            <p className="lead rv [--r:1]">{frc.lead}</p>
            <div className="steps">
              {frc.steps.map((step, i) => (
                <div key={step.title} className={`rv ${STEP_R[i]} ${K[i]}`}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="field rv [--r:3]" role="img" aria-label={frc.fieldLabel}>
            <div className="half a"></div>
            <div className="half b"></div>
            <div className="hub"></div>
            {BOTS.map((cls) => (
              <i key={cls} className={`bot ${cls}`}></i>
            ))}
            <span className="lb left-[10px]">{frc.allianceA}</span>
            <span className="lb right-[10px]">{frc.allianceB}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
