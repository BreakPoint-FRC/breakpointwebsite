import { describe, expect, it } from "vitest";
import { parseKaliteParam, resolveTier } from "./resolve";

describe("parseKaliteParam", () => {
  it("geçerli değerleri okur", () => {
    expect(parseKaliteParam("?kalite=duz")).toBe("duz");
    expect(parseKaliteParam("?kalite=yuksek")).toBe("yuksek");
    expect(parseKaliteParam("?a=1&kalite=orta&b=2")).toBe("orta");
    expect(parseKaliteParam("?kalite=auto")).toBe("auto");
  });
  it("bozuk, boş, büyük harfli ve kademe adı olanları yok sayar", () => {
    for (const s of ["", "?", "?kalite=", "?kalite=YUKSEK", "?kalite=T3", "?kalite=bozuk", "?kalite[]=duz", "?kalite=duz%00"]) {
      expect(parseKaliteParam(s)).toBeNull();
    }
  });
  it("parametre yoksa null döner", () => {
    expect(parseKaliteParam("?baska=duz")).toBeNull();
  });
  it("birden fazla kalite parametresinde ilkini alır", () => {
    expect(parseKaliteParam("?kalite=duz&kalite=yuksek")).toBe("duz");
  });
});

describe("resolveTier", () => {
  it("auto ise algılananı kullanır", () => {
    expect(resolveTier("auto", "T2")).toBe("T2");
    expect(resolveTier("auto", "T0")).toBe("T0");
  });
  it("açık tercih algılamayı geçersiz kılar", () => {
    expect(resolveTier("yuksek", "T0")).toBe("T3");
    expect(resolveTier("orta", "T3")).toBe("T2");
    expect(resolveTier("dusuk", "T3")).toBe("T1");
    expect(resolveTier("duz", "T3")).toBe("T0");
  });
});
