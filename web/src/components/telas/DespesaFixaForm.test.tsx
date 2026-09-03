import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DespesaFixaForm } from "./DespesaFixaForm";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empurrar }) }));

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CONTA = {
  id: "a1",
  carteiraID: "w1",
  nome: "Corrente",
  tipo: "corrente" as const,
  saldoInicial: 0,
  arquivada: false,
};

const CARTAO = {
  id: "k1",
  carteiraID: "w1",
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

function montar(extra: Record<string, unknown> = {}, id?: string) {
  empurrar.mockClear();
  loja.valor = {
    carteira: { id: "w1", nome: "Nosso" },
    contas: [CONTA],
    cartoes: [CARTAO],
    despesasFixas: [],
    categorias: [],
    salvarDespesaFixa: vi.fn().mockResolvedValue(undefined),
    apagarDespesaFixa: vi.fn().mockResolvedValue(undefined),
    salvarCategoria: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <DespesaFixaForm id={id} />
    </ProvedorAviso>,
  );
}

describe("DespesaFixaForm", () => {
  it("não salva sem nome e valor", () => {
    montar();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("grava na carteira atual com categoria, vencimento e conta", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarDespesaFixa: salvar });
    await userEvent.type(screen.getByLabelText("Nome"), "Netflix");
    await userEvent.click(screen.getByRole("button", { name: /Assinaturas/ }));
    await userEvent.keyboard("5590");
    await userEvent.selectOptions(screen.getByLabelText("Dia do vencimento"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        carteiraID: "w1",
        nome: "Netflix",
        valor: 5590,
        categoriaID: "00000000-0000-0000-0000-000000000009",
        diaVencimento: 5,
        contaID: "a1",
        cartaoID: undefined,
        tipo: "despesa",
      }),
    );
    expect(empurrar).toHaveBeenCalledWith("/mais/fixas");
  });

  it("aceita cartão como forma de pagamento", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarDespesaFixa: salvar });
    await userEvent.type(screen.getByLabelText("Nome"), "Aluguel");
    await userEvent.click(screen.getByRole("button", { name: /Moradia/ }));
    await userEvent.keyboard("250000");
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), "cartao:k1");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Aluguel",
        cartaoID: "k1",
        contaID: undefined,
      }),
    );
  });

  it("grava receita fixa na conta, sem cartão", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarDespesaFixa: salvar });
    await userEvent.click(screen.getByRole("button", { name: "Receita" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Salário");
    await userEvent.click(screen.getByRole("button", { name: /Salário/ }));
    await userEvent.keyboard("850000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Salário",
        tipo: "receita",
        categoriaID: "00000000-0000-0000-0000-000000000013",
        contaID: "a1",
        cartaoID: undefined,
      }),
    );
  });

  it("apaga a despesa existente", async () => {
    const apagar = vi.fn().mockResolvedValue(undefined);
    montar(
      {
        apagarDespesaFixa: apagar,
        despesasFixas: [
          {
            id: "f1",
            carteiraID: "w1",
            nome: "Aluguel",
            valor: 250_000,
            categoriaID: "00000000-0000-0000-0000-000000000005",
            diaVencimento: 10,
            contaID: "a1",
            tipo: "despesa",
          },
        ],
      },
      "f1",
    );
    expect(screen.getByDisplayValue("Aluguel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apagar fixo" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Apagar fixo" }));
    expect(apagar).toHaveBeenCalledWith("f1");
    expect(empurrar).toHaveBeenCalledWith("/mais/fixas");
  });

  it("grava financiamento com valor por parcela", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarDespesaFixa: salvar });
    await userEvent.type(screen.getByLabelText("Nome"), "Carro");
    await userEvent.click(screen.getByRole("button", { name: /Transporte/ }));
    await userEvent.keyboard("120000");
    await userEvent.click(screen.getByRole("button", { name: "Parcelar" }));
    expect(screen.getByLabelText("Número de parcelas")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Número de parcelas"), "3");
    expect(screen.getByLabelText("Valores das parcelas")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Parcela 1 de 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parcela 3 de 3" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Carro",
        parcelas: 3,
        valoresParcelas: [120_000, 120_000, 120_000],
      }),
    );
  });

  it("mostra o + para criar categoria além das sugeridas", () => {
    montar();
    expect(screen.getByRole("button", { name: "Nova categoria" })).toBeInTheDocument();
  });

  it("cria categoria na folha, mostra o chip e deixa selecionada", async () => {
    const salvarCategoria = vi.fn().mockResolvedValue(undefined);
    montar({ salvarCategoria });
    await userEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    const dialog = screen.getByRole("dialog", { name: "Nova categoria" });
    expect(dialog).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("Nome"), "Pet");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));
    expect(salvarCategoria).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Pet", tipo: "despesa", carteiraID: "w1" }),
    );
    const chip = await screen.findByRole("button", { name: /Pet/ });
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });
});
