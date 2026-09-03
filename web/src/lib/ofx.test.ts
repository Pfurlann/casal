import { describe, expect, it } from "vitest";
import type { Cartao, Categoria, Transacao } from "./domain";
import { competenciaDaCompra } from "./domain";
import { FIXTURE_FATURA_OFX, FIXTURE_PARCELA_OFX } from "./ofx-fixture";
import {
  CATEGORIA_OUTROS_ID,
  centavosDeOfx,
  classificarCategoria,
  expansaoParcelasOfx,
  fraseParcelaOfx,
  hashDedupOfx,
  jaImportada,
  parcelaDoTexto,
  parseOfx,
  transacoesDoOfx,
} from "./ofx";

const CARTAO: Cartao = {
  id: "k1",
  carteiraID: "w1",
  apelido: "Roxinho",
  banco: "Nubank",
  ultimos4: "1234",
  bandeira: "mastercard",
  cor: "grafite",
  limite: 500000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

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

describe("parcelaDoTexto", () => {
  it("lê variantes Itaú, Nubank e C6", () => {
    expect(parcelaDoTexto("MAGAZINE LUIZA PARC 3/12")).toEqual({ n: 3, m: 12 });
    expect(parcelaDoTexto("LOJA Parc. 03 de 12")).toEqual({ n: 3, m: 12 });
    expect(parcelaDoTexto("NETFLIX PARCELA 01/06")).toEqual({ n: 1, m: 6 });
    expect(parcelaDoTexto("C6 PARCELADO 4/10")).toEqual({ n: 4, m: 10 });
    expect(parcelaDoTexto("RENNER          03/12")).toEqual({ n: 3, m: 12 });
  });

  it("não trata data nem 1/1 como parcela", () => {
    expect(parcelaDoTexto("IFOOD *PIZZA NAPOLI")).toBeNull();
    expect(parcelaDoTexto("compra em 15/08")).toBeNull();
    expect(parcelaDoTexto("à vista 1/1")).toBeNull();
  });
});

describe("expansaoParcelasOfx", () => {
  it("PARC 3/12 gera 10 competências a partir da fatura da linha", () => {
    const partes = expansaoParcelasOfx("2026-09-10", 3, 12, CARTAO);
    expect(partes).toHaveLength(10);
    expect(partes[0]).toEqual({ numero: 3, data: "2026-09-10" });
    expect(partes[1]).toEqual({ numero: 4, data: "2026-10-28" });
    expect(partes[9]).toEqual({ numero: 12, data: "2027-06-28" });
    expect(partes.map((p) => p.numero)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
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

  it("PARC 3/12 lança 10 txs nas competências certas, sem inventar 1 e 2", () => {
    const { gastos } = parseOfx(FIXTURE_PARCELA_OFX);
    expect(gastos[0]).toMatchObject({ parcelaN: 3, parcelaTotal: 12, valorCentavos: 25000 });
    expect(fraseParcelaOfx(3, 12)).toBe("parcela 3/12 · lança 10 restantes");

    const txs = transacoesDoOfx({
      linhas: gastos.map((g) => ({
        descricao: g.descricao,
        valor: g.valorCentavos,
        data: g.data,
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfx("k1", g.fitId),
        parcelaN: g.parcelaN,
        parcelaTotal: g.parcelaTotal,
      })),
      carteiraID: "w1",
      cartaoID: "k1",
      cartao: CARTAO,
    });

    expect(txs).toHaveLength(10);
    expect(txs.every((t) => t.valor === 25000 && t.grupoParcela === txs[0]?.grupoParcela)).toBe(true);
    expect(txs.map((t) => t.parcelaN)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(txs.every((t) => t.parcelaTotal === 12)).toBe(true);
    expect(txs[0]?.hashDedup).toBe("ofx|k1|FIT-SOFA-3");
    expect(txs[1]?.hashDedup).toBe("ofx|k1|FIT-SOFA-3|p4de12");
    const competencias = txs.map((t) => competenciaDaCompra(new Date(t.data), CARTAO));
    expect(competencias[0]).toEqual({ ano: 2026, mes: 9 });
    expect(competencias[1]).toEqual({ ano: 2026, mes: 10 });
    expect(competencias[9]).toEqual({ ano: 2027, mes: 6 });
    expect(txs.some((t) => t.parcelaN === 1 || t.parcelaN === 2)).toBe(false);
  });

  it("PARC 1/4 gera as quatro parcelas do grupo", () => {
    const txs = transacoesDoOfx({
      linhas: [{
        descricao: "NETFLIX PARCELA 01/04",
        valor: 2000,
        data: "2026-09-10",
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfx("k1", "FIT-NET-1"),
        parcelaN: 1,
        parcelaTotal: 4,
      }],
      carteiraID: "w1",
      cartaoID: "k1",
      cartao: CARTAO,
    });
    expect(txs).toHaveLength(4);
    expect(txs.map((t) => t.parcelaN)).toEqual([1, 2, 3, 4]);
    expect(competenciaDaCompra(new Date(txs[0]!.data), CARTAO)).toEqual({ ano: 2026, mes: 9 });
    expect(competenciaDaCompra(new Date(txs[3]!.data), CARTAO)).toEqual({ ano: 2026, mes: 12 });
  });

  it("não relança o grupo se o FITID da linha atual já existe", () => {
    const { gastos } = parseOfx(FIXTURE_PARCELA_OFX);
    const linhas = gastos.map((g) => ({
      descricao: g.descricao,
      valor: g.valorCentavos,
      data: g.data,
      categoriaID: CATEGORIA_OUTROS_ID,
      hashDedup: hashDedupOfx("k1", g.fitId),
      parcelaN: g.parcelaN,
      parcelaTotal: g.parcelaTotal,
    }));
    const existentes: Transacao[] = [{
      id: "ja",
      carteiraID: "w1",
      tipo: "despesa",
      valor: 25000,
      data: "2026-09-10T15:00:00.000Z",
      descricao: "MAGAZINE LUIZA PARC 3/12",
      cartaoID: "k1",
      hashDedup: "ofx|k1|FIT-SOFA-3",
      grupoParcela: "g1",
      parcelaN: 3,
      parcelaTotal: 12,
    }];
    expect(transacoesDoOfx({
      linhas,
      carteiraID: "w1",
      cartaoID: "k1",
      cartao: CARTAO,
      existentes,
    })).toHaveLength(0);
  });
});
