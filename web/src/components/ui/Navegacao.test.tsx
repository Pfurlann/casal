import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navegacao } from "./Navegacao";

const caminho = vi.hoisted(() => ({ atual: "/mes" }));
vi.mock("next/navigation", () => ({
  usePathname: () => caminho.atual,
}));

describe("Navegacao", () => {
  it("oferece os destinos do phone e a visão no desktop", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    for (const nome of ["visão", "mês", "cartões", "metas", "mais"]) {
      expect(screen.getByRole("link", { name: nome })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "visão" })).toHaveAttribute("href", "/visao");
  });

  it("marca visão ativa na seção inteira", () => {
    caminho.atual = "/visao";
    render(<Navegacao />);
    expect(screen.getByRole("link", { name: "visão" })).toHaveAttribute(
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
    expect(
      screen.getByRole("link", { name: "Novo lançamento" }),
    ).toHaveAttribute("href", "/lancar");
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

  it("no desktop o trilho é um painel de 240px, não uma barra apertada", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(screen.getByRole("navigation", { name: "Seções" }).className).toContain(
      "lg:w-[240px]",
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
