import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mes } from "./Mes";
import { competenciaDe } from "@/lib/domain";
import { hashDedupFixa } from "@/lib/despesas-fixas";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "c1", nome: "Nosso", cor: "grafite", rotulo: "compartilhada", visibilidade: "aberta" };

function despesa(valor: number, descricao: string, categoriaID: string, id = crypto.randomUUID()) {
  return {
    id,
    carteiraID: "c1",
    tipo: "despesa",
    valor,
    data: new Date().toISOString(),
    categoriaID,
    descricao,
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
  };
}

describe("Mes", () => {
  it("soma só as despesas do mês corrente", () => {
    const mesPassado = new Date();
    mesPassado.setMonth(mesPassado.getMonth() - 1);
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [
        despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001"),
        despesa(1800, "Padaria", "00000000-0000-0000-0000-000000000001"),
        { ...despesa(50000, "Antigo", "00000000-0000-0000-0000-000000000001"), data: mesPassado.toISOString() },
      ],
    };
    render(<Mes />);
    expect(
      screen.getByText((_, el) => el?.textContent === "R$ 232,90" && el.className.includes("text-[36px]")),
    ).toBeInTheDocument();
    expect(screen.queryByText("Antigo")).toBeNull();
  });

  it("lista os lançamentos do mês com a categoria", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001", "tx-1")],
    };
    render(<Mes />);
    expect(screen.getAllByText("Mercado").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Mercado/ })).toHaveAttribute(
      "href",
      "/lancamentos/tx-1",
    );
  });

  it("mostra o estado vazio quando não houve gasto", () => {
    loja.valor = { carteira: CARTEIRA, cartoes: [], faturas: [], transacoes: [] };
    render(<Mes />);
    expect(screen.getByText(/Nenhum gasto/)).toBeInTheDocument();
  });

  it("não usa gradiente em nenhuma superfície", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    const { container } = render(<Mes />);
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("na conjunta, marca quem pagou quando não é óbvio", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      membros: [
        { userId: "u1", email: "eu@casa.br", papel: "dono" },
        { userId: "u2", email: "ana@casa.br", papel: "membro" },
      ],
      usuarioID: "u1",
      transacoes: [
        { ...despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001", "tx-1"), pagadorID: "u2" },
      ],
    };
    render(<Mes />);
    expect(screen.getByText(/Mercado · AN/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mercado/ })).toHaveAttribute(
      "href",
      "/lancamentos/tx-1",
    );
  });

  it("na pessoal, não mostra quem pagou", () => {
    loja.valor = {
      carteira: { ...CARTEIRA, nome: "Meu", rotulo: "pessoal", visibilidade: "fechada" },
      cartoes: [],
      faturas: [],
      membros: [{ userId: "u1", email: "eu@casa.br", papel: "dono" }],
      usuarioID: "u1",
      transacoes: [
        { ...despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001"), pagadorID: "u1" },
      ],
    };
    render(<Mes />);
    expect(screen.queryByText(/você/)).toBeNull();
  });

  it("mostra despesas fixas do mês ainda sem lançamento", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [],
      despesasFixas: [
        {
          id: "f1",
          carteiraID: "c1",
          nome: "Aluguel",
          valor: 250_000,
          categoriaID: "00000000-0000-0000-0000-000000000005",
          diaVencimento: 10,
          contaID: "a1",
          tipo: "despesa",
        },
      ],
      lancarDespesaFixa: vi.fn(),
    };
    render(<Mes />);
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lançar" })).toBeInTheDocument();
  });

  it("mostra receita projetada à parte do gasto e não relança competência", async () => {
    const lancar = vi.fn().mockResolvedValue(undefined);
    const c = competenciaDe(new Date());
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [
        {
          id: "t-sal",
          carteiraID: "c1",
          tipo: "receita",
          valor: 850_000,
          data: new Date().toISOString(),
          categoriaID: "00000000-0000-0000-0000-000000000013",
          descricao: "Salário",
          hashDedup: hashDedupFixa("f-sal", c),
          parcelaN: 1,
          parcelaTotal: 1,
        },
      ],
      despesasFixas: [
        {
          id: "f-sal",
          carteiraID: "c1",
          nome: "Salário",
          valor: 850_000,
          categoriaID: "00000000-0000-0000-0000-000000000013",
          diaVencimento: 5,
          contaID: "a1",
          tipo: "receita",
        },
        {
          id: "f-luz",
          carteiraID: "c1",
          nome: "Luz",
          valor: 20_000,
          categoriaID: "00000000-0000-0000-0000-000000000005",
          diaVencimento: 10,
          contaID: "a1",
          tipo: "despesa",
        },
      ],
      lancarDespesaFixa: lancar,
    };
    render(<Mes />);
    expect(screen.getByText("receita neste mês")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lançar" })).toBeTruthy();
    expect(screen.getByText("Luz")).toBeInTheDocument();
    expect(screen.getAllByText("Salário").length).toBeGreaterThanOrEqual(1);
    await userEvent.click(screen.getByRole("button", { name: "Lançar" }));
    expect(lancar).toHaveBeenCalledWith("f-luz", c);
    expect(lancar).not.toHaveBeenCalledWith("f-sal", expect.anything());
  });

  it("não deixa cor literal no marcador", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    const { container } = render(<Mes />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
