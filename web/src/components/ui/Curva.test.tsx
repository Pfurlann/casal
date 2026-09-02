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

  it("dimensiona as barras contra o maior valor", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    const alturas = [...container.querySelectorAll("[data-barra]")].map(
      (b) => (b as HTMLElement).style.height,
    );
    expect(alturas[0]).toBe("100%");
    expect(alturas[1]).toBe("50%");
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
