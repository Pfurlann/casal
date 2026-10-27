import { beforeEach, describe, expect, it } from "vitest";
import type { Transacao } from "./domain";
import {
  carregarPacote,
  construirPacote,
  lancsDoDfcl,
  movsDosPortadores,
  portadoresDoPacote,
  salvarPacote,
  type PacoteDfcl,
} from "./dados-dfcl";

const bruto = {
  realizados: [
    {
      Data: "2026-10-02T00:00:00.000Z",
      Vencimento: "2026-10-01T00:00:00.000Z",
      Tipo: "Saída",
      Responsabilidade: "Pedro",
      "Conta Financeira": "Telefone",
      Portador: "Pedro - Pagbank",
      Pagamento: "Pix",
      Valor: 100,
      Status: "Pago",
      Parcela: 1,
      "Total de Parcelas": 1,
    },
    {
      Data: "2026-09-30T00:00:00.000Z",
      Tipo: "Entrada",
      Responsabilidade: "Pedro",
      "Conta Financeira": "Saldo Inicial",
      Portador: "Pedro - Pagbank",
      Pagamento: "Saldo Inicial",
      Valor: 1000,
      Status: "Pago",
    },
  ],
  metas: [{ Ano: 2026, "Mês": "2026-10-10T00:00:00.000Z", Conta: "Telefone", Pessoa: "Pedro", Valor: 120 }],
  config: [{ "Nome Conta": "Telefone", "Classificação Conta": "Saída", "Tipo Conta": "Fixo" }],
};

describe("construirPacote", () => {
  it("junta metas, contas e realizados lidos da planilha", () => {
    const p = construirPacote(bruto);
    expect(p.metas).toHaveLength(1);
    expect(p.contas).toHaveLength(1);
    expect(p.lancs).toHaveLength(2);
  });
});

describe("portadores e movimentos", () => {
  const p = construirPacote(bruto);

  it("deduz os portadores dos nomes usados", () => {
    expect(portadoresDoPacote(p)).toEqual([
      expect.objectContaining({ nome: "Pedro - Pagbank", dono: "Pedro", tipo: "conta" }),
    ]);
  });

  it("converte lançamentos em movimentos com sinal", () => {
    const movs = movsDosPortadores(p, []);
    expect(movs.map((m) => m.valor).sort((a, b) => a - b)).toEqual([-10000, 100000]);
    expect(movs.find((m) => m.valor === 100000)?.natureza).toBe("movimento");
  });
});

describe("lancsDoDfcl", () => {
  const p = construirPacote(bruto);
  const t = (o: Partial<Transacao>): Transacao => ({
    id: "t1",
    carteiraID: "c",
    tipo: "despesa",
    valor: 5000,
    data: "2026-10-20T12:00:00Z",
    descricao: "Mercado",
    categoriaID: "mercado",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    pessoa: "Daniele",
    ...o,
  });
  const cat = [{ id: "mercado", nome: "Mercado", icone: "", cor: "", tipo: "despesa" as const }];

  it("inclui os lançamentos feitos no app que têm pessoa", () => {
    const l = lancsDoDfcl(p, [t({})], cat);
    expect(l).toHaveLength(3);
    expect(l[2]).toMatchObject({ conta: "Mercado", pessoa: "Daniele", tipo: "Saída", valor: 5000, competencia: "2026-10" });
  });

  it("ignora lançamento do app sem pessoa e transferência", () => {
    expect(lancsDoDfcl(p, [t({ pessoa: undefined }), t({ id: "t2", tipo: "transferencia" })], cat)).toHaveLength(2);
  });
});

describe("persistência local", () => {
  beforeEach(() => localStorage.clear());

  it("salva e carrega o pacote", () => {
    const p: PacoteDfcl = construirPacote(bruto);
    salvarPacote("u1", p);
    expect(carregarPacote("u1")?.metas).toHaveLength(1);
    expect(carregarPacote("outro")).toBeNull();
  });

  it("devolve null com dado corrompido", () => {
    localStorage.setItem("casal-dfcl:u1", "{não é json");
    expect(carregarPacote("u1")).toBeNull();
  });
});
