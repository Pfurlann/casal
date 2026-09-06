import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navegacao } from "./Navegacao";

const caminho = vi.hoisted(() => ({ atual: "/mes" }));
vi.mock("next/navigation", () => ({
  usePathname: () => caminho.atual,
}));

const loja = vi.hoisted(() => ({
  valor: { carteira: { id: "c1", nome: "Nosso" } } as Record<string, unknown>,
}));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const auth = vi.hoisted(() => ({
  valor: {
    usuario: { email: "pedro@exemplo.com" },
    sair: vi.fn(),
  } as Record<string, unknown>,
}));
vi.mock("@/lib/auth", async (original) => {
  const real = await original<typeof import("@/lib/auth")>();
  return { ...real, useAuth: () => auth.valor };
});

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
    const cartoes = screen.getByRole("link", { name: "cartões" });
    expect(cartoes).toHaveAttribute("aria-current", "page");
    expect(cartoes.className).toContain("font-semibold");
    expect(cartoes.className).toContain("lg:shadow-[inset_3px_0_0_0_var(--grafite)]");
    expect(screen.getByRole("link", { name: "mês" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "mês" }).className).not.toContain(
      "font-semibold",
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
    const lancar = screen.getAllByRole("link", { name: "Novo lançamento" });
    expect(lancar.length).toBeGreaterThanOrEqual(1);
    for (const a of lancar) {
      expect(a).toHaveAttribute("href", "/lancar");
      expect(a.textContent).not.toContain("Novo gasto");
    }
  });

  it("não coloca Sair na bottom nav — Sair fica no trilho desktop e em Mais", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    const sair = screen.getByRole("button", { name: "Sair" });
    const rodape = sair.closest(".mt-auto");
    expect(rodape?.className).toContain("hidden");
    expect(rodape?.className).toContain("lg:flex");
    expect(screen.queryByRole("link", { name: "Sair" })).not.toBeInTheDocument();
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

  it("links do trilho alinham à esquerda no desktop", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    const mes = screen.getByRole("link", { name: "mês" });
    expect(mes.className).toContain("lg:justify-start");
    expect(mes.className).toContain("lg:text-left");
    expect(mes.className).toContain("lg:w-full");
  });

  it("rodapé do trilho tem um bloco único de conta/carteira + Novo lançamento", () => {
    caminho.atual = "/mes";
    const { container } = render(<Navegacao />);
    const carteira = screen.getByRole("link", { name: /Carteira Nosso/ });
    expect(carteira).toHaveAttribute("href", "/mais/carteiras");
    expect(screen.getByText("pedro@exemplo.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    // um único bloco agrupa carteira + e-mail + Sair
    const bloco = carteira.closest("div.rounded-controle");
    expect(bloco).toBeTruthy();
    expect(bloco?.textContent).toMatch(/Nosso/);
    expect(bloco?.textContent).toMatch(/pedro@exemplo.com/);
    expect(bloco?.textContent).toMatch(/Sair/);
    expect(bloco?.textContent).not.toMatch(/Novo lançamento/);
    const lancar = screen.getAllByRole("link", { name: "Novo lançamento" });
    expect(lancar.some((a) => a.textContent?.includes("Novo lançamento"))).toBe(
      true,
    );
    expect(container.querySelectorAll('a[href="/mais/carteiras"]').length).toBe(1);
    // FAB desktop: padding inferior do trilho ≥ 24px (--e-6; usamos --e-7)
    const rodape = carteira.closest(".mt-auto");
    expect(rodape?.className).toMatch(/lg:pb-\[var\(--e-7\)\]/);
  });

  it("topo do trilho alinha a marca com o miolo (pt-5 + mb-6 na assinatura)", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    const nav = screen.getByRole("navigation", { name: "Seções" });
    expect(nav.className).toContain("lg:pt-5");
    const marca = screen.getByRole("img", { name: "casal" }).parentElement;
    expect(marca?.className).toContain("lg:mb-6");
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
      screen.getAllByRole("link", { name: "Novo lançamento" })[0].className,
    ).toContain("casal-toque");
  });
});
