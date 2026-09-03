import { describe, expect, it } from "vitest";
import type { DespesaFixa, Transacao } from "./domain";
import {
  dataVencimento,
  hashDedupFixa,
  jaLancada,
  transacaoDaFixa,
  validarDespesaFixa,
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
  });

  it("no cartão não leva conta", () => {
    const gerada = transacaoDaFixa({ ...FIXA, contaID: undefined, cartaoID: "k1" }, { ano: 2026, mes: 9 });
    expect(gerada.cartaoID).toBe("k1");
    expect(gerada.contaID).toBeUndefined();
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
});
