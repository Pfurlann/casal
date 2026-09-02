import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lancar } from "./Lancar";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empurrar, back: vi.fn() }) }));

const lancar = vi.hoisted(() => ({ fn: vi.fn() }));
const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

function montar() {
  empurrar.mockClear();
  loja.valor = { cartoes: [], lancar: lancar.fn };
  return render(
    <ProvedorAviso>
      <Lancar />
    </ProvedorAviso>,
  );
}

describe("Lancar", () => {
  it("começa em zero e não deixa salvar", () => {
    montar();
    expect(screen.getByText(/R\$ 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("monta o valor pelo teclado físico e habilita o salvar", async () => {
    montar();
    await userEvent.keyboard("21490");
    expect(screen.getByText(/214/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("grava o lançamento com a categoria escolhida", async () => {
    lancar.fn.mockClear();
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 1000,
        categoriaID: "00000000-0000-0000-0000-000000000002",
        parcelas: 1,
      }),
    );
  });

  it("não mostra linha de teto enquanto Metas não existe", async () => {
    montar();
    await userEvent.keyboard("1000");
    expect(screen.queryByText(/teto/i)).toBeNull();
    expect(screen.queryByText(/sobram/i)).toBeNull();
  });

  it("avisa quando a gravação falha, em vez de fechar em silêncio", async () => {
    lancar.fn.mockRejectedValueOnce(new Error("rede"));
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText(/Não deu para salvar/)).toBeInTheDocument();
    expect(empurrar).not.toHaveBeenCalled();
  });
});
