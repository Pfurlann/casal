import { describe, expect, it } from "vitest";
import type { Cartao, Compromisso, Conta, Meta, Transacao } from "./domain";
import {
  acimaDoLimite,
  cartoesDoPeriodo,
  evolucaoDeGastos,
  fraseDiagnostico,
  gastosPorCategoria,
  montarDiagnostico,
  percentualInteiro,
  problemasDoPeriodo,
  saldoDasContas,
  totaisDoMes,
} from "./diagnostico";

const C = { ano: 2026, mes: 9 };
const AGORA = new Date(2026, 8, 15, 12);

function tx(parcial: Partial<Transacao> = {}): Transacao {
  return {
    id: parcial.id ?? crypto.randomUUID(),
    carteiraID: "w1",
    tipo: "despesa",
    valor: 10_000,
    data: "2026-09-10T15:00:00.000Z",
    descricao: "feira",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

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

const CONTA: Conta = {
  id: "a1",
  carteiraID: "w1",
  nome: "Corrente",
  tipo: "corrente",
  saldoInicial: 250_000,
  arquivada: false,
};

describe("percentualInteiro", () => {
  it("trunca em pontos percentuais sem float de dinheiro", () => {
    expect(percentualInteiro(112_000, 100_000)).toBe(112);
    expect(percentualInteiro(12_000, 100_000)).toBe(12);
    expect(percentualInteiro(1, 100_000)).toBe(0);
  });

  it("não divide por zero", () => {
    expect(percentualInteiro(50_000, 0)).toBe(0);
    expect(percentualInteiro(50_000, -10)).toBe(0);
  });
});

describe("acimaDoLimite", () => {
  it("alerta em 80% com comparação inteira", () => {
    expect(acimaDoLimite(79_999, 100_000)).toBe(false);
    expect(acimaDoLimite(80_000, 100_000)).toBe(true);
    expect(acimaDoLimite(800_000, 1_000_000)).toBe(true);
  });

  it("ignora cartão sem limite", () => {
    expect(acimaDoLimite(10_000, 0)).toBe(false);
  });
});

describe("totaisDoMes", () => {
  it("soma receita e despesa em centavos e ignora transferência", () => {
    const lista = [
      tx({ id: "r", tipo: "receita", valor: 500_000 }),
      tx({ id: "d1", valor: 80_000 }),
      tx({ id: "d2", valor: 40_000 }),
      tx({ id: "x", tipo: "transferencia", valor: 10_000 }),
      tx({ id: "old", valor: 99_000, data: "2026-08-10T15:00:00.000Z" }),
    ];
    expect(totaisDoMes(lista, C)).toEqual({ gasto: 120_000, receita: 500_000, fluxo: 380_000 });
  });

  it("fluxo negativo quando o gasto passa a receita", () => {
    expect(
      totaisDoMes(
        [tx({ tipo: "receita", valor: 100_000 }), tx({ id: "d", valor: 112_000 })],
        C,
      ),
    ).toEqual({ gasto: 112_000, receita: 100_000, fluxo: -12_000 });
  });
  it("nao dobra compra no cartao com total da fatura nem pagamento", () => {
    const compra = tx({ id: "c", valor: 200_000, cartaoID: "k1", hashDedup: "ofx|k1|compra", data: "2026-09-08T15:00:00.000Z" });
    const totalFatura = tx({ id: "f", valor: 200_000, cartaoID: "k1", hashDedup: "fatura|k1|2026-09", data: "2026-09-07T15:00:00.000Z" });
    const pagamento = tx({ id: "p", tipo: "transferencia", valor: 200_000, contaID: "a1", hashDedup: "pagamento|f1|200000", data: "2026-09-15T15:00:00.000Z" });
    const conta = tx({ id: "d", valor: 50_000, contaID: "a1", hashDedup: "ofx|a1|ifood" });
    expect(totaisDoMes([compra, totalFatura, pagamento, conta], C, [CARTAO])).toEqual({ gasto: 250_000, receita: 0, fluxo: -250_000 });
  });
});

describe("saldoDasContas", () => {
  it("soma só contas ativas em centavos", () => {
    expect(
      saldoDasContas([
        CONTA,
        { ...CONTA, id: "a2", saldoInicial: 50_000 },
        { ...CONTA, id: "a3", saldoInicial: 10_000, arquivada: true },
      ]),
    ).toBe(300_000);
  });

  it("o saldo das contas acompanha receita e despesa liquidada", () => {
    expect(
      saldoDasContas(
        [CONTA],
        [
          tx({ id: "r", tipo: "receita", valor: 20_000, contaID: CONTA.id, status: "liquidado" }),
          tx({ id: "d", valor: 5_000, contaID: CONTA.id, status: "liquidado" }),
        ],
      ),
    ).toBe(265_000);
  });

  it("omite o saldo quando não há conta", () => {
    expect(saldoDasContas([])).toBeUndefined();
    expect(saldoDasContas([{ ...CONTA, arquivada: true }])).toBeUndefined();
  });
});

describe("gastosPorCategoria", () => {
  it("agrupa despesa do mês e ordena pelo maior", () => {
    const lista = [
      tx({ id: "m1", valor: 30_000, categoriaID: "00000000-0000-0000-0000-000000000001" }),
      tx({ id: "m2", valor: 20_000, categoriaID: "00000000-0000-0000-0000-000000000001" }),
      tx({ id: "r", valor: 15_000, categoriaID: "00000000-0000-0000-0000-000000000002" }),
      tx({ id: "rec", tipo: "receita", valor: 80_000, categoriaID: "00000000-0000-0000-0000-000000000013" }),
    ];
    expect(gastosPorCategoria(lista, undefined, C)).toEqual([
      { categoriaID: "00000000-0000-0000-0000-000000000001", nome: "Mercado", total: 50_000 },
      { categoriaID: "00000000-0000-0000-0000-000000000002", nome: "Restaurante", total: 15_000 },
    ]);
  });
});

describe("cartoesDoPeriodo", () => {
  it("separa fatura do mês e comprometido (saldo devedor)", () => {
    const compra = tx({
      id: "c",
      valor: 200_000,
      cartaoID: "k1",
      data: "2026-09-08T15:00:00.000Z",
    });
    const [d] = cartoesDoPeriodo(
      [CARTAO],
      [{
        id: "f1",
        cartaoID: "k1",
        ano: 2026,
        mes: 9,
        fechaEm: "2026-09-28",
        venceEm: "2026-10-05",
        status: "parcial",
        valorPago: 50_000,
      }],
      [compra],
      AGORA,
    );
    expect(d?.fatura).toBe(200_000);
    expect(d?.comprometido).toBe(150_000);
    expect(d?.usadoX100).toBe(20);
  });
});

describe("evolucaoDeGastos", () => {
  it("cobre os últimos 6 meses em centavos, mês vazio com zero", () => {
    const lista = [
      tx({ id: "set", valor: 40_000, data: "2026-09-10T12:00:00.000Z" }),
      tx({ id: "ago", valor: 25_000, data: "2026-08-10T12:00:00.000Z" }),
    ];
    const ev = evolucaoDeGastos(lista, C, 6);
    expect(ev).toHaveLength(6);
    expect(ev[0]?.rotulo).toBe("abr");
    expect(ev[4]).toMatchObject({ rotulo: "ago", gasto: 25_000 });
    expect(ev[5]).toMatchObject({ rotulo: "set", gasto: 40_000 });
    expect(ev[1]?.gasto).toBe(0);
  });
});

describe("problemasDoPeriodo", () => {
  const teto: Meta = {
    id: "m-teto",
    carteiraID: "w1",
    tipo: "teto_categoria",
    nome: "Mercado",
    valorAlvo: 50_000,
    categoriaID: "00000000-0000-0000-0000-000000000001",
    periodo: "mensal",
    ativa: true,
  };

  it("marca teto estourado em centavos", () => {
    const problemas = problemasDoPeriodo({
      transacoes: [tx({ valor: 62_000, categoriaID: teto.categoriaID })],
      categorias: [],
      cartoes: [],
      faturas: [],
      contas: [],
      metas: [teto],
      compromissos: [],
      agora: AGORA,
    });
    expect(problemas.some((x) => x.tipo === "teto_estourado" && x.valor === 12_000)).toBe(true);
  });

  it("marca compromisso a pagar vencido", () => {
    const comp: Compromisso = {
      id: "c1",
      carteiraID: "w1",
      nome: "Luz",
      valor: 18_000,
      venceEm: "2026-09-01",
      categoriaID: "00000000-0000-0000-0000-000000000005",
      transacaoID: "tx-luz",
      status: "a_pagar",
    };
    const problemas = problemasDoPeriodo({
      transacoes: [],
      cartoes: [],
      faturas: [],
      contas: [],
      metas: [],
      compromissos: [comp],
      agora: AGORA,
    });
    expect(problemas).toEqual([
      expect.objectContaining({ tipo: "a_pagar_vencido", titulo: "Luz", valor: 18_000 }),
    ]);
  });

  it("marca envelope comido quando o gasto da reserva come o livre", () => {
    const viagem: Meta = {
      id: "m-viagem",
      carteiraID: "w1",
      tipo: "objetivo",
      nome: "Viagem",
      valorAlvo: 200_000,
      periodo: "longo_prazo",
      ativa: true,
      contaID: "a1",
      alocado: 80_000,
    };
    const problemas = problemasDoPeriodo({
      transacoes: [],
      cartoes: [],
      faturas: [],
      contas: [{ ...CONTA, saldoInicial: 50_000 }],
      metas: [viagem],
      compromissos: [],
      agora: AGORA,
    });
    expect(problemas.some((x) => x.tipo === "envelope_comido" && x.valor === 30_000)).toBe(true);
  });

  it("marca envelope comido pelo gasto com metaID no mês", () => {
    const viagem: Meta = {
      id: "m-viagem",
      carteiraID: "w1",
      tipo: "objetivo",
      nome: "Viagem",
      valorAlvo: 200_000,
      periodo: "longo_prazo",
      ativa: true,
      contaID: "a1",
      alocado: 50_000,
    };
    const problemas = problemasDoPeriodo({
      transacoes: [tx({ valor: 20_000, metaID: "m-viagem", contaID: "a1" })],
      cartoes: [],
      faturas: [],
      contas: [CONTA],
      metas: [viagem],
      compromissos: [],
      agora: AGORA,
    });
    expect(problemas.some((x) => x.tipo === "envelope_comido" && x.valor === 20_000)).toBe(true);
  });

  it("marca cartão em 80% do limite", () => {
    const problemas = problemasDoPeriodo({
      transacoes: [tx({ valor: 800_000, cartaoID: "k1" })],
      cartoes: [CARTAO],
      faturas: [],
      contas: [],
      metas: [],
      compromissos: [],
      agora: AGORA,
    });
    expect(problemas.some((x) => x.tipo === "cartao_perto_do_limite")).toBe(true);
  });
});

describe("fraseDiagnostico", () => {
  it("diz o quanto os gastos passam a receita e cita o teto", () => {
    expect(
      fraseDiagnostico({
        gasto: 112_000,
        receita: 100_000,
        problemas: [{ tipo: "teto_estourado", titulo: "Mercado no teto", detalhe: "" }],
      }),
    ).toBe("gastos 12% acima da receita; Mercado no teto");
  });

  it("celebra sobra quando o mês fecha no azul", () => {
    expect(fraseDiagnostico({ gasto: 80_000, receita: 100_000, problemas: [] })).toBe(
      "sobra 20% da receita",
    );
  });
});

describe("montarDiagnostico", () => {
  it("monta o retrato do mês sem float", () => {
    const d = montarDiagnostico({
      transacoes: [
        tx({ id: "r", tipo: "receita", valor: 100_000 }),
        tx({ id: "d", valor: 112_000, categoriaID: "00000000-0000-0000-0000-000000000001" }),
      ],
      cartoes: [],
      faturas: [],
      contas: [CONTA],
      metas: [],
      compromissos: [],
      agora: AGORA,
    });
    expect(d.gasto).toBe(112_000);
    expect(d.receita).toBe(100_000);
    expect(d.fluxo).toBe(-12_000);
    expect(d.saldoContas).toBe(250_000);
    expect(d.frase).toBe("gastos 12% acima da receita");
    expect(d.categorias[0]?.nome).toBe("Mercado");
    expect(d.evolucao).toHaveLength(6);
  });
});

describe("totaisDoMes após deleção", () => {
  it("reflete transações removidas do array", () => {
    const t1 = tx({ id: "t1", valor: 100_000, cartaoID: "k1", hashDedup: "ofx|k1|compra1", data: "2026-09-08T15:00:00.000Z" });
    const t2 = tx({ id: "t2", valor: 50_000, cartaoID: "k1", hashDedup: "ofx|k1|compra2", data: "2026-09-10T15:00:00.000Z" });
    const t3 = tx({ id: "t3", valor: 30_000, cartaoID: "k1", hashDedup: "ofx|k1|compra3", data: "2026-09-12T15:00:00.000Z" });
    
    const antes = [t1, t2, t3];
    const depois = antes.filter((t) => t.id !== "t2");
    
    expect(totaisDoMes(antes, C, [CARTAO])).toEqual({ gasto: 180_000, receita: 0, fluxo: -180_000 });
    expect(totaisDoMes(depois, C, [CARTAO])).toEqual({ gasto: 130_000, receita: 0, fluxo: -130_000 });
  });

  it("NUNCA dobra compras no cartão com fatura — conta UMA vez (via lançamentos)", () => {
    const compra1 = tx({ id: "c1", valor: 100_000, cartaoID: "k1", hashDedup: "ofx|k1|compra1", data: "2026-09-08T15:00:00.000Z" });
    const compra2 = tx({ id: "c2", valor: 50_000, cartaoID: "k1", hashDedup: "ofx|k1|compra2", data: "2026-09-10T15:00:00.000Z" });
    const fatura = tx({ id: "f", valor: 150_000, cartaoID: "k1", hashDedup: "fatura|k1|2026-09", data: "2026-09-28T15:00:00.000Z" });
    
    const antes = [compra1, compra2, fatura];
    const depois = antes.filter((t) => t.id !== "c2");
    
    expect(totaisDoMes(antes, C, [CARTAO])).toEqual({ gasto: 150_000, receita: 0, fluxo: -150_000 });
    expect(totaisDoMes(depois, C, [CARTAO])).toEqual({ gasto: 100_000, receita: 0, fluxo: -100_000 });
  });

  it("fatura desatualizada (valor antigo) NÃO contamina o total — só compras contam", () => {
    const compra1 = tx({ id: "c1", valor: 100_000, cartaoID: "k1", hashDedup: "ofx|k1|compra1", data: "2026-09-08T15:00:00.000Z" });
    const faturaDesatualizada = tx({ id: "f", valor: 200_000, cartaoID: "k1", hashDedup: "fatura|k1|2026-09", data: "2026-09-28T15:00:00.000Z" });
    
    const transacoes = [compra1, faturaDesatualizada];
    
    expect(totaisDoMes(transacoes, C, [CARTAO])).toEqual({ gasto: 100_000, receita: 0, fluxo: -100_000 });
  });

  it("após deletar TODAS as compras, total é ZERO mesmo com fatura antiga no array", () => {
    const faturaAntiga = tx({ id: "f", valor: 150_000, cartaoID: "k1", hashDedup: "fatura|k1|2026-09", data: "2026-09-28T15:00:00.000Z" });
    
    const transacoes = [faturaAntiga];
    
    expect(totaisDoMes(transacoes, C, [CARTAO])).toEqual({ gasto: 0, receita: 0, fluxo: 0 });
  });
});
