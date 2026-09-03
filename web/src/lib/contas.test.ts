import { describe, expect, it } from "vitest";
import { saldoDaConta, saldoDasContas } from "./contas";
import type { Conta, Transacao } from "./domain";

const CONTA: Conta = {
  id: "a1",
  carteiraID: "w1",
  nome: "Corrente",
  tipo: "corrente",
  saldoInicial: 300_000,
  arquivada: false,
};

function tx(parcial: Partial<Transacao>): Transacao {
  return {
    id: "t1",
    carteiraID: "w1",
    tipo: "despesa",
    valor: 10_000,
    data: "2026-09-03T12:00:00.000Z",
    descricao: "x",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

describe("saldoDaConta", () => {
  it("soma receita liquidada e baixa despesa liquidada, em centavos", () => {
    const saldo = saldoDaConta(CONTA, [
      tx({ id: "r", tipo: "receita", valor: 50_000, contaID: "a1", status: "liquidado" }),
      tx({ id: "d", tipo: "despesa", valor: 20_000, contaID: "a1", status: "liquidado" }),
    ]);
    expect(saldo).toBe(330_000);
  });

  it("fixo a_pagar não baixa o saldo até o swipe", () => {
    expect(
      saldoDaConta(CONTA, [
        tx({ id: "f", valor: 250_000, contaID: "a1", status: "a_pagar", hashDedup: "fixa|f1|2026-09" }),
      ]),
    ).toBe(300_000);
  });

  it("pagamento de fatura baixa o saldo da conta", () => {
    expect(
      saldoDaConta(CONTA, [
        tx({
          id: "p",
          tipo: "transferencia",
          valor: 80_000,
          contaID: "a1",
          faturaID: "inv-1",
          hashDedup: "pagamento|inv-1|80000",
          status: "liquidado",
        }),
      ]),
    ).toBe(220_000);
  });

  it("compra no cartão não mexe no saldo da conta", () => {
    expect(
      saldoDaConta(CONTA, [
        tx({ id: "c", valor: 4200, cartaoID: "k1", status: "liquidado" }),
      ]),
    ).toBe(300_000);
  });
});

describe("saldoDasContas", () => {
  it("soma só contas ativas com o movimento", () => {
    const outra: Conta = { ...CONTA, id: "a2", saldoInicial: 50_000 };
    expect(
      saldoDasContas(
        [CONTA, outra, { ...CONTA, id: "a3", arquivada: true }],
        [tx({ id: "d", valor: 100_000, contaID: "a1", status: "liquidado" })],
      ),
    ).toBe(250_000);
  });
});
