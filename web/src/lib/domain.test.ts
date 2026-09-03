import { describe, expect, it } from "vitest";
import {
  competenciaDaConsulta,
  competenciaDaRota,
  dataDeLocalISO,
  dataLocalISO,
  hrefDoMes,
  planejarParcelas,
  rotuloDaCompetencia,
  transacoesDoLancamento,
  type Cartao,
} from "./domain";

const CARTAO: Cartao = {
  id: "k1",
  carteiraID: "c1",
  apelido: "Nosso",
  banco: "Nubank",
  ultimos4: "4417",
  bandeira: "mastercard",
  cor: "#7C5CFF",
  limite: 1_000_000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

function data(ano: number, mes: number, dia: number) {
  return new Date(ano, mes - 1, dia, 12, 0, 0);
}

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

describe("competenciaDaConsulta / hrefDoMes", () => {
  it("lê ?c= ou cai no mês atual, e monta o href", () => {
    expect(competenciaDaConsulta("2026-08")).toEqual({ ano: 2026, mes: 8 });
    expect(competenciaDaConsulta("setembro")).toEqual(expect.objectContaining({
      ano: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
    }));
    expect(hrefDoMes({ ano: 2026, mes: 8 })).toBe("/mes?c=2026-08");
  });
});

describe("planejarParcelas", () => {
  it("à vista gera uma única parcela na fatura da compra", () => {
    const parcelas = planejarParcelas(4200, 1, data(2026, 9, 10), CARTAO);
    expect(parcelas).toHaveLength(1);
    expect(parcelas[0]).toMatchObject({
      competencia: { ano: 2026, mes: 9 },
      valor: 4200,
      numero: 1,
      total: 1,
    });
  });

  it("doze vezes ocupa doze competências consecutivas", () => {
    const parcelas = planejarParcelas(300_000, 12, data(2026, 9, 10), CARTAO);
    expect(parcelas).toHaveLength(12);
    expect(parcelas[0]?.competencia).toEqual({ ano: 2026, mes: 9 });
    expect(parcelas[0]?.data).toBe("2026-09-10");
    expect(parcelas[1]?.data).toBe("2026-10-28");
    expect(parcelas[11]?.competencia).toEqual({ ano: 2027, mes: 8 });
    expect(parcelas.map((p) => p.numero)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(parcelas.every((p) => p.total === 12)).toBe(true);
  });

  it("a soma das parcelas é exatamente o total, com sobra na primeira", () => {
    const parcelas = planejarParcelas(10_000, 3, data(2026, 9, 10), CARTAO);
    expect(parcelas.map((p) => p.valor)).toEqual([3334, 3333, 3333]);
    expect(parcelas.reduce((s, p) => s + p.valor, 0)).toBe(10_000);
  });

  it("compra depois do fechamento empurra a primeira parcela e as demais", () => {
    const parcelas = planejarParcelas(60_000, 6, data(2026, 9, 29), CARTAO);
    expect(parcelas[0]?.competencia).toEqual({ ano: 2026, mes: 10 });
    expect(parcelas[5]?.competencia).toEqual({ ano: 2027, mes: 3 });
  });

  it("zero vezes não gera parcela nenhuma", () => {
    expect(planejarParcelas(100, 0, data(2026, 9, 10), CARTAO)).toEqual([]);
  });
});

describe("transacoesDoLancamento", () => {
  it("sem cartão grava uma transação na conta, mesmo se pediram parcelas", () => {
    const txs = transacoesDoLancamento({
      valor: 4200,
      descricao: "Padaria",
      data: data(2026, 9, 10),
      contaID: "a1",
      parcelas: 6,
      carteiraID: "c1",
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]?.cartaoID).toBeUndefined();
    expect(txs[0]?.contaID).toBe("a1");
    expect(txs[0]?.status).toBe("a_pagar");
    expect(txs[0]?.parcelaTotal).toBe(1);
  });

  it("com cartão à vista grava uma transação já vinculada ao cartão", () => {
    const txs = transacoesDoLancamento({
      valor: 4200,
      descricao: "",
      data: data(2026, 9, 10),
      cartao: CARTAO,
      parcelas: 1,
      carteiraID: "c1",
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ cartaoID: "k1", valor: 4200, parcelaTotal: 1, status: "liquidado" });
    expect(txs[0]?.contaID).toBeUndefined();
  });

  it("com cartão em 12x grava doze transações do mesmo grupo", () => {
    const txs = transacoesDoLancamento({
      valor: 300_000,
      descricao: "Apple Store",
      categoriaID: "cat-1",
      data: data(2026, 9, 10),
      cartao: CARTAO,
      parcelas: 12,
      carteiraID: "c1",
    });
    expect(txs).toHaveLength(12);
    expect(new Set(txs.map((t) => t.grupoParcela)).size).toBe(1);
    expect(txs.reduce((s, t) => s + t.valor, 0)).toBe(300_000);
    expect(new Set(txs.map((t) => t.parcelaN))).toEqual(new Set(Array.from({ length: 12 }, (_, i) => i + 1)));
    expect(txs.every((t) => t.parcelaTotal === 12)).toBe(true);
    expect(txs.every((t) => t.cartaoID === "k1")).toBe(true);
    expect(txs.every((t) => t.contaID === undefined)).toBe(true);
    expect(new Set(txs.map((t) => t.hashDedup)).size).toBe(12);
  });

  it("grava o mesmo pagador em todas as parcelas", () => {
    const txs = transacoesDoLancamento({
      valor: 9000,
      descricao: "Sofá",
      data: data(2026, 9, 10),
      cartao: CARTAO,
      parcelas: 3,
      carteiraID: "c1",
      pagadorID: "u2",
    });
    expect(txs).toHaveLength(3);
    expect(txs.every((t) => t.pagadorID === "u2")).toBe(true);
    expect(txs.every((t) => t.descricao === "Sofá")).toBe(true);
  });

  it("grava receita positiva na conta, sem cartão", () => {
    const txs = transacoesDoLancamento({
      valor: 850000,
      descricao: "Salário",
      categoriaID: "00000000-0000-0000-0000-000000000013",
      data: data(2026, 9, 2),
      contaID: "a1",
      cartao: CARTAO,
      parcelas: 3,
      carteiraID: "c1",
      tipo: "receita",
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      tipo: "receita",
      valor: 850000,
      contaID: "a1",
      cartaoID: undefined,
      parcelaTotal: 1,
    });
  });
});

describe("data local do lançamento", () => {
  it("formata e relê o dia sem virar UTC", () => {
    expect(dataLocalISO(data(2026, 8, 15))).toBe("2026-08-15");
    expect(dataDeLocalISO("2026-08-15")).toEqual(data(2026, 8, 15));
  });
});
