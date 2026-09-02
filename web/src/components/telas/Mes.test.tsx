import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mes } from "./Mes";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "c1", nome: "Nosso", cor: "grafite", rotulo: "compartilhada", visibilidade: "aberta" };

function despesa(valor: number, descricao: string, categoriaID: string) {
  return {
    id: crypto.randomUUID(),
    carteiraID: "c1",
    tipo: "despesa",
    valor,
    data: new Date().toISOString(),
    categoriaID,
    descricao,
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
  };
}

describe("Mes", () => {
  it("soma só as despesas do mês corrente", () => {
    const mesPassado = new Date();
    mesPassado.setMonth(mesPassado.getMonth() - 1);
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [
        despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001"),
        despesa(1800, "Padaria", "00000000-0000-0000-0000-000000000001"),
        { ...despesa(50000, "Antigo", "00000000-0000-0000-0000-000000000001"), data: mesPassado.toISOString() },
      ],
    };
    render(<Mes />);
    expect(
      screen.getByText((_, el) => el?.textContent === "R$ 232,90" && el.className.includes("text-[36px]")),
    ).toBeInTheDocument();
    expect(screen.queryByText("Antigo")).toBeNull();
  });

  it("lista os lançamentos do mês com a categoria", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    render(<Mes />);
    expect(screen.getAllByText("Mercado").length).toBeGreaterThanOrEqual(2);
  });

  it("mostra o estado vazio quando não houve gasto", () => {
    loja.valor = { carteira: CARTEIRA, cartoes: [], faturas: [], transacoes: [] };
    render(<Mes />);
    expect(screen.getByText(/Nenhum gasto/)).toBeInTheDocument();
  });

  it("não usa gradiente em nenhuma superfície", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    const { container } = render(<Mes />);
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("não deixa cor literal no marcador", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    const { container } = render(<Mes />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
