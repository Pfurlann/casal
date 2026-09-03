import { describe, expect, it } from "vitest";
import type { Cartao } from "./domain";
import {
  cartaoDoLancamento,
  cartoesDaLoja,
  linhaDaTransacao,
  transacoesDaCarteira,
  transacoesDoGastoNoCartao,
} from "./persistir";

const CARTAO: Cartao = {
  id: "k1",
  carteiraID: "c1",
  apelido: "Roxinho",
  banco: "Nubank",
  ultimos4: "4417",
  bandeira: "mastercard",
  cor: "#7C5CFF",
  limite: 500_000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

describe("gasto manual no cartão", () => {
  it("não perde o cartão quando cartoesTodos veio vazio e a lista visível tem o cartão", () => {
    expect(cartoesDaLoja([], [CARTAO])).toEqual([CARTAO]);
    expect(cartaoDoLancamento("k1", "despesa", cartoesDaLoja([], [CARTAO]))?.id).toBe("k1");
  });

  it("lançar com cartaoID grava transação com card_id e aparece na lista da carteira", () => {
    const txs = transacoesDoGastoNoCartao({
      valor: 4200,
      descricao: "Padaria",
      data: new Date(2026, 8, 3, 12, 0, 0),
      cartaoID: "k1",
      parcelas: 1,
      carteiraID: "c1",
      cartoes: [CARTAO],
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]?.cartaoID).toBe("k1");
    expect(txs[0]?.status).toBe("liquidado");
    expect(txs[0]?.contaID).toBeUndefined();
    expect(txs[0]?.carteiraID).toBe("c1");
    expect(linhaDaTransacao(txs[0]!)).toMatchObject({
      wallet_id: "c1",
      card_id: "k1",
      account_id: null,
      descricao: "Padaria",
      status: "liquidado",
      goal_id: null,
    });
    expect(transacoesDaCarteira(txs, "c1")).toHaveLength(1);
    expect(transacoesDaCarteira(txs, "outra")).toEqual([]);
  });

  it("no cartão 3x as três txs têm a mesma descricao e o mesmo card_id", () => {
    const txs = transacoesDoGastoNoCartao({
      valor: 9000,
      descricao: "Sofá",
      data: new Date(2026, 8, 3, 12, 0, 0),
      cartaoID: "k1",
      parcelas: 3,
      carteiraID: "c1",
      cartoes: [CARTAO],
    });
    expect(txs).toHaveLength(3);
    expect(txs.every((t) => t.descricao === "Sofá")).toBe(true);
    expect(txs.every((t) => t.cartaoID === "k1")).toBe(true);
    expect(txs.map(linhaDaTransacao).every((l) => l.card_id === "k1")).toBe(true);
    expect(transacoesDaCarteira(txs, "c1")).toHaveLength(3);
  });
});
