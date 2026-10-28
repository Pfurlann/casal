import { describe, expect, it } from "vitest";
import type { PacoteDfcl } from "./dados-dfcl";
import { gravarPacote, lerMetasEContas, type ClienteRemoto } from "./dfcl-remoto";

const pacote = (qtdMetas: number): PacoteDfcl => ({
  metas: Array.from({ length: qtdMetas }, (_, i) => ({
    competencia: `2026-${String((i % 12) + 1).padStart(2, "0")}`,
    conta: `Conta ${i}`,
    pessoa: "Pedro" as const,
    valor: 1000 + i,
  })),
  contas: [{ nome: "Conta 0", tipo: "Saída", classe: "Fixo" }],
  lancs: [
    {
      competencia: "2026-10",
      conta: "Conta 0",
      pessoa: "Pedro",
      tipo: "Saída",
      valor: 500,
      natureza: "resultado",
      descricao: "x",
      portadorNome: "Nubank - Pedro",
      data: "2026-10-01",
      vencimento: "2026-10-10",
      status: "Pago",
      parcela: 1,
      parcelaTotal: 1,
      formaPagamento: "Cartão",
    },
  ],
  avisos: [],
  importadoEm: "2026-10-28T00:00:00Z",
});

function falso(existentes: string[] = [], falharEm?: string) {
  const chamadas: { tabela: string; op: string; linhas?: unknown[]; opcoes?: unknown }[] = [];
  const sb: ClienteRemoto = {
    from: (tabela) => ({
      upsert: async (linhas, opcoes) => {
        chamadas.push({ tabela, op: "upsert", linhas, opcoes });
        return { data: null, error: falharEm === tabela ? { message: "boom" } : null };
      },
      insert: async (linhas) => {
        chamadas.push({ tabela, op: "insert", linhas });
        return { data: null, error: null };
      },
      select: () => ({
        eq: async () => ({ data: existentes.map((nome) => ({ nome })), error: null }),
      }),
    }),
  };
  return { sb, chamadas };
}

describe("gravarPacote", () => {
  it("grava metas em lotes pela chave única, sem duplicar na repetição", async () => {
    const { sb, chamadas } = falso();
    const r = await gravarPacote(sb, "w1", pacote(450));
    const metas = chamadas.filter((c) => c.tabela === "dfcl_metas");
    expect(metas).toHaveLength(3);
    expect(metas.every((c) => c.op === "upsert")).toBe(true);
    expect(metas[0]!.opcoes).toEqual({ onConflict: "wallet_id,cenario,competencia,conta,pessoa" });
    expect(metas[0]!.linhas![0]).toMatchObject({ wallet_id: "w1", cenario: "C01", valor_centavos: 1000 });
    expect(r).toMatchObject({ metas: 450, contas: 1 });
  });

  it("só cria os portadores que ainda não existem", async () => {
    const novo = falso();
    expect((await gravarPacote(novo.sb, "w1", pacote(1))).portadoresNovos).toBe(1);
    const ins = novo.chamadas.find((c) => c.tabela === "portadores")!;
    expect(ins.linhas![0]).toMatchObject({ wallet_id: "w1", nome: "Nubank - Pedro", dono: "Pedro", tipo: "cartao" });

    const repetido = falso(["Nubank - Pedro"]);
    expect((await gravarPacote(repetido.sb, "w1", pacote(1))).portadoresNovos).toBe(0);
    expect(repetido.chamadas.some((c) => c.tabela === "portadores")).toBe(false);
  });

  it("propaga o erro do banco com o contexto", async () => {
    const { sb } = falso([], "dfcl_metas");
    await expect(gravarPacote(sb, "w1", pacote(1))).rejects.toThrow("metas: boom");
  });
});

describe("lerMetasEContas", () => {
  it("devolve null quando a carteira ainda não tem metas", async () => {
    const sb: ClienteRemoto = {
      from: () => ({
        upsert: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
    };
    expect(await lerMetasEContas(sb, "w1")).toBeNull();
  });

  it("converte as linhas do banco para Meta e ContaDfcl", async () => {
    const sb: ClienteRemoto = {
      from: (tabela) => ({
        upsert: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        select: () => ({
          eq: async () => ({
            data:
              tabela === "dfcl_metas"
                ? [{ competencia: "2026-10", conta: "Aluguel", pessoa: "Pedro", valor_centavos: 5000, cenario: "C01" }]
                : [{ nome: "Aluguel", tipo: "Saída", classe: "Fixo" }],
            error: null,
          }),
        }),
      }),
    };
    expect(await lerMetasEContas(sb, "w1")).toEqual({
      metas: [{ competencia: "2026-10", conta: "Aluguel", pessoa: "Pedro", valor: 5000 }],
      contas: [{ nome: "Aluguel", tipo: "Saída", classe: "Fixo" }],
    });
  });
});
