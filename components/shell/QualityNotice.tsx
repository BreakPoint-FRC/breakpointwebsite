"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getNotice, getServerNotice, setNotice, subscribeNotice } from "@/lib/quality/notice";

const AUTO_HIDE_MS = 12000;

/** Governor 3B'yi kapatınca küçük bir bildirim: nedenini ve geri açma yolunu söyler. */
export function QualityNotice() {
  const notice = useSyncExternalStore(subscribeNotice, getNotice, getServerNotice);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [notice]);

  if (!notice) return null;
  return (
    <div className="qnote mono" role="status">
      <span>3B kapatıldı, kalite ayarından geri açabilirsiniz.</span>
      <button type="button" onClick={() => setNotice(null)} aria-label="Bildirimi kapat">
        ×
      </button>
    </div>
  );
}
