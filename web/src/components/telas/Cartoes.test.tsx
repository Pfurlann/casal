import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Cartoes } from "./Cartoes";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTAO = {
  id: "k1",
  carteiraID: "c1",
  apelido: "Roxinho",
  banco: "Nubank",
  ultimos4: "1234",
  bandeira: "mastercard",
  cor: "grafite",
  limite: 500000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

describe("Cartoes", () => {
  it("mostra o estado vazio com ação de cadastrar", () => {
    loja.valor = { cartoes: [], transacoes: [], faturas: [] };
    render(<Cartoes />);
    expect(screen.getByRole("link", { name: /Adicionar cartão/ })).toHaveAttribute(
      "href",
      "/cartoes/novo",
    );
  });

  it("lista o cartão com banco, apelido e datas", () => {
    loja.valor = { cartoes: [CARTAO], transacoes: [], faturas: [] };
    render(<Cartoes />);
    expect(screen.getByText(/Nubank/)).toBeInTheDocument();
    expect(screen.getByText(/fecha 28/)).toBeInTheDocument();
    expect(screen.getByText(/vence 05/)).toBeInTheDocument();
  });

  it("cada cartão leva à própria rota de detalhe", () => {
    loja.valor = { cartoes: [CARTAO], transacoes: [], faturas: [] };
    render(<Cartoes />);
    expect(screen.getByRole("link", { name: /Nubank/ })).toHaveAttribute(
      "href",
      "/cartoes/k1",
    );
  });

  it("não desenha imitação de cartão de plástico", () => {
    loja.valor = { cartoes: [CARTAO], transacoes: [], faturas: [] };
    const { container } = render(<Cartoes />);
    expect(container.innerHTML).not.toContain("gradient");
    expect(container.innerHTML).not.toContain("••••");
  });

  it("mostra a próxima fatura e as parcelas futuras na curva", () => {
    const atual = new Date(2026, 8, 28, 12).toISOString();
    const proxima = new Date(2026, 9, 28, 12).toISOString();
    const futura = new Date(2026, 10, 28, 12).toISOString();
    loja.valor = {
      cartoes: [CARTAO],
      faturas: [],
      transacoes: [
        {
          id: "1",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 3334,
          data: atual,
          descricao: "Sofá",
          cartaoID: "k1",
          hashDedup: "",
          grupoParcela: "g",
          parcelaN: 1,
          parcelaTotal: 3,
        },
        {
          id: "2",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 3333,
          data: proxima,
          descricao: "Sofá",
          cartaoID: "k1",
          hashDedup: "",
          grupoParcela: "g",
          parcelaN: 2,
          parcelaTotal: 3,
        },
        {
          id: "3",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 3333,
          data: futura,
          descricao: "Sofá",
          cartaoID: "k1",
          hashDedup: "",
          grupoParcela: "g",
          parcelaN: 3,
          parcelaTotal: 3,
        },
      ],
    };
    render(<Cartoes />);
    expect(screen.getByText(/próx\. R\$ 33,33/)).toBeInTheDocument();
    expect(screen.getByText("set")).toBeInTheDocument();
    expect(screen.getByText("out")).toBeInTheDocument();
    expect(screen.getByText("nov")).toBeInTheDocument();
  });
});
