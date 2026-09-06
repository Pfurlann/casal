import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Rosca } from "./Rosca";

const COMPETENCIA = { ano: 2026, mes: 9 };

const FATIAS = [
  { categoriaID: "1", nome: "Mercado", total: 50_000 },
  { categoriaID: "2", nome: "Restaurante", total: 30_000 },
  { categoriaID: "", nome: "Outros", total: 20_000 },
];

describe("Rosca", () => {
  it("lista as fatias por nome, sem bloco colorido", () => {
    const { container } = render(<Rosca fatias={FATIAS} competencia={COMPETENCIA} />);
    for (const nome of ["Mercado", "Restaurante", "Outros"]) {
      expect(screen.getByText(nome)).toBeInTheDocument();
    }
    expect(container.querySelector("[data-bloco-cor]")).toBeNull();
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("pinta fatias com token grafite em opacidade, não cor de categoria", () => {
    const { container } = render(<Rosca fatias={FATIAS} competencia={COMPETENCIA} />);
    const fatias = [...container.querySelectorAll("[data-fatia]")] as SVGCircleElement[];
    expect(fatias).toHaveLength(3);
    expect(fatias.every((f) => f.getAttribute("stroke") === "var(--grafite)")).toBe(true);
    expect(fatias.map((f) => f.getAttribute("stroke-opacity"))).toEqual(["1", "0.72", "0.5"]);
    expect(container.innerHTML).not.toContain("currentColor");
  });

  it("rosca vazia mostra só o trilho, sem fatia", () => {
    const { container } = render(<Rosca fatias={[]} competencia={COMPETENCIA} />);
    expect(container.querySelectorAll("[data-fatia]")).toHaveLength(0);
    expect(container.querySelector("circle")?.getAttribute("stroke")).toBe("var(--nevoa)");
  });

  it("legenda usa swatch com a mesma opacidade da fatia", () => {
    const { container } = render(<Rosca fatias={FATIAS} competencia={COMPETENCIA} />);
    const swatches = [...container.querySelectorAll("[data-swatch]")] as HTMLElement[];
    expect(swatches).toHaveLength(3);
    expect(swatches.map((s) => s.style.opacity)).toEqual(["1", "0.72", "0.5"]);
    expect(swatches.every((s) => s.className.includes("bg-grafite"))).toBe(true);
  });

  it("mostra total no centro e valor da fatia no hover da legenda", () => {
    const { container } = render(<Rosca fatias={FATIAS} competencia={COMPETENCIA} />);
    const centro = container.querySelector("[data-centro]");
    expect(centro?.textContent).toMatch(/total/);
    fireEvent.mouseEnter(container.querySelector("[data-legenda-i=\"0\"]")!);
    expect(centro?.textContent).toMatch(/Mercado/);
    expect(centro?.textContent).not.toMatch(/total/);
  });

  it("legenda e fatia linkam para /mes da competência (sem filtro de categoria)", () => {
    const { container } = render(<Rosca fatias={FATIAS} competencia={COMPETENCIA} />);
    const links = screen.getAllByRole("link", { name: /ver mês/ });
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links.every((a) => a.getAttribute("href") === "/mes?c=2026-09")).toBe(true);
    expect(container.querySelector("[data-fatia]")?.closest("a")).toHaveAttribute(
      "href",
      "/mes?c=2026-09",
    );
  });
});
