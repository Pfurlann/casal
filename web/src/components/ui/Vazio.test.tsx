import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Vazio } from "./Vazio";

describe("Vazio", () => {
  it("exibe a frase passada", () => {
    render(<Vazio frase="Nenhum gasto este mês." />);
    expect(screen.getByText("Nenhum gasto este mês.")).toBeInTheDocument();
  });

  it("renderiza a ação quando fornecida", () => {
    render(
      <Vazio
        frase="Nenhum gasto."
        acao={<button type="button">Novo gasto</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Novo gasto" })).toBeInTheDocument();
  });

  it("não renderiza wrapper de ação quando acao é undefined", () => {
    const { container } = render(<Vazio frase="Vazio." />);
    const wrappers = container.querySelectorAll(".mt-1");
    expect(wrappers.length).toBe(0);
  });

  it("tem classe casal-vazio para animação de entrada", () => {
    const { container } = render(<Vazio frase="Teste." />);
    expect(container.firstElementChild?.className).toContain("casal-vazio");
  });

  it("exibe a marca dentro de um anel circular", () => {
    const { container } = render(<Vazio frase="Teste." />);
    const anel = container.querySelector(".rounded-full.border-2");
    expect(anel).toBeInTheDocument();
  });
});
