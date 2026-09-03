import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { competenciaDe, type DespesaFixa } from "@/lib/domain";
import { hashDedupFixa } from "@/lib/despesas-fixas";
import { Fixas } from "./Fixas";
import { ProvedorAviso } from "../ui/Aviso";

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

const FIXA: DespesaFixa = {
  id: "f1",
  carteiraID: "w1",
  nome: "Aluguel",
  valor: 250_000,
  categoriaID: "00000000-0000-0000-0000-000000000005",
  diaVencimento: 10,
  contaID: "a1",
  tipo: "despesa",
};

function montar(extra: Record<string, unknown> = {}) {
  loja.valor = {
    carteira: { id: "w1", nome: "Nosso" },
    contas: [CONTA],
    cartoes: [],
    transacoes: [],
    despesasFixas: [FIXA],
    lancarDespesaFixa: vi.fn(),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <Fixas />
    </ProvedorAviso>,
  );
}

describe("Fixas", () => {
  it("lista o cadastro mesmo sem lançamento no mês", () => {
    montar();
    expect(screen.getAllByText("Aluguel").length).toBeGreaterThanOrEqual(2);
    const editar = screen.getAllByRole("link", { name: /Aluguel/ });
    expect(editar.length).toBeGreaterThanOrEqual(2);
    for (const link of editar) {
      expect(link).toHaveAttribute("href", "/mais/fixas/f1");
    }
    expect(screen.getByRole("button", { name: "Lançar" })).toBeInTheDocument();
  });

  it("mostra lançada e esconde o botão quando a competência já tem gasto", () => {
    const c = competenciaDe(new Date());
    montar({
      transacoes: [
        {
          id: "t1",
          carteiraID: "w1",
          tipo: "despesa",
          valor: 250_000,
          data: new Date().toISOString(),
          descricao: "Aluguel",
          hashDedup: hashDedupFixa("f1", c),
          parcelaN: 1,
          parcelaTotal: 1,
        },
      ],
    });
    expect(screen.getByText("lançada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lançar" })).toBeNull();
    expect(screen.getAllByText("Aluguel").length).toBeGreaterThanOrEqual(2);
  });

  it("lança o mês sem tirar a linha do cadastro", async () => {
    const lancar = vi.fn().mockResolvedValue(undefined);
    montar({ lancarDespesaFixa: lancar });
    await userEvent.click(screen.getByRole("button", { name: "Lançar" }));
    expect(lancar).toHaveBeenCalledWith("f1", competenciaDe(new Date()));
    expect(screen.getAllByRole("link", { name: /Aluguel/ }).length).toBeGreaterThanOrEqual(2);
  });

  it("oferece cadastro no estado vazio", () => {
    montar({ despesasFixas: [] });
    expect(screen.getByText(/Nenhum fixo/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cadastrar fixo/ })).toHaveAttribute(
      "href",
      "/mais/fixas/nova",
    );
  });
});
