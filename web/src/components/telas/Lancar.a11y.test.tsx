import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lancar } from "./Lancar";
import { ProvedorAviso } from "../ui/Aviso";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

function montar() {
  loja.valor = { cartoes: [], lancar: vi.fn() };
  return render(
    <ProvedorAviso>
      <Lancar />
    </ProvedorAviso>,
  );
}

describe("Lancar — acessibilidade", () => {
  it("anuncia o valor como campo, não só como texto decorativo", () => {
    montar();
    expect(screen.getByRole("status", { name: /valor/i })).toBeInTheDocument();
  });

  it("chega ao salvar percorrendo com Tab, sem ponteiro", async () => {
    montar();
    await userEvent.keyboard("1000");
    const salvar = screen.getByRole("button", { name: "Salvar" });
    for (let i = 0; i < 40 && document.activeElement !== salvar; i++) {
      await userEvent.tab();
    }
    expect(document.activeElement).toBe(salvar);
  });

  it("dá rótulo acessível a cada tecla, inclusive as de símbolo", () => {
    montar();
    expect(screen.getByRole("button", { name: "Apagar último dígito" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais opções" })).toBeInTheDocument();
  });
});
