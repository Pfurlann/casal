import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Rosca } from "./Rosca";

const FATIAS = [
  { categoriaID: "1", nome: "Mercado", total: 50_000 },
  { categoriaID: "2", nome: "Restaurante", total: 30_000 },
  { categoriaID: "", nome: "Outros", total: 20_000 },
];

describe("Rosca", () => {
  it("lista as fatias por nome, sem bloco colorido", () => {
    const { container } = render(<Rosca fatias={FATIAS} />);
    for (const nome of ["Mercado", "Restaurante", "Outros"]) {
      expect(screen.getByText(nome)).toBeInTheDocument();
    }
    expect(container.querySelector("[data-bloco-cor]")).toBeNull();
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("pinta fatias com token grafite em opacidade, não cor de categoria", () => {
    const { container } = render(<Rosca fatias={FATIAS} />);
    const fatias = [...container.querySelectorAll("[data-fatia]")] as SVGCircleElement[];
    expect(fatias).toHaveLength(3);
    expect(fatias.every((f) => f.getAttribute("stroke") === "var(--grafite)")).toBe(true);
    expect(fatias.map((f) => f.getAttribute("stroke-opacity"))).toEqual(["1", "0.72", "0.5"]);
    expect(container.innerHTML).not.toContain("currentColor");
  });

  it("rosca vazia mostra só o trilho, sem fatia", () => {
    const { container } = render(<Rosca fatias={[]} />);
    expect(container.querySelectorAll("[data-fatia]")).toHaveLength(0);
    expect(container.querySelector("circle")?.getAttribute("stroke")).toBe("var(--nevoa)");
  });
});

  it("legenda usa swatch com a mesma opacidade da fatia", () => {
    const { container } = render(<Rosca fatias={FATIAS} />);
    const swatches = [...container.querySelectorAll("[data-swatch]")] as HTMLElement[];
    expect(swatches).toHaveLength(3);
    expect(swatches.map((s) => s.style.opacity)).toEqual(["1", "0.72", "0.5"]);
    expect(swatches.every((s) => s.className.includes("bg-grafite"))).toBe(true);
  });

