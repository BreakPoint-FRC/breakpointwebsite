/** Kullanıcıya gösterilen tek seferlik kalite bildirimi (ör. "3B kapatıldı"). */
export type QualityNotice = { kind: "threeD-off" } | null;

let current: QualityNotice = null;
const listeners = new Set<() => void>();

export function getNotice(): QualityNotice {
  return current;
}

export function getServerNotice(): QualityNotice {
  return null;
}

export function setNotice(next: QualityNotice): void {
  current = next;
  listeners.forEach((l) => l());
}

export function subscribeNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
