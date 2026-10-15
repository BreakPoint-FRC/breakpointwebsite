/** 3B uçuş motoru bu olayı dinler; kamerayı beklemeden hedef istasyona atlatır. */
export const EVENT_GOTO = "bp:goto";

/**
 * Bölüme animasyonsuz gider. 3B uçuş açıkken kaydırma konumunu motor yönetir (kamera yumuşatması dahil),
 * bu yüzden isteği motora iletir; düz modda sayfayı doğrudan kaydırır.
 */
export function jumpTo(id: string): void {
  const root = document.documentElement;
  if (root.classList.contains("gl")) {
    document.dispatchEvent(new CustomEvent(EVENT_GOTO, { detail: { id } }));
    return;
  }
  if (id === "top") {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  } else {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "instant", block: "start" });
  }
  try {
    history.replaceState(null, "", id === "top" ? window.location.pathname + window.location.search : `#${id}`);
  } catch {
    // adres çubuğu güncellenemezse kaydırma yine de yapılmıştır
  }
}
