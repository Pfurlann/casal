import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartaoDetalhe } from "./CartaoDetalhe";

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

function parcela(n: number, data: Date) {
  return {
    id: `p${n}`,
    carteiraID: "c1",
    tipo: "despesa",
    valor: n === 1 ? 3334 : 3333,
    data: data.toISOString(),
    descricao: "Sofá",
    cartaoID: "k1",
    hashDedup: "",
    grupoParcela: "g1",
    parcelaN: n,
    parcelaTotal: 3,
  };
}

describe("CartaoDetalhe", () => {
  it("mostra a parcela da fatura atual", () => {
    loja.valor = {
      cartoes: [CARTAO],
      faturas: [],
      transacoes: [parcela(1, new Date(2026, 8, 28, 12))],
    };
    render(<CartaoDetalhe id="k1" />);
    expect(screen.getByText("Sofá")).toBeInTheDocument();
    expect(screen.getByText("parcela 1 de 3")).toBeInTheDocument();
  });

  it("abre a edição ao tocar no lançamento da fatura", () => {
    loja.valor = {
      cartoes: [CARTAO],
      faturas: [],
      transacoes: [parcela(1, new Date(2026, 8, 28, 12))],
    };
    render(<CartaoDetalhe id="k1" />);
    expect(screen.getByRole("link", { name: /Sofá/ })).toHaveAttribute(
      "href",
      "/lancamentos/p1",
    );
  });

  it("mostra programa, saldo e pts por US$ 1", () => {
    loja.valor = {
      cartoes: [
        {
          ...CARTAO,
          programa: {
            nome: "Livelo",
            saldo: 12500,
            pontosPorUnidadeX100: 220,
            moeda: "usd",
            valorPontoCentavos: 3,
          },
        },
      ],
      faturas: [],
      transacoes: [],
    };
    render(<CartaoDetalhe id="k1" />);
    expect(screen.getByText(/Livelo · 12\.500 pts/)).toBeInTheDocument();
    expect(screen.getByText(/2,2 pts por US\$ 1/)).toBeInTheDocument();
    expect(screen.getByText("R$ 375,00")).toBeInTheDocument();
    expect(screen.getByText("Saldo informado por você")).toBeInTheDocument();
  });

  it("lista competências futuras com o valor da parcela", async () => {
    loja.valor = {
      cartoes: [CARTAO],
      faturas: [],
      transacoes: [
        parcela(1, new Date(2026, 8, 28, 12)),
        parcela(2, new Date(2026, 9, 28, 12)),
        parcela(3, new Date(2026, 10, 28, 12)),
      ],
    };
    render(<CartaoDetalhe id="k1" />);
    await userEvent.click(screen.getByRole("button", { name: "Futuras" }));
    expect(screen.getByText("nov 2026")).toBeInTheDocument();
    expect(screen.getByText("R$ 33,33")).toBeInTheDocument();
  });
});
