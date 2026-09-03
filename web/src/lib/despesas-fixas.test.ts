import { describe, expect, it } from "vitest";
import type { Cartao, DespesaFixa, Transacao } from "./domain";
import { competenciaDaCompra } from "./domain";
import {
  HORIZONTE_FIXOS,
  dataVencimento,
  gerarLancamentosFixos,
  hashDedupFixa,
  jaLancada,
  liquidarLancamento,
  matchManualDoMes,
  transacaoDaFixa,
  validarDespesaFixa,
  valorDaParcela,
  vencimentosDoMes,
} from "./despesas-fixas";

const FIXA: DespesaFixa = {
  id: "f1",
  carteiraID: "w1",
  nome: "Aluguel",
  valor: 250_000,
  categoriaID: "00000000-0000-0000-0000-000000000005",
  diaVencimento: 31,
  contaID: "a1",
  tipo: "despesa",
};

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

function tx(parcial: Partial<Transacao> = {}): Transacao {
  return {
    id: "t1",
    carteiraID: "w1",
    tipo: "despesa",
    valor: 250_000,
    data: "2026-02-28T15:00:00.000Z",
    descricao: "Aluguel",
    hashDedup: hashDedupFixa("f1", { ano: 2026, mes: 2 }),
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

describe("dataVencimento", () => {
  it("usa o último dia quando o mês não tem o dia 31", () => {
    expect(dataVencimento({ ano: 2026, mes: 2 }, 31)).toBe("2026-02-28");
    expect(dataVencimento({ ano: 2026, mes: 4 }, 31)).toBe("2026-04-30");
  });

  it("respeita 29 de fevereiro em ano bissexto", () => {
    expect(dataVencimento({ ano: 2028, mes: 2 }, 31)).toBe("2028-02-29");
  });

  it("mantém o dia quando o mês cabe", () => {
    expect(dataVencimento({ ano: 2026, mes: 1 }, 31)).toBe("2026-01-31");
    expect(dataVencimento({ ano: 2026, mes: 9 }, 10)).toBe("2026-09-10");
  });
});

describe("hashDedupFixa", () => {
  it("identifica a competência com mês em dois dígitos", () => {
    expect(hashDedupFixa("f1", { ano: 2026, mes: 2 })).toBe("fixa|f1|2026-02");
    expect(hashDedupFixa("f1", { ano: 2026, mes: 11 })).toBe("fixa|f1|2026-11");
  });
});

describe("transacaoDaFixa", () => {
  it("materializa o gasto no dia de vencimento da competência", () => {
    const gerada = transacaoDaFixa(FIXA, { ano: 2026, mes: 2 });
    expect(gerada.tipo).toBe("despesa");
    expect(gerada.valor).toBe(250_000);
    expect(gerada.descricao).toBe("Aluguel");
    expect(gerada.contaID).toBe("a1");
    expect(gerada.cartaoID).toBeUndefined();
    expect(gerada.hashDedup).toBe("fixa|f1|2026-02");
    expect(gerada.data.startsWith("2026-02-28")).toBe(true);
    expect(gerada.status).toBe("a_pagar");
  });

  it("no cartão não leva conta e data cai no fechamento", () => {
    const gerada = transacaoDaFixa(
      { ...FIXA, contaID: undefined, cartaoID: "k1" },
      { ano: 2026, mes: 9 },
      { cartao: CARTAO },
    );
    expect(gerada.cartaoID).toBe("k1");
    expect(gerada.contaID).toBeUndefined();
    expect(gerada.data.startsWith("2026-09-28")).toBe(true);
    expect(competenciaDaCompra(new Date(gerada.data), CARTAO)).toEqual({ ano: 2026, mes: 9 });
  });

  it("materializa receita positiva, sem cartão", () => {
    const salario: DespesaFixa = {
      ...FIXA,
      nome: "Salário",
      tipo: "receita",
      categoriaID: "00000000-0000-0000-0000-000000000013",
      cartaoID: "k1",
    };
    const gerada = transacaoDaFixa(salario, { ano: 2026, mes: 9 });
    expect(gerada.tipo).toBe("receita");
    expect(gerada.valor).toBe(250_000);
    expect(gerada.descricao).toBe("Salário");
    expect(gerada.contaID).toBe("a1");
    expect(gerada.cartaoID).toBeUndefined();
    expect(gerada.hashDedup).toBe("fixa|f1|2026-09");
  });
});

describe("gerarLancamentosFixos", () => {
  it("gera 12 meses a partir da competência, sem toque por mês", () => {
    const geradas = gerarLancamentosFixos([FIXA], [], { ano: 2026, mes: 9 });
    expect(geradas).toHaveLength(HORIZONTE_FIXOS);
    expect(geradas[0]?.hashDedup).toBe("fixa|f1|2026-09");
    expect(geradas[11]?.hashDedup).toBe("fixa|f1|2027-08");
    expect(geradas.every((t) => t.status === "a_pagar")).toBe(true);
    expect(geradas.every((t) => t.valor === 250_000)).toBe(true);
  });

  it("parcela com valores diferentes: 1ª R$ 1200, demais R$ 800", () => {
    const fin: DespesaFixa = {
      ...FIXA,
      nome: "Financiamento",
      valor: 120_000,
      parcelas: 4,
      valoresParcelas: [120_000, 80_000, 80_000, 80_000],
    };
    const geradas = gerarLancamentosFixos([fin], [], { ano: 2026, mes: 9 });
    expect(geradas).toHaveLength(4);
    expect(geradas.map((t) => t.valor)).toEqual([120_000, 80_000, 80_000, 80_000]);
    expect(geradas.map((t) => t.parcelaN)).toEqual([1, 2, 3, 4]);
    expect(geradas.every((t) => t.parcelaTotal === 4)).toBe(true);
    expect(geradas[0]?.hashDedup).toBe("fixa|f1|2026-09");
    expect(geradas[3]?.hashDedup).toBe("fixa|f1|2026-12");
  });

  it("não duplica competência que já tem hash ou lançamento manual", () => {
    const c = { ano: 2026, mes: 9 };
    const ja = tx({ hashDedup: hashDedupFixa("f1", c), data: "2026-09-10T12:00:00.000Z" });
    const manual = tx({
      id: "t-man",
      hashDedup: "manual|aluguel",
      descricao: "Aluguel",
      valor: 250_000,
      categoriaID: FIXA.categoriaID,
      data: "2026-10-08T12:00:00.000Z",
      status: "liquidado",
    });
    const geradas = gerarLancamentosFixos([FIXA], [ja, manual], c);
    expect(geradas.some((t) => t.hashDedup === "fixa|f1|2026-09")).toBe(false);
    expect(geradas.some((t) => t.hashDedup === "fixa|f1|2026-10")).toBe(false);
    expect(geradas).toHaveLength(10);
  });
});

describe("valorDaParcela", () => {
  it("usa a lista quando o índice existe", () => {
    const fin: DespesaFixa = { ...FIXA, valoresParcelas: [120_000, 80_000], parcelas: 2 };
    expect(valorDaParcela(fin, 0)).toBe(120_000);
    expect(valorDaParcela(fin, 1)).toBe(80_000);
  });
});

describe("jaLancada / vencimentosDoMes", () => {
  it("não deixa lançar de novo a mesma competência", () => {
    const c = { ano: 2026, mes: 2 };
    expect(jaLancada([tx()], FIXA.id, c)).toBe(true);
    expect(jaLancada([tx()], FIXA.id, { ano: 2026, mes: 3 })).toBe(false);
    expect(jaLancada([], FIXA.id, c)).toBe(false);
    expect(jaLancada([tx({ tipo: "receita" })], FIXA.id, c)).toBe(true);
  });

  it("mantém a fixa na lista mesmo depois de lançar o mês", () => {
    const netflix: DespesaFixa = { ...FIXA, id: "f2", nome: "Netflix", diaVencimento: 5, valor: 5590 };
    const lista = vencimentosDoMes([FIXA, netflix], [tx()], { ano: 2026, mes: 2 });
    expect(lista).toHaveLength(2);
    expect(lista.map((v) => v.fixa.nome)).toEqual(["Netflix", "Aluguel"]);
    expect(lista[0]?.lancada).toBe(false);
    expect(lista[1]?.lancada).toBe(true);
  });
});

describe("matchManualDoMes / liquidarLancamento", () => {
  it("reconhece gasto já lançado fora do fixo", () => {
    const manual = tx({
      hashDedup: "ofx|x",
      descricao: "aluguel",
      data: "2026-09-10T12:00:00.000Z",
      categoriaID: FIXA.categoriaID,
    });
    expect(matchManualDoMes([manual], FIXA, { ano: 2026, mes: 9 }, 250_000)?.id).toBe("t1");
  });

  it("liquidar só escolhe origem, sem pedir valor", () => {
    const aPagar = transacaoDaFixa(FIXA, { ano: 2026, mes: 9 });
    const paga = liquidarLancamento(aPagar, { contaID: "a1" });
    expect(paga.valor).toBe(aPagar.valor);
    expect(paga.status).toBe("liquidado");
    expect(paga.contaID).toBe("a1");
    expect(paga.cartaoID).toBeUndefined();
    expect(() => liquidarLancamento(aPagar, {})).toThrow(/pagar/);
  });

  it("fixo nasce a_pagar e compra no cartão não liquida no lançamento", () => {
    const gerada = transacaoDaFixa(FIXA, { ano: 2026, mes: 9 });
    expect(gerada.status).toBe("a_pagar");
    const noCartao = transacaoDaFixa(
      { ...FIXA, contaID: undefined, cartaoID: "k1" },
      { ano: 2026, mes: 9 },
      { cartao: CARTAO },
    );
    expect(noCartao.status).toBe("a_pagar");
    expect(() => liquidarLancamento(noCartao, { contaID: "a1" })).toThrow(/fatura/);
  });
});

describe("validarDespesaFixa", () => {
  it("exige nome, valor, dia 1–31 e uma origem", () => {
    expect(validarDespesaFixa({ nome: "", valor: 100, diaVencimento: 10, contaID: "a1" })).toMatch(/nome/);
    expect(validarDespesaFixa({ nome: "Luz", valor: 0, diaVencimento: 10, contaID: "a1" })).toMatch(/valor/);
    expect(validarDespesaFixa({ nome: "Luz", valor: 100, diaVencimento: 32, contaID: "a1" })).toMatch(/1 e 31/);
    expect(validarDespesaFixa({ nome: "Luz", valor: 100, diaVencimento: 10 })).toMatch(/pago/);
    expect(
      validarDespesaFixa({ nome: "Luz", valor: 100, diaVencimento: 10, contaID: "a1", cartaoID: "k1" }),
    ).toMatch(/não os dois/);
    expect(validarDespesaFixa({ nome: "Luz", valor: 100, diaVencimento: 10, contaID: "a1" })).toBeNull();
    expect(validarDespesaFixa({ nome: "Salário", valor: 100, diaVencimento: 5, tipo: "receita" })).toMatch(
      /conta que recebe/,
    );
    expect(
      validarDespesaFixa({
        nome: "Salário",
        valor: 100,
        diaVencimento: 5,
        tipo: "receita",
        cartaoID: "k1",
      }),
    ).toMatch(/não no cartão/);
    expect(
      validarDespesaFixa({ nome: "Salário", valor: 100, diaVencimento: 5, tipo: "receita", contaID: "a1" }),
    ).toBeNull();
  });

  it("parcela pede um valor por vez", () => {
    expect(
      validarDespesaFixa({
        nome: "Carro",
        valor: 120_000,
        diaVencimento: 10,
        contaID: "a1",
        parcelas: 3,
        valoresParcelas: [120_000, 80_000],
      }),
    ).toMatch(/cada parcela/);
    expect(
      validarDespesaFixa({
        nome: "Carro",
        valor: 120_000,
        diaVencimento: 10,
        contaID: "a1",
        parcelas: 3,
        valoresParcelas: [120_000, 80_000, 80_000],
      }),
    ).toBeNull();
  });
});
