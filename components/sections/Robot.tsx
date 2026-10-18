"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RobotDrawing } from "./RobotDrawing";
import { robot } from "@/content/robotParts";
import { getGl, getServerGl, subscribeGl } from "@/lib/flight/glState";

const INDICES = [0, 1, 2, 3] as const;

export function Robot() {
  const [active, setActive] = useState<number>(0);
  // Düz modda otomatik gezinti: bölüm görünürken parçalar sırayla seçilir; kullanıcı seçince durur.
  const [picked, setPicked] = useState(false);
  const [visible, setVisible] = useState(false);
  const gl = useSyncExternalStore(subscribeGl, getGl, getServerGl);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setVisible(e.isIntersecting);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 3B uçuşta aktif parçayı kaydırma konumu belirler (motor "bp:part" yayar).
  useEffect(() => {
    const onPart = (e: Event): void => {
      const d = (e as CustomEvent<{ index: number }>).detail;
      if (d && typeof d.index === "number") setActive(d.index);
    };
    document.addEventListener("bp:part", onPart);
    return () => document.removeEventListener("bp:part", onPart);
  }, []);

  const choose = (i: number): void => {
    if (gl) {
      document.dispatchEvent(new CustomEvent("bp:gotopart", { detail: { index: i } }));
      return;
    }
    setActive(i);
    setPicked(true);
  };
  const auto = visible && !picked && !gl;

  return (
    <section className="slab ovl s-robot" id="robot" aria-labelledby="h-robot">
      <div className="rail" id="rail">
        <div className="stick" id="stick">
          <div className="wrap rwrap" ref={wrapRef}>
            <figure className="ph" aria-label={robot.photoLabel}>
              <div className="ph-in">
                {robot.photo.src !== null ? (
                  // next/image burada `unoptimized` + `fill` idi: optimizasyon yapmıyordu, yalnız ~6 KB gzip istemci kodu ekliyordu.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={robot.photo.src}
                    alt={robot.photo.alt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <span className="tick tl"></span>
                <span className="tick tr"></span>
                <span className="tick bl"></span>
                {robot.photo.src === null ? (
                  <>
                    {INDICES.map((n) => (
                      <RobotDrawing key={n} index={n} on={active === n} dimensionLabel={robot.dimensionLabel} />
                    ))}
                    <span className="tag mono">{robot.photoTag}</span>
                  </>
                ) : null}
              </div>
            </figure>
            <div className="robot-copy">
              <div className="rin">
                <h2 id="h-robot">{robot.title}</h2>
                <p className="intro">{robot.intro}</p>
                <ul className="parts" role="list">
                  {robot.parts.map((part, i) => {
                    const on = active === i;
                    return (
                      <li key={part.id}>
                        <button
                          type="button"
                          className={on ? (auto ? "part is-on auto" : "part is-on") : "part"}
                          aria-pressed={on}
                          onClick={() => choose(i)}
                          onFocus={() => {
                            if (!gl) choose(i);
                          }}
                          onPointerEnter={(e) => {
                            if (e.pointerType === "mouse" && !gl) choose(i);
                          }}
                        >
                          <span className="mk" aria-hidden="true"></span>
                          <span className="pn">{part.name}</span>
                          <span className="pd">{part.description}</span>
                          <span
                            className="bar"
                            aria-hidden="true"
                            onAnimationEnd={() => {
                              if (auto && on) setActive((active + 1) % robot.parts.length);
                            }}
                          ></span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="pdesc" id="pdesc" aria-live="polite">
                  {robot.parts[active]?.description}
                </p>
              </div>
            </div>
          </div>
          <div className="hud mono" id="hud" aria-hidden="true">
            <span>
              {robot.hud.phaseLabel}: <b id="hud-ph">{robot.hud.phaseIdle}</b>
            </span>
            <span>
              <b id="hud-n">0</b> / <b id="hud-t">0</b> {robot.hud.countLabel}
            </span>
            <div className="hb">
              <i id="hud-bar"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
