import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Botao } from "./Botao";

describe("Botao", () => {
  it("respeita o alvo mínimo de toque", () => {
    render(
      <Botao variante="primario" onClick={() => {}}>
        Salvar
      </Botao>,
    );
    expect(screen.getByRole("button", { name: "Salvar" }).className).toContain(
      "min-h-[44px]",
    );
  });

  it("tem feedback de press compartilhado", () => {
    render(
      <Botao variante="primario" onClick={() => {}}>
        Salvar
      </Botao>,
    );
    expect(screen.getByRole("button", { name: "Salvar" }).className).toContain(
      "casal-toque",
    );
  });

  it("dispara a ação ao clicar", async () => {
    const onClick = vi.fn();
    render(
      <Botao variante="primario" onClick={onClick}>
        Salvar
      </Botao>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
