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

  it("largura auto não força w-full", () => {
    render(
      <Botao variante="secundario" largura="auto" onClick={() => {}}>
        Aplicar data
      </Botao>,
    );
    const cls = screen.getByRole("button", { name: "Aplicar data" }).className;
    expect(cls).toContain("w-auto");
    expect(cls).not.toMatch(/(?:^|\s)w-full(?:\s|$)/);
  });

  it("carregando mostra spinner, aria-busy e desabilita", () => {
    const onClick = vi.fn();
    render(
      <Botao variante="primario" onClick={onClick} carregando>
        Salvar
      </Botao>,
    );
    const botao = screen.getByRole("button");
    expect(botao).toHaveAttribute("aria-busy", "true");
    expect(botao).toBeDisabled();
    expect(botao.querySelector(".casal-spinner")).toBeInTheDocument();
    expect(screen.queryByText("Salvar")).toBeNull();
  });

  it("carregando não dispara onClick", async () => {
    const onClick = vi.fn();
    render(
      <Botao variante="primario" onClick={onClick} carregando>
        Salvar
      </Botao>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
