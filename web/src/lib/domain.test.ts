import { describe, expect, it } from "vitest";
import { competenciaDaRota, rotuloDaCompetencia } from "./domain";

describe("competenciaDaRota", () => {
  it("lê ano e mês do segmento AAAA-MM", () => {
    expect(competenciaDaRota("2026-09")).toEqual({ ano: 2026, mes: 9 });
  });

  it("aceita mês de um dígito com zero à esquerda", () => {
    expect(competenciaDaRota("2027-01")).toEqual({ ano: 2027, mes: 1 });
  });

  it("recusa formato inválido", () => {
    expect(() => competenciaDaRota("setembro")).toThrow();
    expect(() => competenciaDaRota("2026-13")).toThrow();
    expect(() => competenciaDaRota("2026-00")).toThrow();
  });
});

describe("rotuloDaCompetencia", () => {
  it("devolve o segmento de rota a partir da competência", () => {
    expect(rotuloDaCompetencia({ ano: 2026, mes: 9 })).toBe("2026-09");
    expect(rotuloDaCompetencia({ ano: 2026, mes: 12 })).toBe("2026-12");
  });
});
