import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navegacao } from "./Navegacao";

const caminho = vi.hoisted(() => ({ atual: "/mes" }));
vi.mock("next/navigation", () => ({
  usePathname: () => caminho.atual,
}));

describe("Navegacao", () => {
  it("oferece os destinos sem duplicar home", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    for (const nome of ["mês", "relatórios", "cartões", "metas", "mais"]) {
      expect(screen.getByRole("link", { name: nome })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "visão" })).not.toBeInTheDocument();
  });

  it("coloca relatórios entre mês e cartões, fora de Mais", () => {
    caminho.atual = "/relatorios";
    render(<Navegacao />);
    const nomes = screen.getAllByRole("link").map((a) => a.textContent);
    const mes = nomes.findIndex((n) => n === "mês");
    const rel = nomes.findIndex((n) => n === "relatórios");
    const cartoes = nomes.findIndex((n) => n === "cartões");
    expect(rel).toBe(mes + 1);
    expect(cartoes).toBe(rel + 1);
    expect(screen.getByRole("link", { name: "relatórios" })).toHaveAttribute(
      "href",
      "/relatorios",
    );
    expect(screen.getByRole("link", { name: "relatórios" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marca o destino ativo com aria-current, não só com cor", () => {
    caminho.atual = "/cartoes";
    render(<Navegacao />);
    expect(screen.getByRole("link", { name: "cartões" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "mês" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("considera ativa a seção inteira, não só a raiz dela", () => {
    caminho.atual = "/cartoes/abc/editar";
    render(<Navegacao />);
    expect(screen.getByRole("link", { name: "cartões" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("dá à ação de lançar um alvo próprio, fora das abas", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    const lancar = screen.getByRole("link", { name: "Novo lançamento" });
    expect(lancar).toHaveAttribute("href", "/lancar");
    expect(lancar.textContent).toContain("Novo lançamento");
    expect(lancar.textContent).not.toContain("Novo gasto");
  });
});

describe("Navegacao — trilho de desktop", () => {
  it("traz a assinatura da marca, que não existe nas abas", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(screen.getByRole("img", { name: "casal" })).toBeInTheDocument();
  });

  it("mantém um único conjunto de destinos, sem duplicar para leitor de tela", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(screen.getAllByRole("link", { name: "mês" })).toHaveLength(1);
  });

  it("no desktop o trilho é um painel de 260px, não uma barra apertada", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(screen.getByRole("navigation", { name: "Seções" }).className).toContain(
      "lg:w-[260px]",
    );
    expect(screen.getByRole("navigation", { name: "Seções" }).className).toContain(
      "lg:sticky",
    );
  });

  it("abas e lançar têm press e alvo de 44px", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(screen.getByRole("link", { name: "mês" }).className).toContain(
      "casal-toque",
    );
    expect(screen.getByRole("link", { name: "mês" }).className).toContain(
      "min-h-[44px]",
    );
    expect(
      screen.getByRole("link", { name: "Novo lançamento" }).className,
    ).toContain("casal-toque");
  });
});
