import { describe, expect, it } from "vitest";
import {
  liquidarCompromisso,
  montarCompromisso,
  transacaoDoCompromisso,
  validarCompromisso,
  validarLiquidacao,
} from "./compromissos";

const BASE = {
  carteiraID: "w1",
  nome: "Conta de luz",
  valor: 18_090,
  venceEm: "2026-09-12",
  categoriaID: "cat-moradia",
};

describe("compromisso", () => {
  it("cadastrado já nasce como lançamento a pagar", () => {
    const c = montarCompromisso(BASE);
    const tx = transacaoDoCompromisso(c);
    expect(c.status).toBe("a_pagar");
    expect(tx.status).toBe("a_pagar");
    expect(tx.valor).toBe(18_090);
    expect(tx.descricao).toBe("Conta de luz");
    expect(tx.contaID).toBeUndefined();
    expect(tx.cartaoID).toBeUndefined();
    expect(tx.id).toBe(c.transacaoID);
  });

  it("pede nome, valor, vencimento e categoria", () => {
    expect(validarCompromisso({ ...BASE, nome: "" })).toMatch(/nome/);
    expect(validarCompromisso({ ...BASE, valor: 0 })).toMatch(/valor/);
    expect(validarCompromisso({ ...BASE, venceEm: "" })).toMatch(/vencimento/);
    expect(validarCompromisso({ ...BASE, categoriaID: "" })).toMatch(/categoria/);
    expect(validarCompromisso(BASE)).toBeNull();
  });

  it("liquidar só aceita uma origem — sem pedir valor de novo", () => {
    expect(validarLiquidacao({})).toMatch(/pagar/);
    expect(validarLiquidacao({ contaID: "a1", cartaoID: "k1" })).toMatch(/não os dois/);
    expect(validarLiquidacao({ contaID: "a1" })).toBeNull();

    const c = montarCompromisso({ ...BASE, id: "c1", transacaoID: "t1" });
    const tx = transacaoDoCompromisso(c);
    const { compromisso, transacao } = liquidarCompromisso(c, tx, { contaID: "a1" });
    expect(compromisso.status).toBe("liquidado");
    expect(transacao.status).toBe("liquidado");
    expect(transacao.contaID).toBe("a1");
    expect(transacao.cartaoID).toBeUndefined();
    expect(transacao.valor).toBe(c.valor);
  });

  it("liquidar no cartão grava só o cartão", () => {
    const c = montarCompromisso({ ...BASE, id: "c1", transacaoID: "t1" });
    const { transacao } = liquidarCompromisso(c, transacaoDoCompromisso(c), { cartaoID: "k1" });
    expect(transacao.cartaoID).toBe("k1");
    expect(transacao.contaID).toBeUndefined();
    expect(transacao.valor).toBe(18_090);
  });
});
