/** 3B uçuş etkin mi (html.gl)? Bileşenler (Robot, Header) uçuşta kaydırmayla sürüldüğü için davranış değiştirir. */
let gl = false;
const listeners = new Set<() => void>();

export function getGl(): boolean {
  return gl;
}

export function getServerGl(): boolean {
  return false;
}

export function setGl(next: boolean): void {
  if (gl === next) return;
  gl = next;
  listeners.forEach((l) => l());
}

export function subscribeGl(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
