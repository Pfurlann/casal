import { describe, expect, it } from "vitest";
import type { Cartao, Conta, Meta, Transacao } from "./domain";
import {
  alocarNaMeta,
  alocadoNaConta,
  aplicarGastoNaReserva,
  economiaDoMes,
  folgaDoPeriodo,
  fraseEconomia,
  fraseReserva,
  fraseTeto,
  gastoDaCategoria,
  opcoesContaComReserva,
  progressoTeto,
  rotuloContaComReserva,
  saldoLivre,
  tetoDaCategoria,
  transacoesDoMes,
  validarAlocacao,
  validarMeta,
} from "./metas";

const C = { ano: 2026, mes: 9 };

const TETO: Meta = {
  id: "m1",
  carteiraID: "w1",
  tipo: "teto_categoria",
  nome: "Mercado",
  valorAlvo: 50_000,
  categoriaID: "cat-mercado",
  periodo: "mensal",
  ativa: true,
};

function tx(parcial: Partial<Transacao> = {}): Transacao {
  return {
    id: "t1",
    carteiraID: "w1",
    tipo: "despesa",
    valor: 10_000,
    data: "2026-09-10T15:00:00.000Z",
    categoriaID: "cat-mercado",
    descricao: "feira",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

describe("transacoesDoMes", () => {
  it("inclui gasto em categoria custom do mês e omite outro mês", () => {
    const lista = [
      tx({
        id: "be",
        valor: 10_500,
        categoriaID: "966ee5dd-4382-42fe-bd8c-1c009faddac0",
        descricao: "Barbearia do Kelvin",
        data: "2026-09-03T15:00:00.000Z",
      }),
      tx({
        id: "ago",
        valor: 10_500,
        categoriaID: "966ee5dd-4382-42fe-bd8c-1c009faddac0",
        descricao: "Barbearia agosto",
        data: "2026-08-05T15:00:00.000Z",
      }),
      tx({ id: "x", tipo: "transferencia", valor: 1_000 }),
    ];
    const doMes = transacoesDoMes(lista, C);
    expect(doMes.map((t) => t.id)).toEqual(["be"]);
    expect(doMes[0]?.categoriaID).toBe("966ee5dd-4382-42fe-bd8c-1c009faddac0");
    expect(transacoesDoMes(lista, { ano: 2026, mes: 8 }).map((t) => t.id)).toEqual(["ago"]);
  });

  it("compra OFX no cartão aparece no mês da competência da fatura, com categoria custom", () => {
    const nanquim: Cartao = {
      id: "6474d2f6-56ef-42a7-859e-3a2bca2cfdda",
      carteiraID: "w1",
      apelido: "Nanquim",
      banco: "Caixa",
      ultimos4: "4687",
      bandeira: "mastercard",
      cor: "grafite",
      limite: 1_000_000,
      diaFechamento: 7,
      diaVencimento: 15,
      arquivado: false,
    };
    const bemEstar = "966ee5dd-4382-42fe-bd8c-1c009faddac0";
    const lista = [
      tx({
        id: "ofx-set",
        valor: 4_000,
        categoriaID: bemEstar,
        descricao: "PARK EXPRESS",
        data: "2026-08-25T15:00:00.000Z",
        cartaoID: nanquim.id,
        hashDedup: "ofx|nanquim|park",
      }),
      tx({
        id: "ofx-ago",
        valor: 10_500,
        categoriaID: bemEstar,
        descricao: "BARBEARIADOKEL VIN",
        data: "2026-08-05T15:00:00.000Z",
        cartaoID: nanquim.id,
        hashDedup: "ofx|nanquim|barbe",
      }),
    ];
    expect(transacoesDoMes(lista, C, [nanquim]).map((t) => t.id)).toEqual(["ofx-set"]);
    expect(transacoesDoMes(lista, { ano: 2026, mes: 8 }, [nanquim]).map((t) => t.id)).toEqual(["ofx-ago"]);
  });
});

describe("gastoDaCategoria", () => {
  it("soma só despesa da categoria no mês", () => {
    const lista = [
      tx({ id: "a", valor: 12_000 }),
      tx({ id: "b", valor: 8_000 }),
      tx({ id: "c", valor: 5_000, categoriaID: "outra" }),
      tx({ id: "d", valor: 9_000, tipo: "receita" }),
      tx({ id: "e", valor: 7_000, tipo: "transferencia" }),
      tx({ id: "f", valor: 3_000, data: "2026-08-10T15:00:00.000Z" }),
    ];
    expect(gastoDaCategoria(lista, "cat-mercado", C)).toBe(20_000);
  });
});

describe("economiaDoMes", () => {
  it("é receita menos despesa e ignora transferência", () => {
    const lista = [
      tx({ id: "r", tipo: "receita", valor: 100_000 }),
      tx({ id: "d", tipo: "despesa", valor: 40_000 }),
      tx({ id: "x", tipo: "transferencia", valor: 10_000 }),
    ];
    expect(economiaDoMes(lista, C)).toBe(60_000);
  });
});

describe("progressoTeto / fraseTeto", () => {
  it("alerta em 80% e estoura ao passar", () => {
    expect(progressoTeto(50_000, 10_000).faixa).toBe("folga");
    expect(progressoTeto(50_000, 40_000).faixa).toBe("alerta");
    expect(progressoTeto(50_000, 50_000).faixa).toBe("estouro");
    expect(progressoTeto(50_000, 60_000).faixa).toBe("estouro");
  });

  it("diz o que sobra ou o quanto estourou, sem exclamação", () => {
    expect(fraseTeto(progressoTeto(50_000, 16_000), "Mercado")).toBe(
      "Sobram R$ 340,00 no teto de Mercado.",
    );
    expect(fraseTeto(progressoTeto(50_000, 50_000), "Mercado")).toBe("Chegou no teto de Mercado.");
    expect(fraseTeto(progressoTeto(50_000, 62_000), "Mercado")).toBe(
      "Estourou o teto de Mercado em R$ 120,00.",
    );
  });
});

describe("fraseEconomia", () => {
  it("mede o hábito contra o alvo", () => {
    expect(fraseEconomia(80_000, 100_000)).toBe("Faltam R$ 200,00 para a economia do mês.");
    expect(fraseEconomia(100_000, 100_000)).toBe("A economia do mês bateu a meta.");
  });
});

describe("folgaDoPeriodo", () => {
  it("fica indefinida sem meta — a marca respira largo", () => {
    expect(folgaDoPeriodo([], [tx()])).toBeUndefined();
  });

  it("é a sobra dos tetos sobre o previsto", () => {
    const gasto = [tx({ valor: 20_000 })];
    expect(folgaDoPeriodo([TETO], gasto, C)).toBeCloseTo(0.6);
    expect(folgaDoPeriodo([TETO], [tx({ valor: 50_000 })], C)).toBe(0);
    expect(folgaDoPeriodo([TETO], [tx({ valor: 60_000 })], C)).toBeCloseTo(-0.2);
  });

  it("sem teto, usa a economia do mês", () => {
    const eco: Meta = { ...TETO, id: "e1", tipo: "economia_mensal", categoriaID: undefined, valorAlvo: 100_000 };
    expect(
      folgaDoPeriodo([eco], [tx({ tipo: "receita", valor: 40_000 })], C),
    ).toBeCloseTo(0.4);
  });
});

describe("tetoDaCategoria", () => {
  it("acha o teto ativo da categoria", () => {
    expect(tetoDaCategoria([TETO], "cat-mercado")?.id).toBe("m1");
    expect(tetoDaCategoria([{ ...TETO, ativa: false }], "cat-mercado")).toBeUndefined();
  });
});

describe("validarMeta", () => {
  it("exige valor, categoria no teto e não duplica", () => {
    expect(validarMeta({ tipo: "teto_categoria", nome: "", valorAlvo: 0, outras: [] })).toMatch(/valor/);
    expect(validarMeta({ tipo: "teto_categoria", nome: "", valorAlvo: 100, outras: [] })).toMatch(/categoria/);
    expect(
      validarMeta({
        tipo: "teto_categoria",
        nome: "Mercado",
        valorAlvo: 100,
        categoriaID: "cat-mercado",
        outras: [TETO],
      }),
    ).toMatch(/já tem teto/);
    expect(
      validarMeta({
        tipo: "teto_categoria",
        nome: "Mercado",
        valorAlvo: 100,
        categoriaID: "cat-mercado",
        outras: [TETO],
        id: TETO.id,
      }),
    ).toBeNull();
    expect(
      validarMeta({ tipo: "economia_mensal", nome: "", valorAlvo: 100, outras: [] }),
    ).toBeNull();
    expect(validarMeta({ tipo: "objetivo", nome: "", valorAlvo: 100, outras: [] })).toMatch(/nome/);
    expect(validarMeta({ tipo: "objetivo", nome: "Viagem", valorAlvo: 100, outras: [] })).toBeNull();
  });
});

const VIAGEM: Meta = {
  id: "v1",
  carteiraID: "w1",
  tipo: "objetivo",
  nome: "Viagem",
  valorAlvo: 200_000,
  periodo: "longo_prazo",
  ativa: true,
  contaID: "a1",
  alocado: 80_000,
};

const CORRENTE: Conta = {
  id: "a1",
  carteiraID: "w1",
  nome: "Corrente",
  tipo: "corrente",
  saldoInicial: 300_000,
  arquivada: false,
};

describe("envelope / alocar", () => {
  it("reserva na conta sem criar transferência", () => {
    const livreAntes = saldoLivre(CORRENTE.saldoInicial, [VIAGEM], "a1");
    expect(livreAntes).toBe(220_000);
    const atualizada = alocarNaMeta(VIAGEM, 150_000, 220_000 + 80_000);
    expect(atualizada.alocado).toBe(150_000);
    expect(saldoLivre(CORRENTE.saldoInicial, [atualizada], "a1")).toBe(150_000);
    expect(alocadoNaConta([atualizada], "a1")).toBe(150_000);
  });

  it("não deixa reservar mais que o livre", () => {
    expect(validarAlocacao({ alocado: 400_000, livreMaisAtual: 300_000 })).toMatch(/livre/);
  });

  it("gastar da conta da meta reduz o envelope", () => {
    const depois = aplicarGastoNaReserva([VIAGEM], {
      valor: 30_000,
      contaID: "a1",
      metaID: "v1",
    });
    expect(depois[0]?.alocado).toBe(50_000);
    expect(saldoLivre(CORRENTE.saldoInicial, depois, "a1")).toBe(250_000);
  });

  it("com uma só reserva, gastar da conta já desconta", () => {
    const depois = aplicarGastoNaReserva([VIAGEM], { valor: 10_000, contaID: "a1" });
    expect(depois[0]?.alocado).toBe(70_000);
  });

  it("gasto do saldo livre não mexe na reserva de outra meta", () => {
    const depois = aplicarGastoNaReserva(
      [VIAGEM, { ...VIAGEM, id: "v2", nome: "Reserva", alocado: 40_000 }],
      { valor: 10_000, contaID: "a1" },
    );
    expect(depois[0]?.alocado).toBe(80_000);
    expect(depois[1]?.alocado).toBe(40_000);
  });

  it("rótulo do seletor mostra a reserva na conta", () => {
    expect(rotuloContaComReserva(CORRENTE, VIAGEM)).toBe("Corrente · R$ 800,00 na Viagem");
    expect(opcoesContaComReserva([CORRENTE], [VIAGEM]).map((o) => o.rotulo)).toEqual([
      "Corrente · livre R$ 2.200,00",
      "Corrente · R$ 800,00 na Viagem",
    ]);
  });

  it("diz o que falta na reserva", () => {
    expect(fraseReserva(80_000, 200_000, "Viagem")).toBe("Faltam R$ 1.200,00 na reserva de Viagem.");
    expect(fraseReserva(200_000, 200_000, "Viagem")).toBe("A reserva de Viagem chegou no alvo.");
  });
});
