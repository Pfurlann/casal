import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CORES_CARTAO } from "@/lib/domain";
import { Relatorios } from "./Relatorios";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "c1", nome: "Nosso", cor: "grafite", rotulo: "compartilhada", visibilidade: "aberta" };

function tx(parcial: Record<string, unknown> = {}) {
  return {
    id: "d",
    carteiraID: "c1",
    tipo: "despesa",
    valor: 112_000,
    data: new Date().toISOString(),
    categoriaID: "00000000-0000-0000-0000-000000000001",
    descricao: "feira",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

function montar(extra: Record<string, unknown> = {}) {
  const { competenciaRota, ...lojaExtra } = extra;
  loja.valor = {
    carteira: CARTEIRA,
    transacoes: [],
    categorias: [],
    cartoes: [],
    faturas: [],
    contas: [],
    metas: [],
    compromissos: [],
    pronto: true,
    modoResumo: false,
    resumoMensal: [],
    ...lojaExtra,
  };
  return render(
    <Relatorios competenciaRota={typeof competenciaRota === "string" ? competenciaRota : undefined} />,
  );
}

describe("Relatorios", () => {
  it("mostra cards, frase seca e seletor de competência", () => {
    montar();
    expect(screen.getByRole("heading", { name: /relatórios · Nosso/ })).toBeInTheDocument();
    expect(screen.getByText(/ainda sem movimento neste mês/)).toBeInTheDocument();
    expect(screen.getByText("gasto")).toBeInTheDocument();
    expect(screen.getByText("receita")).toBeInTheDocument();
    expect(screen.getByText("fluxo")).toBeInTheDocument();
    expect(screen.queryByText("comprometido")).toBeNull();
    expect(screen.getByRole("link", { name: "Mês anterior" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/relatorios\?c=\d{4}-\d{2}$/),
    );
    expect(screen.queryByRole("img", { name: "Gastos por categoria" })).toBeNull();
    expect(screen.getByText("Nenhum movimento neste mês.")).toBeInTheDocument();
  });

  it("mostra a rosca top categoria quando há gasto", () => {
    montar({
      transacoes: [
        tx(),
        tx({ id: "r", tipo: "receita", valor: 100_000, categoriaID: "00000000-0000-0000-0000-000000000013" }),
      ],
    });
    expect(screen.getByText("gastos 12% acima da receita")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Gastos por categoria" })).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
  });

  it("mostra comprometido só quando há saldo devedor", () => {
    const agora = new Date();
    montar({
      cartoes: [
        {
          id: "k1",
          carteiraID: "c1",
          apelido: "Roxinho",
          banco: "Nubank",
          ultimos4: "4417",
          bandeira: "mastercard",
          cor: CORES_CARTAO[0],
          limite: 1_000_000,
          diaFechamento: 28,
          diaVencimento: 5,
          arquivado: false,
        },
      ],
      faturas: [
        {
          id: "f1",
          cartaoID: "k1",
          ano: agora.getFullYear(),
          mes: agora.getMonth() + 1,
          fechaEm: "2026-09-28",
          venceEm: "2026-10-05",
          status: "aberta",
          valorPago: 0,
        },
      ],
      transacoes: [
        tx({
          id: "c",
          valor: 80_000,
          cartaoID: "k1",
          categoriaID: "00000000-0000-0000-0000-000000000001",
        }),
      ],
    });
    expect(screen.getByText("comprometido")).toBeInTheDocument();
  });

  it("mostra loading enquanto a loja não está pronta", () => {
    montar({ pronto: false });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Carregando relatório…")).toBeInTheDocument();
    expect(screen.queryByText("gasto")).toBeNull();
  });

  it("não reabre visão nem curva de 6 meses", () => {
    const { container } = montar({ transacoes: [tx()] });
    expect(container.innerHTML).not.toContain("/visao");
    expect(container.querySelectorAll("[data-barra]")).toHaveLength(0);
    expect(screen.queryByText(/evolução/i)).toBeNull();
  });

  it("respeita a competência da rota", () => {
    montar({
      competenciaRota: "2026-01",
      transacoes: [
        tx({ data: "2026-01-10T15:00:00.000Z" }),
        tx({ id: "set", data: "2026-09-10T15:00:00.000Z", valor: 50_000 }),
      ],
    });
    expect(screen.getByText(/janeiro · 2026/)).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mês anterior" })).toHaveAttribute(
      "href",
      "/relatorios?c=2025-12",
    );
  });
});
