import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartaoDetalhe } from "./CartaoDetalhe";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar, back: vi.fn() }),
}));

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

function tela(extra: Record<string, unknown> = {}) {
  loja.valor = {
    cartoes: [CARTAO],
    faturas: [],
    transacoes: [],
    usuarioID: "u1",
    apagarCartao: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <CartaoDetalhe id="k1" />
    </ProvedorAviso>,
  );
}

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
    tela({ transacoes: [parcela(1, new Date(2026, 8, 28, 12))] });
    expect(screen.getByText("Sofá")).toBeInTheDocument();
    expect(screen.getByText("28/09/2026 · parcela 1 de 3")).toBeInTheDocument();
  });

  it("lista gastos da fatura por data, mais recente primeiro", () => {
    tela({
      transacoes: [
        {
          id: "antiga",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 1000,
          data: new Date(2026, 8, 5, 12).toISOString(),
          descricao: "Padaria",
          cartaoID: "k1",
          hashDedup: "a",
          parcelaN: 1,
          parcelaTotal: 1,
          status: "liquidado",
        },
        {
          id: "recente",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 2000,
          data: new Date(2026, 8, 20, 12).toISOString(),
          descricao: "Farmácia",
          cartaoID: "k1",
          hashDedup: "b",
          parcelaN: 1,
          parcelaTotal: 1,
          status: "liquidado",
        },
      ],
    });
    const linhas = screen.getAllByRole("link").filter((el) =>
      /Padaria|Farmácia/.test(el.textContent ?? ""),
    );
    expect(linhas[0]).toHaveAccessibleName(/Farmácia/);
    expect(linhas[1]).toHaveAccessibleName(/Padaria/);
    expect(screen.getByText("20/09/2026")).toBeInTheDocument();
    expect(screen.getByText("05/09/2026")).toBeInTheDocument();
  });

  it("oferece importar OFX na fatura atual", () => {
    tela();
    expect(screen.getByRole("link", { name: "Importar OFX" })).toHaveAttribute(
      "href",
      "/cartoes/k1/importar-ofx",
    );
  });

  it("abre a edição ao tocar no lançamento da fatura", () => {
    tela({ transacoes: [parcela(1, new Date(2026, 8, 28, 12))] });
    expect(screen.getByRole("link", { name: /Sofá/ })).toHaveAttribute(
      "href",
      "/lancamentos/p1",
    );
  });

  it("mostra programa, saldo e pts por US$ 1", () => {
    tela({
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
    });
    expect(screen.getByText(/Livelo · 12\.500 pts/)).toBeInTheDocument();
    expect(screen.getByText(/2,2 pts por US\$ 1/)).toBeInTheDocument();
    expect(screen.getByText("R$ 375,00")).toBeInTheDocument();
    expect(screen.getByText("Saldo informado por você")).toBeInTheDocument();
  });

  it("lista competências futuras com o valor da parcela", async () => {
    tela({
      transacoes: [
        parcela(1, new Date(2026, 8, 28, 12)),
        parcela(2, new Date(2026, 9, 28, 12)),
        parcela(3, new Date(2026, 10, 28, 12)),
      ],
    });
    await userEvent.click(screen.getByRole("button", { name: "Futuras" }));
    expect(screen.getByText("nov 2026")).toBeInTheDocument();
    expect(screen.getByText("R$ 33,33")).toBeInTheDocument();
  });

  it("o dono vê Apagar e confirma", async () => {
    const apagarCartao = vi.fn().mockResolvedValue(undefined);
    empurrar.mockClear();
    tela({
      cartoes: [{ ...CARTAO, donoID: "u1" }],
      usuarioID: "u1",
      apagarCartao,
    });
    await userEvent.click(screen.getByRole("button", { name: "Apagar cartão" }));
    expect(apagarCartao).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Apagar" }));
    expect(apagarCartao).toHaveBeenCalledWith("k1");
    expect(empurrar).toHaveBeenCalledWith("/cartoes");
  });

  it("o parceiro não vê Apagar", () => {
    tela({
      cartoes: [{ ...CARTAO, donoID: "u2" }],
      usuarioID: "u1",
    });
    expect(screen.queryByRole("button", { name: "Apagar cartão" })).toBeNull();
  });
});
