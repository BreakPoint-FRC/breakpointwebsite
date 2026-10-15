"use client";

import { EVENT_REPLAY } from "@/lib/glass/opening";

export function ReplayButton() {
  return (
    <button
      className="btn ghost replay"
      type="button"
      onClick={() => document.dispatchEvent(new Event(EVENT_REPLAY))}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-[18px] flex-none">
        <path
          d="M12 12 L4 5 M12 12 L21 7 M12 12 L20 19 M12 12 L9 21 M12 12 L3 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Tekrar kır
    </button>
  );
}
