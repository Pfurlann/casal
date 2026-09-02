import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lancar } from "./Lancar";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empurrar, back: vi.fn() }) }));

const lancar = vi.hoisted(() => ({ fn: vi.fn() }));
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
  ultimos4: "4417",
  bandeira: "mastercard",
  cor: "grafite",
  limite: 500000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

const CONTA = {
  id: "a1",
  carteiraID: "c1",
  nome: "Corrente",
  tipo: "corrente" as const,
  saldoInicial: 0,
  arquivada: false,
};

function montar(opts?: { cartoes?: typeof CARTAO[]; contas?: typeof CONTA[] }) {
  empurrar.mockClear();
  loja.valor = {
    cartoes: opts?.cartoes ?? [],
    contas: opts?.contas ?? [CONTA],
    lancar: lancar.fn,
  };
  return render(
    <ProvedorAviso>
      <Lancar />
    </ProvedorAviso>,
  );
}

describe("Lancar", () => {
  it("começa em zero e não deixa salvar", () => {
    montar();
    expect(screen.getByText(/R\$ 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("monta o valor pelo teclado físico e habilita o salvar", async () => {
    montar();
    await userEvent.keyboard("21490");
    expect(screen.getByText(/214/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("grava o lançamento na conta padrão com a categoria escolhida", async () => {
    lancar.fn.mockClear();
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 1000,
        categoriaID: "00000000-0000-0000-0000-000000000002",
        contaID: CONTA.id,
        cartaoID: undefined,
        parcelas: 1,
      }),
    );
  });

  it("não mostra linha de teto enquanto Metas não existe", async () => {
    montar();
    await userEvent.keyboard("1000");
    expect(screen.queryByText(/teto/i)).toBeNull();
    expect(screen.queryByText(/sobram/i)).toBeNull();
  });

  it("avisa quando a gravação falha, em vez de fechar em silêncio", async () => {
    lancar.fn.mockRejectedValueOnce(new Error("rede"));
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText(/Não deu para salvar/)).toBeInTheDocument();
    expect(empurrar).not.toHaveBeenCalled();
  });

  it("sem contas nem cartões, pede cadastro e não deixa salvar", async () => {
    montar({ contas: [], cartoes: [] });
    await userEvent.keyboard("1000");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByRole("link", { name: "Cadastrar conta" })).toHaveAttribute(
      "href",
      "/mais/contas/novo",
    );
    expect(screen.queryByLabelText("Forma de pagamento")).toBeNull();
  });

  it("sem contas, ainda deixa escolher um cartão", async () => {
    montar({ contas: [], cartoes: [CARTAO] });
    await userEvent.keyboard("1000");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByRole("link", { name: "Cadastrar conta" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `cartao:${CARTAO.id}`);
    await userEvent.click(screen.getByRole("button", { name: "Pronto" }));
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("abre mais opções no lugar do teclado, com conta, cartão e parcelas", async () => {
    montar({ cartoes: [CARTAO] });
    await userEvent.keyboard("10000");
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByRole("heading", { name: "mais opções" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    expect(screen.getByLabelText("Forma de pagamento")).toBeInTheDocument();
    expect(screen.queryByLabelText("Parcelas")).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `cartao:${CARTAO.id}`);
    expect(screen.getByLabelText("Parcelas")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "24x" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Parcelas"), "3");
    expect(screen.getByText(/3x de R\$ 33,34, primeira parcela maior se houver sobra/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Pronto" }));
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "novo gasto" })).toBeInTheDocument();
  });

  it("grava o lançamento no cartão com o número de parcelas, sem conta", async () => {
    lancar.fn.mockClear();
    montar({ cartoes: [CARTAO] });
    await userEvent.keyboard("300000");
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `cartao:${CARTAO.id}`);
    await userEvent.selectOptions(screen.getByLabelText("Parcelas"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Pronto" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 300000,
        cartaoID: CARTAO.id,
        contaID: undefined,
        parcelas: 12,
      }),
    );
  });
});
