import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurvaMeses } from "./CurvaMeses";

const PONTOS = [
  { rotulo: "jul", gasto: 100_000, receita: 200_000 },
  { rotulo: "ago", gasto: 50_000, receita: 0 },
  { rotulo: "set", gasto: 0, receita: 0 },
];

describe("CurvaMeses", () => {
  it("mostra rótulos e legenda gasto/receita", () => {
    render(<CurvaMeses pontos={PONTOS} />);
    for (const r of ["jul", "ago", "set"]) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }
    expect(screen.getByText("gasto")).toBeInTheDocument();
    expect(screen.getByText("receita")).toBeInTheDocument();
  });

  it("pinta gasto em grafite e receita em âmbar", () => {
    const { container } = render(<CurvaMeses pontos={PONTOS} />);
    const gastos = [...container.querySelectorAll('[data-serie="gasto"]')] as HTMLElement[];
    const receitas = [...container.querySelectorAll('[data-serie="receita"]')] as HTMLElement[];
    expect(gastos[0].style.backgroundColor).toBe("var(--grafite)");
    expect(receitas[0].style.backgroundColor).toBe("var(--ambar)");
    expect(gastos[2].style.backgroundColor).toBe("var(--nevoa)");
    expect(receitas[2].style.backgroundColor).toBe("var(--nevoa)");
  });

  it("não usa gradiente nem arco-íris", () => {
    const { container } = render(<CurvaMeses pontos={PONTOS} />);
    expect(container.innerHTML).not.toContain("gradient");
    expect(container.innerHTML).not.toContain("currentColor");
  });
});
