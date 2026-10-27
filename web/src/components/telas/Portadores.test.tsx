import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Portadores } from "./Portadores";
import { salvarPacote, type PacoteDfcl } from "@/lib/dados-dfcl";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: { id: "u1" } }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/portadores", useRouter: () => ({ push: vi.fn() }) }));

const base = {
  competencia: "2020-01",
  conta: "X",
  pessoa: "Pedro" as const,
  descricao: "",
  vencimento: "2020-01-01",
  parcela: 1,
  parcelaTotal: 1,
  formaPagamento: "Pix",
};

const PACOTE: PacoteDfcl = {
  metas: [],
  contas: [],
  lancs: [
    { ...base, tipo: "Entrada", valor: 100000, natureza: "movimento", portadorNome: "Pedro - Pagbank", data: "2020-01-01", status: "Pago" },
    { ...base, tipo: "Saída", valor: 2500, natureza: "resultado", portadorNome: "Pedro - Pagbank", data: "2020-01-02", status: "Pago" },
    { ...base, tipo: "Entrada", valor: 1200, natureza: "movimento", portadorNome: "PHF - Nubank", data: "2020-01-01", status: "Pago" },
  ],
  avisos: [],
  importadoEm: "2026-10-27T00:00:00Z",
};

function montar() {
  loja.valor = { carteira: { id: "c", nome: "Nosso" }, transacoes: [], pronto: true };
  return render(<Portadores />);
}

describe("Portadores", () => {
  beforeEach(() => localStorage.clear());

  it("sem dados importados avisa que não há portadores", () => {
    montar();
    expect(screen.getByText(/sem portadores ainda/i)).toBeInTheDocument();
  });

  it("mostra o saldo de hoje de cada portador, o total e o total por pessoa", () => {
    salvarPacote("u1", PACOTE);
    montar();
    expect(screen.getByText("Pedro - Pagbank")).toBeInTheDocument();
    // o saldo de hoje aparece no cartão e repetido na projeção dos meses
    expect(screen.getAllByText("R$ 975,00").length).toBeGreaterThan(0); // Pagbank
    expect(screen.getAllByText("R$ 12,00").length).toBeGreaterThan(0); // Nubank
    expect(screen.getByText("R$ 987,00")).toBeInTheDocument(); // total
    expect(screen.getByText(/Pedro/, { selector: "li" })).toHaveTextContent("R$ 975,00");
  });
});
