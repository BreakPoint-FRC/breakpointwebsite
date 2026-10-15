"use client";

import { useSyncExternalStore } from "react";
import { choosePreference } from "@/lib/quality/runtime";
import { getServerState, getState, subscribe } from "@/lib/quality/store";
import { PREFERENCES, TIERS, isPreference, type Preference } from "@/lib/quality/tiers";

const LABELS: Record<Preference, string> = {
  auto: "Otomatik",
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
  duz: "Düz (3B kapalı)",
};

export function QualityControl() {
  const state = useSyncExternalStore(subscribe, getState, getServerState);
  return (
    <div className="quality">
      <label htmlFor="kalite">Kalite</label>
      <select
        id="kalite"
        value={state.preference}
        onChange={(e) => {
          const v = e.target.value;
          if (isPreference(v)) void choosePreference(v);
        }}
      >
        {PREFERENCES.map((p) => (
          <option key={p} value={p}>
            {LABELS[p]}
          </option>
        ))}
      </select>
      <span className="quality-now mono">{TIERS[state.tier].label}</span>
    </div>
  );
}
