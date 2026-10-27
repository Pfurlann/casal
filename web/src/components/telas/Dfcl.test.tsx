import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dfcl } from "./Dfcl";
import { salvarPacote, type PacoteDfcl } from "@/lib/dados-dfcl";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: { id: "u1" } }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dfcl", useRouter: () => ({ push: vi.fn() }) }));

const hoje = new Date();
const COMP = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

const PACOTE: PacoteDfcl = {
  metas: [
    { competencia: COMP, conta: "Alimentação", pessoa: "Pedro", valor: 10000 },
    { competencia: COMP, conta: "Alimentação", pessoa: "Daniele", valor: 30000 },
  ],
  contas: [{ nome: "Alimentação", tipo: "Saída", classe: "Variavel" }],
  lancs: [
    {
      competencia: COMP,
      conta: "Alimentação",
      pessoa: "Pedro",
      tipo: "Saída",
      valor: 11000,
      natureza: "resultado",
      descricao: "x",
      portadorNome: "Pedro - Pagbank",
      data: `${COMP}-02`,
      vencimento: `${COMP}-02`,
      status: "Pago",
      parcela: 1,
      parcelaTotal: 1,
      formaPagamento: "Pix",
    },
  ],
  avisos: [],
  importadoEm: "2026-10-27T00:00:00Z",
};

function montar() {
  loja.valor = { carteira: { id: "c", nome: "Nosso" }, transacoes: [], categorias: [], pronto: true };
  return render(<Dfcl />);
}

describe("Dfcl", () => {
  beforeEach(() => localStorage.clear());

  it("sem dados importados convida a importar", () => {
    montar();
    expect(screen.getByText(/importar planilhas/i)).toBeInTheDocument();
  });

  it("mostra Prev, Real e % por mês, com o percentual da conta", () => {
    salvarPacote("u1", PACOTE);
    montar();
    expect(screen.getAllByText("Prev").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Real").length).toBeGreaterThan(0);
    const linhas = screen.getAllByText("Alimentação").map((e) => e.closest("tr")!);
    expect(linhas.some((l) => within(l).queryByText("110%"))).toBe(true);
  });

  it("filtra por pessoa", async () => {
    salvarPacote("u1", PACOTE);
    montar();
    expect(screen.getByText("2.2. Daniele")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pedro" }));
    expect(screen.queryByText("2.2. Daniele")).not.toBeInTheDocument();
    expect(screen.getByText("2.3. Pedro")).toBeInTheDocument();
  });
});
