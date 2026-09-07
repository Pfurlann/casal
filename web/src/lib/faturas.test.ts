import { describe, expect, it } from "vitest";
import { competenciaDaCompra, totalDaFatura, type Cartao, type Fatura, type Transacao } from "./domain";
import {
  competenciaDaTransacao,
  eCompraNoCartao,
  eLancamentoPago,
  hashDedupFatura,
  lancamentoDoTotalDaFatura,
  sincronizarTotaisFatura,
} from "./faturas";

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

const FATURA_SET: Fatura = {
  id: "inv-9",
  cartaoID: "k1",
  ano: 2026,
  mes: 9,
  fechaEm: "2026-09-28",
  venceEm: "2026-10-05",
  status: "aberta",
  valorPago: 0,
};

function compra(parcial: Partial<Transacao> = {}): Transacao {
  return {
    id: "c1",
    carteiraID: "w1",
    tipo: "despesa",
    valor: 10_000,
    data: "2026-09-10T15:00:00.000Z",
    descricao: "Padaria",
    cartaoID: "k1",
    hashDedup: "compra|padaria",
    parcelaN: 1,
    parcelaTotal: 1,
    status: "a_pagar",
    ...parcial,
  };
}

describe("pago vs a pagar", () => {
  it("compra no cartão já está paga no cartão", () => {
    const t = compra({ status: "a_pagar" });
    expect(eCompraNoCartao(t)).toBe(true);
    expect(eLancamentoPago(t, [FATURA_SET])).toBe(true);
  });

  it("sem hashDedup não quebra o estado pago", () => {
    const t = { ...compra({ cartaoID: undefined, contaID: "a1", status: "a_pagar" }), hashDedup: undefined as unknown as string };
    expect(eLancamentoPago(t)).toBe(false);
  });

  it("conta só fica paga depois de liquidar", () => {
    const aberta: Transacao = { ...compra({ cartaoID: undefined, contaID: "a1", status: "a_pagar" }) };
    const paga: Transacao = { ...aberta, status: "liquidado" };
    expect(eLancamentoPago(aberta)).toBe(false);
    expect(eLancamentoPago(paga)).toBe(true);
  });

  it("fatura total nasce a pagar e o check só vem se a fatura foi paga", () => {
    const total = lancamentoDoTotalDaFatura(CARTAO, FATURA_SET, [compra()]);
    expect(total?.status).toBe("a_pagar");
    expect(total?.valor).toBe(10_000);
    expect(total?.hashDedup).toBe(hashDedupFatura("k1", { ano: 2026, mes: 9 }));
    expect(eLancamentoPago(total!, [FATURA_SET])).toBe(false);
    const paga: Fatura = { ...FATURA_SET, status: "paga", valorPago: 10_000 };
    const linha = lancamentoDoTotalDaFatura(CARTAO, paga, [compra()]);
    expect(eLancamentoPago(linha!, [paga])).toBe(true);
  });
});

describe("competenciaDaTransacao", () => {
  it("compra OFX depois do fechamento vai para a fatura do mês seguinte", () => {
    const nanquim: Cartao = { ...CARTAO, id: "nan", diaFechamento: 7, diaVencimento: 15 };
    const depois = compra({
      data: "2026-08-25T15:00:00.000Z",
      cartaoID: "nan",
      hashDedup: "ofx|nan|park",
    });
    const antes = compra({
      data: "2026-08-05T15:00:00.000Z",
      cartaoID: "nan",
      hashDedup: "ofx|nan|barbe",
    });
    expect(competenciaDaTransacao(depois, [nanquim])).toEqual({ ano: 2026, mes: 9 });
    expect(competenciaDaTransacao(antes, [nanquim])).toEqual({ ano: 2026, mes: 8 });
  });
});

describe("total da fatura pela competência", () => {
  it("compra depois do fechamento não mexe o total atual", () => {
    const dentro = compra();
    const fora = compra({
      id: "c2",
      data: "2026-09-29T15:00:00.000Z",
      valor: 50_000,
      hashDedup: "compra|depois",
    });
    expect(competenciaDaCompra(new Date(dentro.data), CARTAO)).toEqual({ ano: 2026, mes: 9 });
    expect(competenciaDaCompra(new Date(fora.data), CARTAO)).toEqual({ ano: 2026, mes: 10 });
    expect(totalDaFatura(FATURA_SET, [dentro], CARTAO)).toBe(10_000);
    expect(totalDaFatura(FATURA_SET, [dentro, fora], CARTAO)).toBe(10_000);
    const atual = lancamentoDoTotalDaFatura(CARTAO, FATURA_SET, [dentro, fora]);
    expect(atual?.valor).toBe(10_000);
    const prox: Fatura = {
      ...FATURA_SET,
      id: "inv-10",
      mes: 10,
      fechaEm: "2026-10-28",
      venceEm: "2026-11-05",
    };
    expect(lancamentoDoTotalDaFatura(CARTAO, prox, [dentro, fora])?.valor).toBe(50_000);
  });

  it("o total da fatura não entra na soma das compras", () => {
    const linha = lancamentoDoTotalDaFatura(CARTAO, FATURA_SET, [compra()]);
    expect(totalDaFatura(FATURA_SET, [compra(), linha!], CARTAO)).toBe(10_000);
  });

  it("sincroniza o lançamento do total em a pagar", () => {
    const { novas, transacoes } = sincronizarTotaisFatura([CARTAO], [FATURA_SET], [compra()]);
    expect(novas).toHaveLength(1);
    expect(novas[0]?.status).toBe("a_pagar");
    expect(novas[0]?.valor).toBe(10_000);
    expect(transacoes.some((t) => t.hashDedup === hashDedupFatura("k1", { ano: 2026, mes: 9 }))).toBe(true);
  });

  it("após deletar compras, sincroniza atualiza valor da fatura para valor residual", () => {
    const c1 = compra();
    const c2 = { ...compra(), id: "c2", valor: 5_000, hashDedup: "ofx|k1|c2" };
    const faturaExistente = {
      id: "f1",
      carteiraID: "c1",
      tipo: "despesa" as const,
      valor: 15_000,
      data: "2026-09-28T12:00:00.000Z",
      descricao: "Fatura Roxinho",
      cartaoID: "k1",
      faturaID: "inv1",
      hashDedup: "fatura|k1|2026-09",
      parcelaN: 1,
      parcelaTotal: 1,
      status: "a_pagar" as const,
    };
    
    const antes = [c1, c2, faturaExistente];
    const aposDeleteC2 = [c1, faturaExistente];
    
    const { alteradas, transacoes } = sincronizarTotaisFatura([CARTAO], [FATURA_SET], aposDeleteC2);
    
    expect(alteradas).toHaveLength(1);
    expect(alteradas[0]?.valor).toBe(10_000);
    
    const faturaAtualizada = transacoes.find((t) => t.hashDedup === "fatura|k1|2026-09");
    expect(faturaAtualizada?.valor).toBe(10_000);
  });

  it("após deletar TODAS as compras, sincroniza atualiza fatura para ZERO", () => {
    const faturaExistente = {
      id: "f1",
      carteiraID: "c1",
      tipo: "despesa" as const,
      valor: 15_000,
      data: "2026-09-28T12:00:00.000Z",
      descricao: "Fatura Roxinho",
      cartaoID: "k1",
      faturaID: "inv1",
      hashDedup: "fatura|k1|2026-09",
      parcelaN: 1,
      parcelaTotal: 1,
      status: "a_pagar" as const,
    };
    
    const aposDeleteTudo = [faturaExistente];
    
    const { alteradas, transacoes } = sincronizarTotaisFatura([CARTAO], [FATURA_SET], aposDeleteTudo);
    
    expect(alteradas).toHaveLength(1);
    expect(alteradas[0]?.valor).toBe(0);
    
    const faturaAtualizada = transacoes.find((t) => t.hashDedup === "fatura|k1|2026-09");
    expect(faturaAtualizada?.valor).toBe(0);
  });
});
