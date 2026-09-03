import { describe, expect, it } from "vitest";
import { competenciaDaCompra, totalDaFatura, type Cartao, type Fatura, type Transacao } from "./domain";
import {
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
  cor: "#7C5CFF",
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
  it("compra no cartão não é paga, mesmo com status antigo liquidado", () => {
    const t = compra({ status: "liquidado" });
    expect(eCompraNoCartao(t)).toBe(true);
    expect(eLancamentoPago(t, [FATURA_SET])).toBe(false);
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
});
