import { beforeEach, describe, expect, it } from "vitest";
import { getServerState, getState, setState, subscribe } from "./store";

beforeEach(() => {
  setState({ tier: "T0", preference: "auto", ready: false });
});

describe("store", () => {
  it("başlangıç durumu T0 / auto", () => {
    expect(getState()).toEqual({ tier: "T0", preference: "auto", ready: false });
    expect(getServerState()).toEqual({ tier: "T0", preference: "auto", ready: false });
  });
  it("sunucu anlık görüntüsü her çağrıda aynı nesnedir", () => {
    expect(getServerState()).toBe(getServerState());
  });
  it("setState sonrası sunucu anlık görüntüsü değişmez", () => {
    const before = getServerState();
    setState({ tier: "T3", preference: "yuksek", ready: true });
    expect(getServerState()).toEqual({ tier: "T0", preference: "auto", ready: false });
    expect(getServerState()).toBe(before);
  });
  it("setState dinleyicileri tek kez bilgilendirir", () => {
    let n = 0;
    const off = subscribe(() => {
      n += 1;
    });
    setState({ tier: "T2", preference: "orta", ready: true });
    expect(n).toBe(1);
    expect(getState()).toEqual({ tier: "T2", preference: "orta", ready: true });
    off();
  });
  it("aynı değerle setState bildirmez ve nesneyi korur", () => {
    setState({ tier: "T1", preference: "dusuk", ready: true });
    const before = getState();
    let n = 0;
    const off = subscribe(() => {
      n += 1;
    });
    setState({ tier: "T1", preference: "dusuk", ready: true });
    expect(n).toBe(0);
    expect(getState()).toBe(before);
    off();
  });
  it("ready değişimi de dinleyicileri bilgilendirir", () => {
    let n = 0;
    const off = subscribe(() => {
      n += 1;
    });
    setState({ tier: "T0", preference: "auto", ready: true });
    expect(n).toBe(1);
    expect(getState().ready).toBe(true);
    off();
  });
  it("abonelikten çıkınca bildirim gelmez", () => {
    let n = 0;
    const off = subscribe(() => {
      n += 1;
    });
    off();
    setState({ tier: "T3", preference: "yuksek", ready: true });
    expect(n).toBe(0);
  });
});
