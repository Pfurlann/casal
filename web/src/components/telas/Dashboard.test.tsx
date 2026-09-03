import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./Dashboard";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "c1", nome: "Nosso", cor: "grafite", rotulo: "compartilhada", visibilidade: "aberta" };

function montar(extra: Record<string, unknown> = {}) {
  loja.valor = {
    carteira: CARTEIRA,
    transacoes: [],
    categorias: [],
    cartoes: [],
    faturas: [],
    contas: [],
    metas: [],
    compromissos: [],
    ...extra,
  };
  return render(<Dashboard />);
}

describe("Dashboard", () => {
  it("mostra o diagnóstico da carteira atual", () => {
    montar();
    expect(screen.getByRole("heading", { name: /visão · Nosso/ })).toBeInTheDocument();
    expect(screen.getByText(/ainda sem movimento neste mês/)).toBeInTheDocument();
  });

  it("mostra gastos, receitas e a frase em centavos", () => {
    const agora = new Date();
    const iso = agora.toISOString();
    montar({
      transacoes: [
        {
          id: "r",
          carteiraID: "c1",
          tipo: "receita",
          valor: 100_000,
          data: iso,
          descricao: "salário",
          hashDedup: "",
          parcelaN: 1,
          parcelaTotal: 1,
        },
        {
          id: "d",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 112_000,
          data: iso,
          categoriaID: "00000000-0000-0000-0000-000000000001",
          descricao: "feira",
          hashDedup: "",
          parcelaN: 1,
          parcelaTotal: 1,
        },
      ],
    });
    expect(screen.getByText("gastos 12% acima da receita")).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
  });

  it("desenha a evolução com barras em pixel, não %", () => {
    const { container } = montar();
    const barras = [...container.querySelectorAll("[data-barra]")] as HTMLElement[];
    expect(barras.length).toBe(6);
    expect(barras.every((b) => b.style.height.endsWith("px"))).toBe(true);
    expect(barras.every((b) => b.style.backgroundColor.startsWith("var(--"))).toBe(true);
    expect(barras.some((b) => b.style.height.includes("%"))).toBe(false);
  });
});
