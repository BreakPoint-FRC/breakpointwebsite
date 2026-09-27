"use client";

import type { Tone } from "@/content/types";

/**
 * Sahneler arası küçük olay kanalı. React state yok: dinleyiciler DOM'a doğrudan yazar.
 * - aktif sahne indeksi (spine, izleme paneli, mobil bar)
 * - izleme panelindeki canlı değişkenler (`bind` anahtarıyla)
 */

type SceneListener = (index: number) => void;
type VarListener = (bind: string, value: string, tone: Tone) => void;

let currentScene = 0;
const sceneListeners = new Set<SceneListener>();
const varListeners = new Set<VarListener>();
const vars = new Map<string, { value: string; tone: Tone }>();

export const sceneBus = {
  get scene(): number {
    return currentScene;
  },
  setScene(index: number): void {
    if (index === currentScene) return;
    currentScene = index;
    sceneListeners.forEach((fn) => fn(index));
  },
  onScene(fn: SceneListener): () => void {
    sceneListeners.add(fn);
    return () => {
      sceneListeners.delete(fn);
    };
  },
  setVar(bind: string, value: string, tone: Tone): void {
    const prev = vars.get(bind);
    if (prev && prev.value === value && prev.tone === tone) return;
    vars.set(bind, { value, tone });
    varListeners.forEach((fn) => fn(bind, value, tone));
  },
  getVar(bind: string): { value: string; tone: Tone } | undefined {
    return vars.get(bind);
  },
  onVar(fn: VarListener): () => void {
    varListeners.add(fn);
    return () => {
      varListeners.delete(fn);
    };
  },
};
