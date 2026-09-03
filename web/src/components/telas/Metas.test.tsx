import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Metas } from "./Metas";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "w1", nome: "Nosso" };

const TETO = {
  id: "m1",
  carteiraID: "w1",
  tipo: "teto_categoria" as const,
  nome: "Mercado",
  valorAlvo: 50_000,
  categoriaID: "00000000-0000-0000-0000-000000000001",
  periodo: "mensal" as const,
  ativa: true,
};

describe("Metas", () => {
  it("mostra vazio e o atalho para criar teto", () => {
    loja.valor = { carteira: CARTEIRA, metas: [], transacoes: [], categorias: [] };
    render(<Metas />);
    expect(screen.getByText(/Nenhum teto nesta carteira/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar teto" })).toHaveAttribute("href", "/metas/nova");
  });

  it("lista o teto com o que sobra neste mês", () => {
    loja.valor = {
      carteira: CARTEIRA,
      metas: [TETO],
      transacoes: [
        {
          id: "t1",
          carteiraID: "w1",
          tipo: "despesa",
          valor: 16_000,
          data: new Date().toISOString(),
          categoriaID: TETO.categoriaID,
          descricao: "feira",
          hashDedup: "",
          parcelaN: 1,
          parcelaTotal: 1,
        },
      ],
      categorias: [],
    };
    render(<Metas />);
    expect(screen.getByRole("link", { name: /Mercado/ })).toHaveAttribute("href", "/metas/m1");
    expect(screen.getByText("Sobram R$ 340,00 no teto de Mercado.")).toBeInTheDocument();
  });

  it("não usa cor literal", () => {
    loja.valor = { carteira: CARTEIRA, metas: [TETO], transacoes: [], categorias: [] };
    const { container } = render(<Metas />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(container.innerHTML).not.toContain("gradient");
  });
});
