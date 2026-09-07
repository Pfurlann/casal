import { describe, expect, it } from "vitest";
import type { Cartao, Categoria, Transacao } from "./domain";
import { competenciaDaCompra, dataLocalISO } from "./domain";
import { transacoesDoMes } from "./metas";
import { FIXTURE_FATURA_OFX, FIXTURE_NANQUIM_OFX, FIXTURE_PARCELA_OFX, FIXTURE_CONTA_OFX } from "./ofx-fixture";
import {
  ACCEPT_ARQUIVO_OFX,
  CATEGORIA_OUTROS_ID,
  CATEGORIA_REEMBOLSO_ID,
  CATEGORIA_SALARIO_ID,
  centavosDeOfx,
  classificarCategoria,
  classificarCategoriaOfxConta,
  classificarTipoOfx,
  classificarTipoOfxConta,
  creditoRelevanteNaFatura,
  eConteudoOfx,
  eNomeOfx,
  erroSeNaoForOfx,
  expansaoParcelasOfx,
  fraseParcelaOfx,
  dataNaCompetenciaDoExtrato,
  hashDedupOfx,
  hashDedupOfxConta,
  jaImportada,
  parcelaDoTexto,
  competenciaDoPeriodoOfx,
  parseOfx,
  parseOfxConta,
  periodoDoOfx,
  pareceCredito,
  transacoesDoOfx,
  transacoesDoOfxConta,
} from "./ofx";
import { saldoDaConta } from "./contas";
import type { Conta } from "./domain";

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

describe("accept e validador OFX", () => {
  it("usa accept amplo para o iPhone não esconder .ofx", () => {
    expect(ACCEPT_ARQUIVO_OFX).toBe("");
    expect(ACCEPT_ARQUIVO_OFX).not.toMatch(/ofx/i);
  });

  it("aceita extensão e OFXHEADER / <OFX, recusa o resto", () => {
    expect(eNomeOfx("fatura.ofx")).toBe(true);
    expect(eNomeOfx("FATURA.OFC")).toBe(true);
    expect(eNomeOfx("extrato.qfx")).toBe(true);
    expect(eNomeOfx("foto.jpg")).toBe(false);
    expect(eConteudoOfx(FIXTURE_FATURA_OFX)).toBe(true);
    expect(eConteudoOfx("<OFX><STMTTRN>")).toBe(true);
    expect(eConteudoOfx("not a bank file")).toBe(false);
    expect(erroSeNaoForOfx("sem-extensao", FIXTURE_FATURA_OFX)).toBeNull();
    expect(erroSeNaoForOfx("fatura.ofx", "lixo")).toMatch(/OFX válido/);
    expect(erroSeNaoForOfx("IMG_001.JPG", "JFIF")).toMatch(/não parece/);
  });
});

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

  it("cartão BR: compras CREDIT viram gasto; AJUSTE CRED e pagamento são crédito", () => {
    const { gastos, creditos } = parseOfx(FIXTURE_NANQUIM_OFX);
    expect(gastos.map((g) => g.descricao)).toEqual([
      "AGENOR LOGISTICA",
      "BARBEARIADOKEL VIN",
      "DELICIAS DO PADEIRO C",
      "PARK EXPRESS",
    ]);
    expect(creditos.map((c) => [c.descricao, c.valorCentavos])).toEqual([
      ["PAGAMENTO RECEBIDO", 80000],
      ["AJUSTE CRED PARC S JUROS", 4],
    ]);
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

describe("classificarTipoOfx", () => {
  it("não trata CREDIT sozinho como crédito; memo decide estorno e pagamento", () => {
    expect(classificarTipoOfx("CREDIT", 10500, "BARBEARIADOKEL VIN")).toBe("gasto");
    expect(classificarTipoOfx("CREDIT", 400, "DELICIAS DO PADEIRO C")).toBe("gasto");
    expect(classificarTipoOfx("DEBIT", -4, "AJUSTE CRED PARC S JUROS")).toBe("credito");
    expect(classificarTipoOfx("CREDIT", 80000, "PAGAMENTO RECEBIDO")).toBe("credito");
    expect(classificarTipoOfx("CREDIT", 10000, "ESTORNO IFOOD")).toBe("credito");
    expect(pareceCredito("DELICIAS DO PADEIRO C")).toBe(false);
    expect(pareceCredito("AJUSTE CRED PARC S JUROS")).toBe(true);
  });
});

describe("creditoRelevanteNaFatura", () => {
  it("inclui estorno/ajuste e exclui pagamento", () => {
    expect(creditoRelevanteNaFatura("AJUSTE CRED PARC S JUROS")).toBe(true);
    expect(creditoRelevanteNaFatura("ESTORNO IFOOD")).toBe(true);
    expect(creditoRelevanteNaFatura("PAGAMENTO RECEBIDO")).toBe(false);
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

  it("override da parcela atual não desloca o cronograma futuro", () => {
    const sem = expansaoParcelasOfx("2026-09-10", 3, 12, CARTAO);
    const com = expansaoParcelasOfx("2026-09-10", 3, 12, CARTAO, "2026-09-01");
    expect(com[0]).toEqual({ numero: 3, data: "2026-09-01" });
    expect(com.slice(1)).toEqual(sem.slice(1));
    expect(com[1]).toEqual({ numero: 4, data: "2026-10-28" });
    expect(com[9]).toEqual({ numero: 12, data: "2027-06-28" });
  });

  it("competência do extrato ancora k>n e carimba parcela n (fech=1)", () => {
    const cartao: Cartao = { ...CARTAO, diaFechamento: 1, diaVencimento: 10 };
    // DTPOSTED 01/08 → ago pelo fechamento; extrato SET (DTEND)
    expect(competenciaDaCompra(new Date(2026, 7, 1), cartao)).toEqual({ ano: 2026, mes: 8 });
    expect(dataNaCompetenciaDoExtrato("2026-08-01", { ano: 2026, mes: 9 }, cartao)).toBe("2026-09-01");
    const partes = expansaoParcelasOfx(
      "2026-08-01",
      3,
      5,
      cartao,
      undefined,
      { ano: 2026, mes: 9 },
    );
    expect(partes).toEqual([
      { numero: 3, data: "2026-09-01" },
      { numero: 4, data: "2026-10-01" },
      { numero: 5, data: "2026-11-01" },
    ]);
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
    expect(txs[0]?.hashDedup).toBe(hashDedupOfx("k1", gastos[0]!.fitId));
    expect(gastos[0]!.fitId).toContain("FIT-IFOOD-1");
    expect(gastos[0]!.fitId).toContain("|");
  });

  it("não relança o mesmo FITID+valor+memo", () => {
    const { gastos } = parseOfx(FIXTURE_FATURA_OFX);
    const hashIfood = hashDedupOfx("k1", gastos[0]!.fitId);
    const existentes: Transacao[] = [
      {
        id: "ja",
        carteiraID: "w1",
        tipo: "despesa",
        valor: 4590,
        data: "2026-08-15T15:00:00.000Z",
        descricao: "IFOOD *PIZZA NAPOLI",
        cartaoID: "k1",
        hashDedup: hashIfood,
        parcelaN: 1,
        parcelaTotal: 1,
      },
    ];
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
    expect(txs.some((t) => t.hashDedup === hashIfood)).toBe(false);
    expect(jaImportada(existentes, hashIfood)).toBe(true);
  });

  it("PARC 3/12 lança 10 txs nas competências certas, sem inventar 1 e 2", () => {
    const { gastos, periodo } = parseOfx(FIXTURE_PARCELA_OFX);
    expect(gastos[0]).toMatchObject({ parcelaN: 3, parcelaTotal: 12, valorCentavos: 25000 });
    expect(fraseParcelaOfx(3, 12)).toBe("parcela 3/12 · lança 10 restantes");
    expect(periodo).toEqual({ inicio: "2026-09-01", fim: "2026-09-28" });
    expect(competenciaDoPeriodoOfx(periodo)).toEqual({ ano: 2026, mes: 9 });

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
      competenciaExtrato: competenciaDoPeriodoOfx(periodo),
    });

    expect(txs).toHaveLength(10);
    expect(txs.every((t) => t.valor === 25000 && t.grupoParcela === txs[0]?.grupoParcela)).toBe(true);
    expect(txs.map((t) => t.parcelaN)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(txs.every((t) => t.parcelaTotal === 12)).toBe(true);
    expect(txs[0]?.hashDedup).toBe(hashDedupOfx("k1", gastos[0]!.fitId));
    expect(txs[1]?.hashDedup).toBe(`${hashDedupOfx("k1", gastos[0]!.fitId)}|p4de12`);
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
        hashDedup: hashDedupOfx("k1", "FIT-NET-1|2000|netflix parcela 01/04"),
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

  it("dataOverride só na parcela atual — futuras ancoradas no OFX original", () => {
    const base = transacoesDoOfx({
      linhas: [{
        descricao: "MAGAZINE LUIZA PARC 3/12",
        valor: 25000,
        data: "2026-09-10",
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfx("k1", "FIT-SOFA-OV"),
        parcelaN: 3,
        parcelaTotal: 12,
      }],
      carteiraID: "w1",
      cartaoID: "k1",
      cartao: CARTAO,
    });
    const comOverride = transacoesDoOfx({
      linhas: [{
        descricao: "MAGAZINE LUIZA PARC 3/12",
        valor: 25000,
        data: "2026-09-10",
        dataOverride: "2026-09-01",
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfx("k1", "FIT-SOFA-OV2"),
        parcelaN: 3,
        parcelaTotal: 12,
      }],
      carteiraID: "w1",
      cartaoID: "k1",
      cartao: CARTAO,
    });
    expect(comOverride).toHaveLength(10);
    expect(dataLocalISO(new Date(comOverride[0]!.data))).toBe("2026-09-01");
    expect(dataLocalISO(new Date(base[0]!.data))).toBe("2026-09-10");
    for (let i = 1; i < 10; i++) {
      expect(comOverride[i]!.data).toBe(base[i]!.data);
      expect(comOverride[i]!.parcelaN).toBe(base[i]!.parcelaN);
    }
    const comps = comOverride.map((t) => competenciaDaCompra(new Date(t.data), CARTAO));
    expect(comps[1]).toEqual({ ano: 2026, mes: 10 });
    expect(comps[9]).toEqual({ ano: 2027, mes: 6 });
  });

  it("carimba linha atual na competência do extrato (fech=1, DTPOSTED em ago → set)", () => {
    const cartao: Cartao = { ...CARTAO, id: "fech1", diaFechamento: 1, diaVencimento: 10 };
    const ofx = `
      <BANKTRANLIST>
      <DTSTART>20260802
      <DTEND>20260901
      <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20260801
      <TRNAMT>-100.00
      <FITID>FIT-FECH1
      <MEMO>LOJA PARC 2/4
      </STMTTRN>
      </BANKTRANLIST>
    `;
    const { gastos, periodo } = parseOfx(ofx);
    expect(competenciaDoPeriodoOfx(periodo)).toEqual({ ano: 2026, mes: 9 });
    expect(competenciaDaCompra(new Date(gastos[0]!.data + "T12:00:00"), cartao)).toEqual({
      ano: 2026,
      mes: 8,
    });
    const txs = transacoesDoOfx({
      linhas: gastos.map((g) => ({
        descricao: g.descricao,
        valor: g.valorCentavos,
        data: g.data,
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfx("fech1", g.fitId),
        parcelaN: g.parcelaN,
        parcelaTotal: g.parcelaTotal,
      })),
      carteiraID: "w1",
      cartaoID: "fech1",
      cartao,
      competenciaExtrato: competenciaDoPeriodoOfx(periodo),
    });
    // 2/4 → set + out + nov
    expect(txs).toHaveLength(3);
    expect(txs.map((t) => t.parcelaN)).toEqual([2, 3, 4]);
    const comps = txs.map((t) => competenciaDaCompra(new Date(t.data), cartao));
    expect(comps).toEqual([
      { ano: 2026, mes: 9 },
      { ano: 2026, mes: 10 },
      { ano: 2026, mes: 11 },
    ]);
  });

  it("não relança se o hash FITID+valor+memo já existe", () => {
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
      hashDedup: hashDedupOfx("k1", gastos[0]!.fitId),
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

  it("FITID repetido com memo/valor diferentes não colide", () => {
    const ofx = `
      <BANKTRANLIST>
      <DTSTART>20260801
      <DTEND>20260828
      <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20260810
      <TRNAMT>-10.00
      <FITID>NU-DUP
      <MEMO>LOJA A
      </STMTTRN>
      <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20260811
      <TRNAMT>-20.00
      <FITID>NU-DUP
      <MEMO>LOJA B
      </STMTTRN>
      </BANKTRANLIST>
    `;
    const { gastos, periodo } = parseOfx(ofx);
    expect(periodo).toEqual({ inicio: "2026-08-01", fim: "2026-08-28" });
    expect(gastos).toHaveLength(2);
    expect(gastos[0]!.fitId).not.toBe(gastos[1]!.fitId);
    expect(gastos[0]!.fitId.startsWith("NU-DUP|")).toBe(true);
  });

  it("crédito de OFX vira abatimento da fatura", () => {
    const txs = transacoesDoOfx({
      linhas: [{
        descricao: "AJUSTE CRED PARC S JUROS",
        valor: 4,
        data: "2026-09-02",
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfx("k1", "FIT-AJUSTE"),
        tipo: "credito",
      }],
      carteiraID: "w1",
      cartaoID: "k1",
      cartao: CARTAO,
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]?.tipo).toBe("despesa");
    expect(txs[0]?.valor).toBe(-4);
  });

  it("compra CREDIT do OFX com categoria custom entra no mês da fatura", () => {
    const nanquim: Cartao = { ...CARTAO, id: "nan", diaFechamento: 7, diaVencimento: 15 };
    const txs = transacoesDoOfx({
      linhas: [{
        descricao: "PARK EXPRESS",
        valor: 4000,
        data: "2026-08-25",
        categoriaID: "cat-pet",
        hashDedup: hashDedupOfx("nan", "20260825-park"),
      }],
      carteiraID: "w1",
      cartaoID: "nan",
      cartao: nanquim,
    });
    expect(txs[0]?.categoriaID).toBe("cat-pet");
    expect(transacoesDoMes(txs, { ano: 2026, mes: 9 }, [nanquim])).toHaveLength(1);
    expect(transacoesDoMes(txs, { ano: 2026, mes: 8 }, [nanquim])).toHaveLength(0);
  });
});

describe("OFX de conta bancária", () => {
  const CONTA: Conta = {
    id: "cta1",
    carteiraID: "w1",
    nome: "Nubank",
    tipo: "corrente",
    saldoInicial: 100000,
    arquivada: false,
  };

  it("classifica pelo sinal bancário, sem inverter CREDIT como cartão", () => {
    expect(classificarTipoOfxConta("DEBIT", -8990, "IFOOD")).toBe("gasto");
    expect(classificarTipoOfxConta("CREDIT", 520000, "SALARIO")).toBe("credito");
    expect(classificarTipoOfx("CREDIT", 4000, "PARK EXPRESS")).toBe("gasto");
    expect(classificarTipoOfxConta("CREDIT", 4000, "PARK EXPRESS")).toBe("credito");
  });

  it("parseOfxConta separa débitos e créditos pelo sinal", () => {
    const { gastos, creditos } = parseOfxConta(FIXTURE_CONTA_OFX);
    expect(gastos).toHaveLength(2);
    expect(creditos).toHaveLength(2);
    expect(gastos.map((g) => g.valorCentavos)).toEqual([8990, 25000]);
    expect(creditos.map((c) => c.valorCentavos)).toEqual([520000, 4500]);
    expect(gastos[0]?.descricao).toMatch(/IFOOD/);
    expect(creditos[0]?.descricao).toMatch(/SALARIO/);
  });

  it("não muda o parse de cartão no mesmo arquivo de fatura", () => {
    const cartao = parseOfx(FIXTURE_FATURA_OFX);
    const conta = parseOfxConta(FIXTURE_FATURA_OFX);
    expect(cartao.gastos).toHaveLength(3);
    expect(cartao.creditos).toHaveLength(1);
    // No extrato de conta, CREDIT positivo vira crédito (não gasto BR).
    expect(conta.gastos).toHaveLength(3);
    expect(conta.creditos).toHaveLength(1);
    expect(conta.creditos[0]?.fitId.startsWith("FIT-PAGTO-4|")).toBe(true);
  });

  it("categoria de conta: despesa pelas regras, crédito → salário/reembolso", () => {
    expect(classificarCategoriaOfxConta("IFOOD *X", "gasto")).toBe("00000000-0000-0000-0000-000000000002");
    expect(classificarCategoriaOfxConta("SALARIO EMPRESA", "credito")).toBe(CATEGORIA_SALARIO_ID);
    expect(classificarCategoriaOfxConta("ESTORNO TAXA", "credito")).toBe(CATEGORIA_REEMBOLSO_ID);
  });

  it("materializa 1:1 liquidado na conta, sem cartão nem parcelas", () => {
    const { gastos, creditos } = parseOfxConta(FIXTURE_CONTA_OFX);
    const linhas = [...gastos, ...creditos].map((g) => ({
      descricao: g.descricao,
      valor: g.valorCentavos,
      data: g.data,
      categoriaID: classificarCategoriaOfxConta(g.descricao, g.tipo),
      hashDedup: hashDedupOfxConta("cta1", g.fitId),
      tipo: g.tipo,
    }));
    const txs = transacoesDoOfxConta({
      linhas,
      carteiraID: "w1",
      contaID: "cta1",
      pagadorID: "u1",
    });
    expect(txs).toHaveLength(4);
    expect(txs.every((t) => t.status === "liquidado" && t.contaID === "cta1" && !t.cartaoID)).toBe(true);
    expect(txs.filter((t) => t.tipo === "despesa")).toHaveLength(2);
    expect(txs.filter((t) => t.tipo === "receita")).toHaveLength(2);
    expect(txs.every((t) => t.parcelaN === 1 && t.parcelaTotal === 1 && !t.grupoParcela)).toBe(true);
    expect(txs[0]?.hashDedup).toBe(hashDedupOfxConta("cta1", gastos[0]!.fitId));
  });

  it("dedup por hash da conta e atualiza saldo", () => {
    const { gastos } = parseOfxConta(FIXTURE_CONTA_OFX);
    const linha = {
      descricao: gastos[0]!.descricao,
      valor: gastos[0]!.valorCentavos,
      data: gastos[0]!.data,
      categoriaID: CATEGORIA_OUTROS_ID,
      hashDedup: hashDedupOfxConta("cta1", gastos[0]!.fitId),
      tipo: "gasto" as const,
    };
    const primeiras = transacoesDoOfxConta({
      linhas: [linha],
      carteiraID: "w1",
      contaID: "cta1",
    });
    expect(primeiras).toHaveLength(1);
    const deNovo = transacoesDoOfxConta({
      linhas: [linha],
      carteiraID: "w1",
      contaID: "cta1",
      existentes: primeiras,
    });
    expect(deNovo).toHaveLength(0);
    expect(jaImportada(primeiras, primeiras[0]!.hashDedup)).toBe(true);
    // 1000,00 − 89,90
    expect(saldoDaConta(CONTA, primeiras)).toBe(100000 - 8990);
  });

  it("PARC no extrato de conta não expande competências de cartão", () => {
    const { gastos } = parseOfxConta(FIXTURE_PARCELA_OFX);
    const txs = transacoesDoOfxConta({
      linhas: gastos.map((g) => ({
        descricao: g.descricao,
        valor: g.valorCentavos,
        data: g.data,
        categoriaID: CATEGORIA_OUTROS_ID,
        hashDedup: hashDedupOfxConta("cta1", g.fitId),
        tipo: g.tipo,
        parcelaN: g.parcelaN,
        parcelaTotal: g.parcelaTotal,
      })),
      carteiraID: "w1",
      contaID: "cta1",
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]?.parcelaTotal).toBe(1);
  });
});
