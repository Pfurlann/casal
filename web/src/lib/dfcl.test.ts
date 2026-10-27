import { describe, expect, it } from "vitest";
import { montarDfcl, type ContaDfcl, type LancDfcl, type Meta } from "./dfcl";

const CONTAS: ContaDfcl[] = [
  { nome: "Alimentação", tipo: "Saída", classe: "Variavel" },
  { nome: "Aluguel", tipo: "Saída", classe: "Fixo" },
  { nome: "Contrato Topcon", tipo: "Entrada", classe: "Fixo" },
];

const lanc = (o: Partial<LancDfcl>): LancDfcl => ({
  competencia: "2026-10",
  conta: "Alimentação",
  pessoa: "Pedro",
  tipo: "Saída",
  valor: 0,
  natureza: "resultado",
  ...o,
});
const meta = (o: Partial<Meta>): Meta => ({
  competencia: "2026-10",
  conta: "Alimentação",
  pessoa: "Pedro",
  valor: 0,
  ...o,
});

const linha = (r: ReturnType<typeof montarDfcl>, rotulo: string) =>
  r.linhas.find((l) => l.rotulo === rotulo)!;

describe("montarDfcl", () => {
  it("compara previsto e realizado por conta", () => {
    const r = montarDfcl({
      competencias: ["2026-10"],
      contas: CONTAS,
      metas: [meta({ valor: 10000 })],
      lancs: [lanc({ valor: 11000 })],
      saldoInicial: 0,
    });
    const l = linha(r, "Alimentação");
    expect(l.prev).toEqual([10000]);
    expect(l.real).toEqual([11000]);
    expect(l.pct).toEqual([110]);
  });

  it("deixa o percentual em branco quando o previsto é zero", () => {
    const r = montarDfcl({
      competencias: ["2026-10"],
      contas: CONTAS,
      metas: [],
      lancs: [lanc({ valor: 500 })],
      saldoInicial: 0,
    });
    const l = linha(r, "Alimentação");
    expect(l.prev).toEqual([0]);
    expect(l.real).toEqual([500]);
    expect(l.pct).toEqual([null]);
  });

  it("ignora lançamento de natureza movimento", () => {
    const r = montarDfcl({
      competencias: ["2026-10"],
      contas: CONTAS,
      metas: [],
      lancs: [lanc({ valor: 9999, natureza: "movimento" })],
      saldoInicial: 0,
    });
    expect(linha(r, "2. Saídas").real).toEqual([0]);
  });

  it("filtra por pessoa", () => {
    const r = montarDfcl({
      competencias: ["2026-10"],
      contas: CONTAS,
      metas: [meta({ pessoa: "Daniele", valor: 300 }), meta({ pessoa: "Pedro", valor: 700 })],
      lancs: [],
      pessoa: "Daniele",
      saldoInicial: 0,
    });
    expect(linha(r, "2. Saídas").prev).toEqual([300]);
    expect(r.linhas.some((l) => l.rotulo === "2.2. Pedro")).toBe(false);
  });

  it("acumula o saldo atravessando a virada de ano, prev e real separados", () => {
    const r = montarDfcl({
      competencias: ["2026-12", "2027-01"],
      contas: CONTAS,
      metas: [
        meta({ competencia: "2026-12", conta: "Contrato Topcon", valor: 1000 }),
        meta({ competencia: "2027-01", valor: 400 }),
      ],
      lancs: [lanc({ competencia: "2026-12", conta: "Contrato Topcon", tipo: "Entrada", valor: 800 })],
      saldoInicial: 5000,
    });
    expect(r.acumulado.prev).toEqual([6000, 5600]);
    expect(r.acumulado.real).toEqual([5800, 5800]);
  });

  it("monta a árvore: Entradas e Saídas, pessoa, Fixas/Variáveis, conta, com subtotais", () => {
    const r = montarDfcl({
      competencias: ["2026-10"],
      contas: CONTAS,
      metas: [
        meta({ conta: "Alimentação", valor: 100 }),
        meta({ conta: "Aluguel", valor: 200 }),
        meta({ conta: "Contrato Topcon", valor: 900, pessoa: "Pedro" }),
      ],
      lancs: [],
      saldoInicial: 0,
    });
    const rotulos = r.linhas.map((l) => l.rotulo);
    expect(rotulos.indexOf("1. Entradas")).toBeLessThan(rotulos.indexOf("2. Saídas"));
    expect(linha(r, "2. Saídas").prev).toEqual([300]);
    expect(linha(r, "1. Entradas").prev).toEqual([900]);
    expect(rotulos).toContain("2.3. Pedro");
    expect(rotulos).toContain("Saídas Fixas - Pedro");
    expect(rotulos).toContain("Saídas Variáveis - Pedro");
  });
});
