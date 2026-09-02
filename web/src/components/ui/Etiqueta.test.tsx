import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Etiqueta } from "./Etiqueta";

describe("Etiqueta", () => {
  it("pinta o estado ativo com ar sobre grafite", () => {
    render(
      <Etiqueta ativa aoClicar={() => {}}>
        Claro
      </Etiqueta>,
    );
    const botao = screen.getByRole("button", { name: "Claro" });
    expect(botao).toHaveAttribute("aria-pressed", "true");
    expect(botao.style.color).toBe("var(--ar)");
    expect(botao.style.backgroundColor).toBe("var(--grafite)");
  });

  it("mantém o rótulo grafite no estado inativo", () => {
    render(
      <Etiqueta ativa={false} aoClicar={() => {}}>
        Escuro
      </Etiqueta>,
    );
    const botao = screen.getByRole("button", { name: "Escuro" });
    expect(botao).toHaveAttribute("aria-pressed", "false");
    expect(botao.style.color).toBe("var(--grafite)");
    expect(botao.style.backgroundColor).toBe("");
  });

  it("dispara a ação ao clicar", async () => {
    const aoClicar = vi.fn();
    render(
      <Etiqueta ativa={false} aoClicar={aoClicar}>
        Sistema
      </Etiqueta>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sistema" }));
    expect(aoClicar).toHaveBeenCalledOnce();
  });
});
