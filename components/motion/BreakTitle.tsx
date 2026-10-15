"use client";

import { useEffect, useRef } from "react";

interface Props {
  id: string;
  text: string;
}

const INDEX_CLASSES = [
  "[--i:0]", "[--i:1]", "[--i:2]", "[--i:3]", "[--i:4]", "[--i:5]", "[--i:6]", "[--i:7]", "[--i:8]", "[--i:9]",
  "[--i:10]", "[--i:11]", "[--i:12]", "[--i:13]", "[--i:14]", "[--i:15]", "[--i:16]", "[--i:17]", "[--i:18]", "[--i:19]",
  "[--i:20]", "[--i:21]", "[--i:22]", "[--i:23]", "[--i:24]", "[--i:25]", "[--i:26]", "[--i:27]", "[--i:28]", "[--i:29]",
] as const;

/** Başlık harfleri hero'daki gibi iki kırık yarı olarak birleşir; görününce bir kez tetiklenir. */
export function BreakTitle({ id, text }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // 3B uçuşta tetiği motor verir (levha göründüğünde).
          if (e.isIntersecting && !document.documentElement.classList.contains("gl")) {
            e.target.classList.add("go");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let idx = 0;
  return (
    <h2 ref={ref} id={id} className="brk" aria-label={text}>
      {text.split(" ").map((word, wi) => (
        <span key={wi}>
          {wi > 0 ? " " : null}
          <span className="w" aria-hidden="true">
            {Array.from(word).map((c) => {
              const i = idx++;
              return (
                <span key={i} className={`ch ${INDEX_CLASSES[Math.min(i, INDEX_CLASSES.length - 1)]}`} data-c={c}>
                  {c}
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </h2>
  );
}
