import { describe, expect, it } from "vitest";
import { classificarPortador, naturezaDaConta, parsearMetas, parsearRealizados } from "./planilhas";

const real = (o: Record<string, unknown>) => ({
  Data: new Date("2026-10-02T00:00:00Z"),
  Vencimento: new Date("2026-10-01T00:00:00Z"),
  Tipo: "Saída",
  "Descrição": "Pagamento Tim",
  Responsabilidade: "Pedro",
  "Conta Financeira": "Telefone",
  Portador: "Pedro - Pagbank",
  Pagamento: "Pix",
  Valor: 111.82,
  Status: "Pago",
  Parcela: 1,
  "Total de Parcelas": 1,
  ...o,
});

describe("naturezaDaConta", () => {
  it.each([
    "Saldo Inicial",
    "Transferência - Entrada",
    "Transferência - Saída",
    "Aplicação - Entrada",
    "Aplicação - Saída",
    "Aplicação - Resgate",
    "Fatura de Cartão - Nubank",
    "Fatura de Cartão - Caixa",
  ])("%s é movimento", (conta) => expect(naturezaDaConta(conta)).toBe("movimento"));

  it("conta comum é resultado", () => {
    expect(naturezaDaConta("Alimentação")).toBe("resultado");
    expect(naturezaDaConta("Rendimentos")).toBe("resultado");
  });
});

describe("classificarPortador", () => {
  it("cartões têm a instituição antes do dono", () => {
    expect(classificarPortador("Nubank - Pedro")).toMatchObject({ dono: "Pedro", instituicao: "Nubank", tipo: "cartao" });
    expect(classificarPortador("Nanquim Elo - Pedro")).toMatchObject({ dono: "Pedro", instituicao: "Nanquim Elo", tipo: "cartao" });
  });

  it("contas têm o dono antes da instituição", () => {
    expect(classificarPortador("Pedro - Pagbank")).toMatchObject({ dono: "Pedro", instituicao: "Pagbank", tipo: "conta" });
    expect(classificarPortador("PHF - Nubank")).toMatchObject({ dono: "PHF", instituicao: "Nubank", tipo: "conta" });
  });

  it("o id é estável para o mesmo nome", () => {
    expect(classificarPortador("Pedro - Pagbank").id).toBe(classificarPortador("Pedro - Pagbank").id);
    expect(classificarPortador("Pedro - Pagbank").id).not.toBe(classificarPortador("Pedro - Itaú").id);
  });
});

describe("parsearRealizados", () => {
  it("converte valor para centavos e mapeia os campos", () => {
    const { lancs, avisos } = parsearRealizados([real({})]);
    expect(avisos).toEqual([]);
    expect(lancs[0]).toMatchObject({
      competencia: "2026-10",
      conta: "Telefone",
      pessoa: "Pedro",
      tipo: "Saída",
      valor: 11182,
      natureza: "resultado",
      status: "Pago",
      portadorNome: "Pedro - Pagbank",
      data: "2026-10-02",
      vencimento: "2026-10-01",
    });
  });

  it("marca Saldo Inicial e fatura de cartão como movimento", () => {
    const { lancs } = parsearRealizados([
      real({ "Conta Financeira": "Saldo Inicial", Tipo: "Entrada", Valor: 27666.15 }),
      real({ "Conta Financeira": "Fatura de Cartão - Nubank" }),
    ]);
    expect(lancs.map((l) => l.natureza)).toEqual(["movimento", "movimento"]);
    expect(lancs[0].valor).toBe(2766615);
  });

  it("avisa de conta fora do cadastro e responsabilidade desconhecida, sem quebrar", () => {
    const { lancs, avisos } = parsearRealizados(
      [real({ "Conta Financeira": "Barbeiro" }), real({ Responsabilidade: "Fulano" })],
      [{ nome: "Telefone", tipo: "Saída", classe: "Fixo" }],
    );
    expect(lancs).toHaveLength(1);
    expect(avisos.some((a) => a.includes("Barbeiro"))).toBe(true);
    expect(avisos.some((a) => a.includes("Fulano"))).toBe(true);
  });
});

describe("parsearMetas", () => {
  const meta = (o: Record<string, unknown>) => ({
    Ano: 2026,
    "Mês": new Date("2026-10-10T00:00:00Z"),
    Conta: "Contrato Topcon",
    Pessoa: "Pedro",
    Valor: 13000,
    ...o,
  });
  const cfg = [{ "Nome Conta": "Contrato Topcon", "Classificação Conta": "Entrada", "Tipo Conta": "Fixo" }];

  it("lê o mês da data e o ano da coluna Ano", () => {
    const { metas } = parsearMetas(
      [meta({}), meta({ Ano: 2027, "Mês": new Date("2026-01-01T00:00:00Z"), Valor: 14000 })],
      cfg,
    );
    expect(metas).toEqual([
      { competencia: "2026-10", conta: "Contrato Topcon", pessoa: "Pedro", valor: 1300000 },
      { competencia: "2027-01", conta: "Contrato Topcon", pessoa: "Pedro", valor: 1400000 },
    ]);
  });

  it("monta o cadastro de contas e avisa de conta sem cadastro", () => {
    const r = parsearMetas([meta({ Conta: "Mistério" })], cfg);
    expect(r.contas).toEqual([{ nome: "Contrato Topcon", tipo: "Entrada", classe: "Fixo" }]);
    expect(r.avisos.some((a) => a.includes("Mistério"))).toBe(true);
  });
});
