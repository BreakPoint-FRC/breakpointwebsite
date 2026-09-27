"use client";

import { useRef } from "react";
import type { Tone } from "@/content/types";
import { watchSets } from "@/content/watch";
import { useGSAP } from "@/lib/gsap";
import { sceneBus } from "@/lib/sceneBus";

const TONE_CLASS: Record<Tone, string> = {
  white: "text-bp-white",
  yellow: "text-bp-yellow",
  muted: "text-bp-muted",
};

const stepLabel = (i: number) => `adım ${String(i + 1).padStart(2, "0")} / ${String(watchSets.length).padStart(2, "0")}`;

/** Debugger tarzı izleme paneli (masaüstü, sol alt). Değerler DOM'a doğrudan yazılır. */
export function WatchPanel() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const panel = root.current;
      if (!panel) return;
      const step = panel.querySelector<HTMLElement>("[data-step]");
      const keys = Array.from(panel.querySelectorAll<HTMLElement>("[data-k]"));
      const vals = Array.from(panel.querySelectorAll<HTMLElement>("[data-v]"));

      const paintValue = (el: HTMLElement, value: string, tone: Tone) => {
        el.textContent = value;
        el.className = `truncate whitespace-nowrap ${TONE_CLASS[tone]}`;
      };

      const render = (scene: number) => {
        if (step) step.textContent = stepLabel(scene);
        watchSets[scene].forEach((row, r) => {
          const live = row.bind ? sceneBus.getVar(row.bind) : undefined;
          keys[r].textContent = row.key;
          vals[r].dataset.bind = row.bind ?? "";
          paintValue(vals[r], live?.value ?? row.value, live?.tone ?? row.tone);
        });
      };

      render(sceneBus.scene);
      const offScene = sceneBus.onScene(render);
      const offVar = sceneBus.onVar((bind, value, tone) => {
        vals.forEach((el) => {
          if (el.dataset.bind === bind) paintValue(el, value, tone);
        });
      });
      return () => {
        offScene();
        offVar();
      };
    },
    { scope: root },
  );

  const first = watchSets[0];
  return (
    <aside
      ref={root}
      data-watch-panel
      aria-label="İzleme paneli"
      className="fixed bottom-16 left-80 z-20 hidden w-280 border border-bp-line bg-bp-black font-code fs-12 lg:block"
    >
      <div className="flex justify-between border-b border-bp-line px-14 py-8 text-bp-muted">
        <span>
          <span className="text-bp-yellow">●</span> izleme
        </span>
        <span data-step>{stepLabel(0)}</span>
      </div>
      <dl className="flex flex-col px-14 pt-6 pb-10">
        {first.map((row, r) => (
          <div key={r} className="flex justify-between gap-12 py-3">
            <dt data-k className="text-bp-muted">
              {row.key}
            </dt>
            <dd data-v className={`truncate whitespace-nowrap ${TONE_CLASS[row.tone]}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
