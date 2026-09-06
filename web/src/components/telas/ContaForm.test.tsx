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
const apagarConta = vi.hoisted(() => ({ fn: vi.fn() }));
const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "w1", nome: "Casa", cor: "grafite", rotulo: "pessoal", visibilidade: "aberta" };

const CONTA_BASE = {
  id: "c1",
  carteiraID: CARTEIRA.id,
  nome: "Nubank",
  tipo: "corrente" as const,
  saldoInicial: -5000,
  arquivada: false,
  donoID: "u1",
};

function montar(id?: string, extra: Record<string, unknown> = {}) {
  empurrar.mockClear();
  salvarConta.fn.mockReset();
  salvarConta.fn.mockResolvedValue(undefined);
  apagarConta.fn.mockReset();
  apagarConta.fn.mockResolvedValue(undefined);
  loja.valor = {
    contas: id ? [{ ...CONTA_BASE, id }] : [],
    carteira: CARTEIRA,
    usuarioID: "u1",
    salvarConta: salvarConta.fn,
    apagarConta: apagarConta.fn,
    ...extra,
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
      apagarConta: apagarConta.fn,
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

  it("oferece importar OFX na conta existente", () => {
    montar("c1");
    expect(screen.getByRole("link", { name: "Importar OFX" })).toHaveAttribute(
      "href",
      "/mais/contas/c1/importar-ofx",
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

describe("ContaForm — apagar", () => {
  it("o dono confirma e chama apagarConta", async () => {
    montar("c1", {
      contas: [{ ...CONTA_BASE, donoID: "u1" }],
    });
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole("button", { name: "Apagar conta" }));
    expect(apagarConta.fn).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: /Apagar conta/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(apagarConta.fn).toHaveBeenCalledWith("c1");
    expect(empurrar).toHaveBeenCalledWith("/mais/contas");
  });

  it("o parceiro não vê Apagar", () => {
    montar("c1", {
      contas: [{ ...CONTA_BASE, donoID: "u2" }],
      usuarioID: "u1",
    });
    expect(screen.queryByRole("button", { name: "Apagar conta" })).toBeNull();
  });

  it("cancelar fecha o confirm sem apagar", async () => {
    montar("c1");
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole("button", { name: "Apagar conta" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(apagarConta.fn).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog", { name: /Apagar conta/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Apagar conta" })).toBeInTheDocument();
  });
});
