"use client";

import { useSyncExternalStore } from "react";
import { getServerState, getState, subscribe, type QualityState } from "./store";

export function useQuality(): QualityState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}
