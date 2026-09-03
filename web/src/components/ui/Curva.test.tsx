import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Curva } from "./Curva";

const PONTOS = [
  { rotulo: "set", total: 340000 },
  { rotulo: "out", total: 170000 },
  { rotulo: "nov", total: 0 },
];

describe("Curva", () => {
  it("mostra o rótulo de cada mês", () => {
    render(<Curva pontos={PONTOS} />);
    for (const r of ["set", "out", "nov"]) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }
  });

  it("dimensiona as barras em pixels contra o maior valor", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    const alturas = [...container.querySelectorAll("[data-barra]")].map(
      (b) => (b as HTMLElement).style.height,
    );
    expect(alturas[0]).toBe("40px");
    expect(alturas[1]).toBe("20px");
  });

  it("dá altura mínima visível ao mês sem fatura", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    const alturas = [...container.querySelectorAll("[data-barra]")].map(
      (b) => (b as HTMLElement).style.height,
    );
    expect(alturas[2]).toBe("2px");
  });

  it("não usa gradiente", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("pinta barras com tokens, não currentColor", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    const barras = [...container.querySelectorAll("[data-barra]")] as HTMLElement[];
    expect(barras[0].style.backgroundColor).toBe("var(--grafite)");
    expect(barras[2].style.backgroundColor).toBe("var(--nevoa)");
    expect(container.innerHTML).not.toContain("currentColor");
  });

  it("aguenta todos os meses zerados sem dividir por zero", () => {
    const { container } = render(
      <Curva pontos={[{ rotulo: "set", total: 0 }, { rotulo: "out", total: 0 }]} />,
    );
    const alturas = [...container.querySelectorAll("[data-barra]")].map(
      (b) => (b as HTMLElement).style.height,
    );
    expect(alturas).toEqual(["2px", "2px"]);
  });
});
