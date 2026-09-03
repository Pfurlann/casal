import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartaoForm } from "./CartaoForm";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar, back: vi.fn() }),
}));

const salvarCartao = vi.hoisted(() => ({ fn: vi.fn() }));
const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "w1", nome: "Casa", cor: "grafite", rotulo: "pessoal", visibilidade: "aberta" };

const CARTAO_BASE = {
  carteiraID: CARTEIRA.id,
  apelido: "Roxinho",
  banco: "Nubank",
  ultimos4: "1234",
  bandeira: "mastercard",
  cor: "grafite",
  limite: 500000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
  programa: {
    nome: "Livelo",
    saldo: 12500,
    pontosPorUnidadeX100: 220,
    moeda: "usd",
    valorPontoCentavos: 3,
  },
};

function montar(id?: string, extra: Record<string, unknown> = {}) {
  empurrar.mockClear();
  salvarCartao.fn.mockReset();
  salvarCartao.fn.mockResolvedValue(undefined);
  loja.valor = {
    cartoes: id ? [{ id, ...CARTAO_BASE }] : [],
    carteira: CARTEIRA,
    usuarioID: "u1",
    salvarCartao: salvarCartao.fn,
    apagarCartao: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <CartaoForm id={id} />
    </ProvedorAviso>,
  );
}

describe("CartaoForm — visibilidade", () => {
  it("na carteira pessoal começa em Pessoal e grava o dono", async () => {
    montar();
    expect(screen.getByRole("button", { name: "Pessoal" })).toHaveAttribute("aria-pressed", "true");
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Apelido"), "Roxinho");
    await user.type(screen.getByLabelText("Banco"), "Nubank");
    await user.type(screen.getByLabelText("Últimos 4 dígitos"), "1234");
    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvarCartao.fn).toHaveBeenCalledWith(
      expect.objectContaining({ visibilidade: "pessoal", donoID: "u1" }),
    );
  });
});

describe("CartaoForm — programa de pontos", () => {
  it("salva programa, saldo e pts por US$ 1", async () => {
    montar();
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Apelido"), "Roxinho");
    await user.type(screen.getByLabelText("Banco"), "Nubank");
    await user.type(screen.getByLabelText("Últimos 4 dígitos"), "1234");
    await user.click(screen.getByRole("button", { name: "1" }));
    await user.selectOptions(screen.getByLabelText("Programa de pontos"), "Livelo");
    await user.type(screen.getByLabelText("Saldo atual de pontos"), "12500");
    const metrica = screen.getByLabelText("Pontos por US$ 1");
    await user.clear(metrica);
    await user.type(metrica, "2,2");
    await user.clear(screen.getByLabelText("Valor do ponto (R$, opcional)"));
    await user.type(screen.getByLabelText("Valor do ponto (R$, opcional)"), "0,03");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvarCartao.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        apelido: "Roxinho",
        banco: "Nubank",
        ultimos4: "1234",
        programa: {
          nome: "Livelo",
          saldo: 12500,
          pontosPorUnidadeX100: 220,
          moeda: "usd",
          valorPontoCentavos: 3,
        },
      }),
    );
  });

  it("reabre o cartão com o programa cadastrado", () => {
    montar("k1");
    expect(screen.getByLabelText("Programa de pontos")).toHaveValue("Livelo");
    expect(screen.getByLabelText("Saldo atual de pontos")).toHaveValue("12500");
    expect(screen.getByLabelText("Pontos por US$ 1")).toHaveValue("2,2");
    expect(screen.getByLabelText("Valor do ponto (R$, opcional)")).toHaveValue("0,03");
  });
});

describe("CartaoForm — apagar", () => {
  it("o dono confirma e apaga", async () => {
    const apagarCartao = vi.fn().mockResolvedValue(undefined);
    montar("k1", {
      cartoes: [{ id: "k1", ...CARTAO_BASE, donoID: "u1" }],
      apagarCartao,
    });
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole("button", { name: "Apagar cartão" }));
    expect(apagarCartao).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: /Apagar cartão/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(apagarCartao).toHaveBeenCalledWith("k1");
    expect(empurrar).toHaveBeenCalledWith("/cartoes");
  });

  it("o parceiro não vê Apagar", () => {
    montar("k1", {
      cartoes: [{ id: "k1", ...CARTAO_BASE, donoID: "u2" }],
      usuarioID: "u1",
    });
    expect(screen.queryByRole("button", { name: "Apagar cartão" })).toBeNull();
  });
});
