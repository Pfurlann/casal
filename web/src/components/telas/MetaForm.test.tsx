import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetaForm } from "./MetaForm";
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
    metas: [],
    categorias: [],
    salvarMeta: vi.fn().mockResolvedValue(undefined),
    apagarMeta: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <MetaForm id={id} />
    </ProvedorAviso>,
  );
}

describe("MetaForm", () => {
  it("não salva sem valor", () => {
    montar();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("grava teto na carteira atual com a categoria", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarMeta: salvar });
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await userEvent.keyboard("50000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        carteiraID: "w1",
        tipo: "teto_categoria",
        valorAlvo: 50_000,
        categoriaID: "00000000-0000-0000-0000-000000000002",
        periodo: "mensal",
        ativa: true,
      }),
    );
    expect(empurrar).toHaveBeenCalledWith("/metas");
  });

  it("grava economia do mês sem categoria", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarMeta: salvar });
    await userEvent.click(screen.getByRole("button", { name: "Economia" }));
    await userEvent.keyboard("200000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "economia_mensal",
        valorAlvo: 200_000,
        categoriaID: undefined,
        nome: "Economia do mês",
      }),
    );
  });
});
