import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Categorias } from "./Categorias";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

describe("Categorias", () => {
  it("lista padrão e custom, e só custom tem link de edição", () => {
    loja.valor = {
      carteira: { id: "w1", nome: "Nosso" },
      categorias: [
        {
          id: "cat-pet",
          nome: "Pet",
          icone: "outros",
          cor: "grafite",
          tipo: "despesa",
          carteiraID: "w1",
        },
      ],
    };
    render(<Categorias />);
    expect(screen.getByRole("link", { name: /Pet/ })).toHaveAttribute("href", "/mais/categorias/cat-pet");
    expect(screen.getByText("Mercado")).toBeInTheDocument();
    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Mercado/ })).toBeNull();
  });
});
