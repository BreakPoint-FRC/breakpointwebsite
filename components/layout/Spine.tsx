"use client";

import { useRef } from "react";
import { scenes } from "@/content/nav";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { sceneBus } from "@/lib/sceneBus";
import { docTop, scrollToY } from "@/lib/scroll";

// Prototip spine koordinatları (64×828 kutu). Sınıflar statik yazıldı ki Tailwind görsün.
const SPINE_POINTS = "30,30 36,120 26,210 34,300 28,390 37,480 27,570 33,660 29,760";
const DOT_POSITION = [
  "left-30 top-30",
  "left-36 top-120",
  "left-26 top-210",
  "left-34 top-300",
  "left-28 top-390",
  "left-37 top-480",
  "left-27 top-570",
  "left-33 top-660",
];
/** Manifesto noktası sahnenin içine (+500) atlar, kelimeler yanmış görünsün. */
const JUMP_OFFSET = [0, 0, 0, 0, 500, 0, 0, 0];

/** Sol fay hattı omurgası: ilerleme çubuğu + 8 tıklanabilir breakpoint noktası (≥44px). */
export function Spine() {
  const root = useRef<HTMLElement>(null);
  const fill = useRef<SVGPolylineElement>(null);

  useGSAP(
    () => {
      const line = fill.current;
      const nav = root.current;
      if (!line || !nav) return;

      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          line.style.strokeDashoffset = String(1 - self.progress);
        },
      });

      const dots = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-dot]"));
      const paint = (active: number) => {
        dots.forEach((dot, i) => {
          dot.dataset.state = i < active ? "done" : i === active ? "active" : "todo";
          if (i === active) dot.setAttribute("aria-current", "step");
          else dot.removeAttribute("aria-current");
        });
      };
      paint(sceneBus.scene);
      const off = sceneBus.onScene(paint);

      return () => {
        off();
        st.kill();
      };
    },
    { scope: root },
  );

  const jump = (index: number) => {
    const target = document.getElementById(scenes[index].id);
    if (!target) return;
    scrollToY(docTop(target) + JUMP_OFFSET[index]);
    gsap.delayedCall(0.1, () => ScrollTrigger.update());
  };

  return (
    <nav
      ref={root}
      aria-label="Sahneler"
      className="pointer-events-none fixed top-72 bottom-0 left-0 z-20 hidden w-64 lg:block"
    >
      <svg viewBox="0 0 64 828" aria-hidden="true" className="absolute top-0 left-0 h-828 w-64">
        <polyline points={SPINE_POINTS} fill="none" strokeWidth="2" className="stroke-bp-line" />
        <polyline
          ref={fill}
          points={SPINE_POINTS}
          pathLength={1}
          fill="none"
          strokeWidth="2"
          className="stroke-bp-yellow"
          strokeDasharray="1"
          strokeDashoffset="1"
        />
      </svg>
      {scenes.map((scene, i) => (
        <button
          key={scene.id}
          type="button"
          data-dot
          data-state={i === 0 ? "active" : "todo"}
          aria-label={scene.label}
          title={scene.label}
          onClick={() => jump(i)}
          className={`group pointer-events-auto absolute -mt-22 -ml-22 flex size-44 cursor-pointer items-center justify-center ${DOT_POSITION[i]}`}
        >
          <span className="box-border block size-10 rounded-full border-2 border-bp-muted bg-bp-black transition-[width,height,background-color,border-color] duration-200 group-hover:border-bp-yellow group-data-[state=active]:size-16 group-data-[state=active]:border-bp-yellow group-data-[state=done]:border-bp-yellow group-data-[state=done]:bg-bp-yellow" />
        </button>
      ))}
    </nav>
  );
}
