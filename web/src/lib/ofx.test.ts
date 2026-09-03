import { describe, expect, it } from "vitest";
import type { Categoria, Transacao } from "./domain";
import { FIXTURE_FATURA_OFX } from "./ofx-fixture";
import {
  CATEGORIA_OUTROS_ID,
  centavosDeOfx,
  classificarCategoria,
  hashDedupOfx,
  jaImportada,
  parseOfx,
  transacoesDoOfx,
} from "./ofx";

const PET: Categoria = {
  id: "cat-pet",
  nome: "Pet",
  icone: "outros",
  cor: "grafite",
  tipo: "despesa",
  carteiraID: "w1",
};

describe("centavosDeOfx", () => {
  it("converte string decimal sem float", () => {
    expect(centavosDeOfx("-45.90")).toBe(-4590);
    expect(centavosDeOfx("45,90")).toBe(4590);
    expect(centavosDeOfx("1.234,56")).toBe(123456);
    expect(centavosDeOfx("1,234.56")).toBe(123456);
    expect(centavosDeOfx("1500")).toBe(150000);
    expect(centavosDeOfx("45.9")).toBe(4590);
  });

  it("rejeita lixo", () => {
    expect(centavosDeOfx("")).toBeNull();
    expect(centavosDeOfx("-")).toBeNull();
    expect(centavosDeOfx("abc")).toBeNull();
  });
});

describe("parseOfx", () => {
  it("separa 3 gastos e 1 crédito da fixture", () => {
    const { gastos, creditos } = parseOfx(FIXTURE_FATURA_OFX);
    expect(gastos).toHaveLength(3);
    expect(creditos).toHaveLength(1);
    expect(gastos.map((g) => [g.descricao, g.valorCentavos, g.data])).toEqual([
      ["IFOOD *PIZZA NAPOLI", 4590, "2026-08-15"],
      ["POSTO SHELL CENTRO", 12000, "2026-08-18"],
      ["LOJA GENERICA XYZ", 3250, "2026-08-20"],
    ]);
    expect(creditos[0]).toMatchObject({
      descricao: "PAGAMENTO RECEBIDO",
      valorCentavos: 150000,
      tipo: "credito",
    });
  });

  it("trata débito positivo estilo Itaú como gasto", () => {
    const { gastos, creditos } = parseOfx(`
      <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20260901
      <TRNAMT>89.90
      <FITID>ITAU-1
      <MEMO>MERCADO LIVRE
      </STMTTRN>
    `);
    expect(gastos).toHaveLength(1);
    expect(gastos[0]?.valorCentavos).toBe(8990);
    expect(creditos).toHaveLength(0);
  });
});

describe("classificarCategoria", () => {
  it("reconhece iFood, posto e cai em Outros", () => {
    expect(classificarCategoria("IFOOD *PIZZA NAPOLI")).toBe("00000000-0000-0000-0000-000000000002");
    expect(classificarCategoria("POSTO SHELL CENTRO")).toBe("00000000-0000-0000-0000-000000000003");
    expect(classificarCategoria("LOJA GENERICA XYZ")).toBe(CATEGORIA_OUTROS_ID);
  });
});

describe("transacoesDoOfx", () => {
  it("materializa N lançamentos com as categorias escolhidas", () => {
    const { gastos } = parseOfx(FIXTURE_FATURA_OFX);
    const linhas = gastos.map((g, i) => ({
      descricao: g.descricao,
      valor: g.valorCentavos,
      data: g.data,
      categoriaID: i === 2 ? PET.id : classificarCategoria(g.descricao, [PET]),
      hashDedup: hashDedupOfx("k1", g.fitId),
    }));

    const txs = transacoesDoOfx({
      linhas,
      carteiraID: "w1",
      cartaoID: "k1",
      pagadorID: "u1",
    });

    expect(txs).toHaveLength(3);
    expect(txs.every((t) => t.tipo === "despesa" && t.cartaoID === "k1" && t.carteiraID === "w1")).toBe(true);
    expect(txs.map((t) => t.categoriaID)).toEqual([
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000003",
      "cat-pet",
    ]);
    expect(txs.map((t) => t.valor)).toEqual([4590, 12000, 3250]);
    expect(txs[0]?.hashDedup).toBe("ofx|k1|FIT-IFOOD-1");
  });

  it("não relança o mesmo FITID", () => {
    const existentes: Transacao[] = [
      {
        id: "ja",
        carteiraID: "w1",
        tipo: "despesa",
        valor: 4590,
        data: "2026-08-15T15:00:00.000Z",
        descricao: "IFOOD *PIZZA NAPOLI",
        cartaoID: "k1",
        hashDedup: "ofx|k1|FIT-IFOOD-1",
        parcelaN: 1,
        parcelaTotal: 1,
      },
    ];
    const { gastos } = parseOfx(FIXTURE_FATURA_OFX);
    const txs = transacoesDoOfx({
      linhas: gastos.map((g) => ({
        descricao: g.descricao,
        valor: g.valorCentavos,
        data: g.data,
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfx("k1", g.fitId),
      })),
      carteiraID: "w1",
      cartaoID: "k1",
      existentes,
    });
    expect(txs).toHaveLength(2);
    expect(txs.some((t) => t.hashDedup === "ofx|k1|FIT-IFOOD-1")).toBe(false);
    expect(jaImportada(existentes, "ofx|k1|FIT-IFOOD-1")).toBe(true);
  });
});
