import { describe, expect, it } from "vitest";
import type { Cartao, Fatura, Transacao } from "./domain";
import {
  comprometidoDoPeriodo,
  fatiasDaRosca,
  montarRelatorio,
} from "./relatorios";

const C = { ano: 2026, mes: 9 };

function tx(parcial: Partial<Transacao> = {}): Transacao {
  return {
    id: parcial.id ?? crypto.randomUUID(),
    carteiraID: "w1",
    tipo: "despesa",
    valor: 10_000,
    data: "2026-09-10T15:00:00.000Z",
    descricao: "feira",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

const CARTAO: Cartao = {
  id: "k1",
  carteiraID: "w1",
  apelido: "Roxinho",
  banco: "Nubank",
  ultimos4: "4417",
  bandeira: "mastercard",
  cor: "#0E0E0C",
  limite: 1_000_000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

describe("fatiasDaRosca", () => {
  it("mantém até 5 categorias intactas", () => {
    const cats = [1, 2, 3, 4, 5].map((n) => ({
      categoriaID: String(n),
      nome: `C${n}`,
      total: n * 1000,
    }));
    expect(fatiasDaRosca(cats)).toEqual(cats);
  });

  it("agrupa o resto em Outros depois do top 5", () => {
    const cats = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
      categoriaID: String(n),
      nome: `C${n}`,
      total: (8 - n) * 1000,
    }));
    const fatias = fatiasDaRosca(cats);
    expect(fatias).toHaveLength(6);
    expect(fatias.slice(0, 5).map((f) => f.nome)).toEqual(["C1", "C2", "C3", "C4", "C5"]);
    expect(fatias[5]).toEqual({ categoriaID: "", nome: "Outros", total: 3000 });
  });
});

describe("montarRelatorio", () => {
  it("soma gasto, receita e fluxo em centavos, sem transferência", () => {
    const r = montarRelatorio({
      transacoes: [
        tx({ id: "r", tipo: "receita", valor: 500_000 }),
        tx({ id: "d1", valor: 80_000, categoriaID: "00000000-0000-0000-0000-000000000001" }),
        tx({ id: "d2", valor: 40_000, categoriaID: "00000000-0000-0000-0000-000000000002" }),
        tx({ id: "x", tipo: "transferencia", valor: 10_000 }),
        tx({ id: "old", valor: 99_000, data: "2026-08-10T15:00:00.000Z" }),
      ],
      cartoes: [],
      faturas: [],
      competencia: C,
    });
    expect(r.gasto).toBe(120_000);
    expect(r.receita).toBe(500_000);
    expect(r.fluxo).toBe(380_000);
    expect(r.frase).toBe("sobra 76% da receita");
    expect(r.fatias.map((f) => f.nome)).toEqual(["Mercado", "Restaurante"]);
  });

  it("ignora o lançamento sintético da fatura no gasto e na rosca", () => {
    const r = montarRelatorio({
      transacoes: [
        tx({ id: "c", valor: 200_000, cartaoID: "k1", categoriaID: "00000000-0000-0000-0000-000000000001" }),
        tx({
          id: "f",
          valor: 200_000,
          cartaoID: "k1",
          descricao: "Fatura Roxinho",
          hashDedup: "fatura|k1|2026-09",
        }),
      ],
      cartoes: [CARTAO],
      faturas: [],
      competencia: C,
    });
    expect(r.gasto).toBe(200_000);
    expect(r.fatias).toEqual([
      { categoriaID: "00000000-0000-0000-0000-000000000001", nome: "Mercado", total: 200_000 },
    ]);
  });

  it("frase seca, sem alerta de teto ou cartão", () => {
    const r = montarRelatorio({
      transacoes: [
        tx({ id: "r", tipo: "receita", valor: 100_000 }),
        tx({ id: "d", valor: 112_000 }),
      ],
      cartoes: [],
      faturas: [],
      competencia: C,
    });
    expect(r.frase).toBe("gastos 12% acima da receita");
  });
});

describe("comprometidoDoPeriodo", () => {
  it("é o saldo devedor das faturas da competência", () => {
    const compra = tx({
      id: "c",
      valor: 200_000,
      cartaoID: "k1",
      data: "2026-09-08T15:00:00.000Z",
    });
    const fatura: Fatura = {
      id: "f1",
      cartaoID: "k1",
      ano: 2026,
      mes: 9,
      fechaEm: "2026-09-28",
      venceEm: "2026-10-05",
      status: "parcial",
      valorPago: 50_000,
    };
    expect(comprometidoDoPeriodo([CARTAO], [fatura], [compra], C)).toBe(150_000);
  });

  it("ignora cartão arquivado", () => {
    expect(
      comprometidoDoPeriodo(
        [{ ...CARTAO, arquivado: true }],
        [],
        [tx({ cartaoID: "k1", valor: 80_000 })],
        C,
      ),
    ).toBe(0);
  });
});
