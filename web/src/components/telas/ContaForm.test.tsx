import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContaForm } from "./ContaForm";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar, back: vi.fn() }),
}));

const salvarConta = vi.hoisted(() => ({ fn: vi.fn() }));
const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "w1", nome: "Casa", cor: "grafite", rotulo: "pessoal", visibilidade: "aberta" };

function montar(id?: string) {
  empurrar.mockClear();
  salvarConta.fn.mockReset();
  salvarConta.fn.mockResolvedValue(undefined);
  loja.valor = {
    contas: id
      ? [
          {
            id,
            carteiraID: CARTEIRA.id,
            nome: "Nubank",
            tipo: "corrente",
            saldoInicial: -5000,
            arquivada: false,
          },
        ]
      : [],
    carteira: CARTEIRA,
    usuarioID: "u1",
    salvarConta: salvarConta.fn,
  };
  return render(
    <ProvedorAviso>
      <ContaForm id={id} />
    </ProvedorAviso>,
  );
}

async function digitarCentavos(digitos: string) {
  const user = userEvent.setup({ delay: null });
  for (const d of digitos) {
    await user.click(screen.getByRole("button", { name: d }));
  }
  return user;
}

describe("ContaForm — cor", () => {
  it("grava a cor da paleta dos cartões", async () => {
    montar();
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Nome"), "Nubank");
    const bolas = screen.getAllByRole("button", { name: /^Cor / });
    expect(bolas.length).toBeGreaterThan(1);
    await user.click(bolas[2]!);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvarConta.fn).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Nubank", cor: expect.stringMatching(/^#/) }),
    );
  });
});

describe("ContaForm — visibilidade", () => {
  it("na carteira pessoal começa em Pessoal e grava o dono", async () => {
    montar();
    expect(screen.getByRole("button", { name: "Pessoal" })).toHaveAttribute("aria-pressed", "true");
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Nome"), "Nubank");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvarConta.fn).toHaveBeenCalledWith(
      expect.objectContaining({ visibilidade: "pessoal", donoID: "u1" }),
    );
  });

  it("na conjunta começa em Conjunta e aceita Ambas", async () => {
    loja.valor = {
      contas: [],
      carteira: { ...CARTEIRA, rotulo: "compartilhada", visibilidade: "aberta" },
      usuarioID: "u1",
      salvarConta: salvarConta.fn,
    };
    render(
      <ProvedorAviso>
        <ContaForm />
      </ProvedorAviso>,
    );
    expect(screen.getByRole("button", { name: "Conjunta" })).toHaveAttribute("aria-pressed", "true");
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Nome"), "Itaú");
    await user.click(screen.getByRole("button", { name: "Ambas" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvarConta.fn).toHaveBeenCalledWith(
      expect.objectContaining({ visibilidade: "ambas", donoID: "u1" }),
    );
  });
});

describe("ContaForm — saldo inicial", () => {
  it("grava saldo inicial negativo em centavos", async () => {
    montar();
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Nome"), "Itau");
    await digitarCentavos("5000");
    await user.click(screen.getByRole("button", { name: "Estou devendo" }));
    expect(screen.getByText("−R$ 50,00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvarConta.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Itau",
        saldoInicial: -5000,
      }),
    );
  });

  it("reabre conta existente com saldo negativo", () => {
    montar("c1");
    expect(screen.getByText("−R$ 50,00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Estou devendo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("alterna de volta para crédito pelo teclado", async () => {
    montar();
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Nome"), "Caixa");
    await digitarCentavos("1800");
    await user.click(screen.getByRole("button", { name: "Alternar sinal do saldo" }));
    expect(screen.getByText("−R$ 18,00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Crédito" }));
    expect(screen.getByText("R$ 18,00")).toBeInTheDocument();
  });
});
