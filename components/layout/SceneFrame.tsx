import type { ReactNode } from "react";
import { scenes } from "@/content/nav";

interface SceneFrameProps {
  index: number;
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Sahne sarmalayıcısı. `id` ve `data-scene` burada: pin'lenen iç eleman değil,
 * pin boşluğunu da içeren dış kutu. Böylece anchor ve spine hedefleri sabit kalır.
 */
export function SceneFrame({ index, label, className = "", children }: SceneFrameProps) {
  return (
    <section id={scenes[index].id} data-scene={index} aria-label={label} className={`relative ${className}`}>
      {children}
    </section>
  );
}
