import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoriaForm } from "./CategoriaForm";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empurrar }) }));

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

function montar(extra: Record<string, unknown> = {}, id?: string) {
  empurrar.mockClear();
  loja.valor = {
    carteira: { id: "w1", nome: "Nosso" },
    categorias: [],
    salvarCategoria: vi.fn().mockResolvedValue(undefined),
    apagarCategoria: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <CategoriaForm id={id} />
    </ProvedorAviso>,
  );
}

describe("CategoriaForm", () => {
  it("não salva sem nome", () => {
    montar();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("grava categoria de receita na carteira atual", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarCategoria: salvar });
    await userEvent.type(screen.getByLabelText("Nome"), "Mesada");
    await userEvent.click(screen.getByRole("button", { name: "Receita" }));
    await userEvent.click(screen.getByRole("button", { name: /salario/i }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Mesada",
        tipo: "receita",
        icone: "salario",
        carteiraID: "w1",
        cor: "grafite",
      }),
    );
    expect(empurrar).toHaveBeenCalledWith("/mais/categorias");
  });

  it("apaga só categoria custom", async () => {
    const apagar = vi.fn().mockResolvedValue(undefined);
    montar(
      {
        apagarCategoria: apagar,
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
      },
      "cat-pet",
    );
    expect(screen.getByDisplayValue("Pet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Apagar categoria/ }));
    expect(apagar).toHaveBeenCalledWith("cat-pet");
  });
});
