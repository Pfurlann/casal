import { describe, expect, it } from "vitest";
import type { Meta, Transacao } from "./domain";
import {
  economiaDoMes,
  folgaDoPeriodo,
  fraseEconomia,
  fraseTeto,
  gastoDaCategoria,
  progressoTeto,
  tetoDaCategoria,
  validarMeta,
} from "./metas";

const C = { ano: 2026, mes: 9 };

const TETO: Meta = {
  id: "m1",
  carteiraID: "w1",
  tipo: "teto_categoria",
  nome: "Mercado",
  valorAlvo: 50_000,
  categoriaID: "cat-mercado",
  periodo: "mensal",
  ativa: true,
};

function tx(parcial: Partial<Transacao> = {}): Transacao {
  return {
    id: "t1",
    carteiraID: "w1",
    tipo: "despesa",
    valor: 10_000,
    data: "2026-09-10T15:00:00.000Z",
    categoriaID: "cat-mercado",
    descricao: "feira",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

describe("gastoDaCategoria", () => {
  it("soma só despesa da categoria no mês", () => {
    const lista = [
      tx({ id: "a", valor: 12_000 }),
      tx({ id: "b", valor: 8_000 }),
      tx({ id: "c", valor: 5_000, categoriaID: "outra" }),
      tx({ id: "d", valor: 9_000, tipo: "receita" }),
      tx({ id: "e", valor: 7_000, tipo: "transferencia" }),
      tx({ id: "f", valor: 3_000, data: "2026-08-10T15:00:00.000Z" }),
    ];
    expect(gastoDaCategoria(lista, "cat-mercado", C)).toBe(20_000);
  });
});

describe("economiaDoMes", () => {
  it("é receita menos despesa e ignora transferência", () => {
    const lista = [
      tx({ id: "r", tipo: "receita", valor: 100_000 }),
      tx({ id: "d", tipo: "despesa", valor: 40_000 }),
      tx({ id: "x", tipo: "transferencia", valor: 10_000 }),
    ];
    expect(economiaDoMes(lista, C)).toBe(60_000);
  });
});

describe("progressoTeto / fraseTeto", () => {
  it("alerta em 80% e estoura ao passar", () => {
    expect(progressoTeto(50_000, 10_000).faixa).toBe("folga");
    expect(progressoTeto(50_000, 40_000).faixa).toBe("alerta");
    expect(progressoTeto(50_000, 50_000).faixa).toBe("estouro");
    expect(progressoTeto(50_000, 60_000).faixa).toBe("estouro");
  });

  it("diz o que sobra ou o quanto estourou, sem exclamação", () => {
    expect(fraseTeto(progressoTeto(50_000, 16_000), "Mercado")).toBe(
      "Sobram R$ 340,00 no teto de Mercado.",
    );
    expect(fraseTeto(progressoTeto(50_000, 50_000), "Mercado")).toBe("Chegou no teto de Mercado.");
    expect(fraseTeto(progressoTeto(50_000, 62_000), "Mercado")).toBe(
      "Estourou o teto de Mercado em R$ 120,00.",
    );
  });
});

describe("fraseEconomia", () => {
  it("mede o hábito contra o alvo", () => {
    expect(fraseEconomia(80_000, 100_000)).toBe("Faltam R$ 200,00 para a economia do mês.");
    expect(fraseEconomia(100_000, 100_000)).toBe("A economia do mês bateu a meta.");
  });
});

describe("folgaDoPeriodo", () => {
  it("fica indefinida sem meta — a marca respira largo", () => {
    expect(folgaDoPeriodo([], [tx()])).toBeUndefined();
  });

  it("é a sobra dos tetos sobre o previsto", () => {
    const gasto = [tx({ valor: 20_000 })];
    expect(folgaDoPeriodo([TETO], gasto, C)).toBeCloseTo(0.6);
    expect(folgaDoPeriodo([TETO], [tx({ valor: 50_000 })], C)).toBe(0);
    expect(folgaDoPeriodo([TETO], [tx({ valor: 60_000 })], C)).toBeCloseTo(-0.2);
  });

  it("sem teto, usa a economia do mês", () => {
    const eco: Meta = { ...TETO, id: "e1", tipo: "economia_mensal", categoriaID: undefined, valorAlvo: 100_000 };
    expect(
      folgaDoPeriodo([eco], [tx({ tipo: "receita", valor: 40_000 })], C),
    ).toBeCloseTo(0.4);
  });
});

describe("tetoDaCategoria", () => {
  it("acha o teto ativo da categoria", () => {
    expect(tetoDaCategoria([TETO], "cat-mercado")?.id).toBe("m1");
    expect(tetoDaCategoria([{ ...TETO, ativa: false }], "cat-mercado")).toBeUndefined();
  });
});

describe("validarMeta", () => {
  it("exige valor, categoria no teto e não duplica", () => {
    expect(validarMeta({ tipo: "teto_categoria", nome: "", valorAlvo: 0, outras: [] })).toMatch(/valor/);
    expect(validarMeta({ tipo: "teto_categoria", nome: "", valorAlvo: 100, outras: [] })).toMatch(/categoria/);
    expect(
      validarMeta({
        tipo: "teto_categoria",
        nome: "Mercado",
        valorAlvo: 100,
        categoriaID: "cat-mercado",
        outras: [TETO],
      }),
    ).toMatch(/já tem teto/);
    expect(
      validarMeta({
        tipo: "teto_categoria",
        nome: "Mercado",
        valorAlvo: 100,
        categoriaID: "cat-mercado",
        outras: [TETO],
        id: TETO.id,
      }),
    ).toBeNull();
    expect(
      validarMeta({ tipo: "economia_mensal", nome: "", valorAlvo: 100, outras: [] }),
    ).toBeNull();
    expect(validarMeta({ tipo: "objetivo", nome: "Viagem", valorAlvo: 100, outras: [] })).toMatch(
      /depois/,
    );
  });
});
