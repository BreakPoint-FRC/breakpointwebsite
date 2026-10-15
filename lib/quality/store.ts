import type { Preference, TierId } from "./tiers";

export interface QualityState {
  tier: TierId;
  preference: Preference;
  /** Tespit bitti: 3B ve cam açılış kalite kararını bu bayrak gelmeden uygulamaz. */
  ready: boolean;
}

const INITIAL: QualityState = { tier: "T0", preference: "auto", ready: false };

let state: QualityState = INITIAL;
const listeners = new Set<() => void>();

export function getState(): QualityState {
  return state;
}

export function getServerState(): QualityState {
  return INITIAL;
}

export function setState(next: QualityState): void {
  if (next.tier === state.tier && next.preference === state.preference && next.ready === state.ready) return;
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
