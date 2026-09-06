import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  chaveOutbox,
  drenarOutbox,
  eErroRede,
  enfileirarOp,
  enfileirarOutbox,
  lerOutbox,
  removerOutbox,
  tamanhoOutbox,
  type ClienteOutbox,
} from "./outbox";

function clienteMock(handlers: {
  insert?: () => PromiseLike<{ error: { code?: string; message?: string } | null }>;
  updateEq?: (id: string) => PromiseLike<{ error: { code?: string; message?: string } | null }>;
  updateIn?: (ids: string[]) => PromiseLike<{ error: { code?: string; message?: string } | null }>;
}): ClienteOutbox {
  return {
    from: () => ({
      insert: async (linhas) => {
        void linhas;
        return (handlers.insert ?? (async () => ({ error: null })))();
      },
      update: (patch) => {
        void patch;
        return {
          eq: async (_col, id) =>
            (handlers.updateEq ?? (async () => ({ error: null })))(id),
          in: async (_col, ids) =>
            (handlers.updateIn ?? (async () => ({ error: null })))(ids),
        };
      },
    }),
  };
}

describe("outbox", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("enfileira e lê por usuário", () => {
    enfileirarOutbox([{ id: "a" }], "u1");
    expect(lerOutbox("u1")).toHaveLength(1);
    expect(lerOutbox("u2")).toHaveLength(0);
    expect(tamanhoOutbox("u1")).toBe(1);
    expect(chaveOutbox("u1")).toBe("casal-outbox:u1");
    expect(lerOutbox("u1")[0]?.op).toBe("insert");
    expect(lerOutbox("u1")[0]?.tabela).toBe("transactions");
  });

  it("drena com sucesso e remove da fila", async () => {
    enfileirarOutbox([{ id: "a" }, { id: "b" }], "u1");
    const r = await drenarOutbox(clienteMock({}), "u1");
    expect(r.enviados).toBe(2);
    expect(r.restam).toBe(0);
    expect(lerOutbox("u1")).toHaveLength(0);
  });

  it("trata 23505 como sucesso e reaplica update by id", async () => {
    const updates: string[] = [];
    let insertCalls = 0;
    enfileirarOutbox([{ id: "a", descricao: "Padaria", updated_at: "2026-09-06T12:00:00.000Z" }], "u1");
    const r = await drenarOutbox(
      {
        from: () => ({
          insert: async () => {
            insertCalls += 1;
            return { error: { code: "23505", message: "dup" } };
          },
          update: (patch) => {
            void patch;
            return {
              eq: async (_col: string, id: string) => {
                updates.push(id);
                return { error: null };
              },
              in: async () => ({ error: null }),
            };
          },
        }),
      },
      "u1",
    );
    expect(r.enviados).toBe(1);
    expect(lerOutbox("u1")).toHaveLength(0);
    expect(insertCalls).toBeGreaterThanOrEqual(2); // lote + individual
    expect(updates).toEqual(["a"]);
  });

  it("mantém item se o insert falhar", async () => {
    enfileirarOutbox([{ id: "a" }], "u1");
    const r = await drenarOutbox(
      clienteMock({
        insert: async () => ({ error: { code: "400", message: "nope" } }),
      }),
      "u1",
    );
    expect(r.enviados).toBe(0);
    expect(r.restam).toBe(1);
    expect(lerOutbox("u1")[0]?.tentativas).toBe(1);
  });

  it("remove item pontual", () => {
    const item = enfileirarOutbox([{ id: "a" }], "u1");
    removerOutbox(item.id, "u1");
    expect(lerOutbox("u1")).toHaveLength(0);
  });

  it("eErroRede detecta offline e falha de fetch", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(eErroRede(new Error("x"))).toBe(true);
    vi.stubGlobal("navigator", { onLine: true });
    expect(eErroRede(new Error("Failed to fetch"))).toBe(true);
    expect(eErroRede(new Error("validation"))).toBe(false);
  });

  it("enfileira e drena update de transactions", async () => {
    const visto: string[] = [];
    enfileirarOp(
      {
        op: "update",
        tabela: "transactions",
        ids: ["t1"],
        patch: { descricao: "Padaria", updated_at: "2026-09-06T12:00:00.000Z" },
      },
      "u1",
    );
    expect(tamanhoOutbox("u1")).toBe(1);
    expect(lerOutbox("u1")[0]?.op).toBe("update");
    const r = await drenarOutbox(
      clienteMock({
        updateEq: async (id) => {
          visto.push(id);
          return { error: null };
        },
      }),
      "u1",
    );
    expect(r.enviados).toBe(1);
    expect(visto).toEqual(["t1"]);
    expect(lerOutbox("u1")).toHaveLength(0);
  });

  it("enfileira e drena soft_delete em lote", async () => {
    let idsVistos: string[] = [];
    enfileirarOp(
      {
        op: "soft_delete",
        tabela: "transactions",
        ids: ["a", "b"],
        patch: { deleted_at: "2026-09-06T12:00:00.000Z", updated_at: "2026-09-06T12:00:00.000Z" },
      },
      "u1",
    );
    const r = await drenarOutbox(
      clienteMock({
        updateIn: async (ids) => {
          idsVistos = ids;
          return { error: null };
        },
      }),
      "u1",
    );
    expect(r.enviados).toBe(2);
    expect(idsVistos).toEqual(["a", "b"]);
  });

  it("drena soft_delete de cards/accounts/invoices", async () => {
    for (const tabela of ["cards", "accounts", "invoices"] as const) {
      localStorage.clear();
      enfileirarOp(
        {
          op: "soft_delete",
          tabela,
          ids: ["x1"],
          patch: { deleted_at: "2026-09-06T12:00:00.000Z", updated_at: "2026-09-06T12:00:00.000Z" },
        },
        "u1",
      );
      const r = await drenarOutbox(clienteMock({}), "u1");
      expect(r.enviados).toBe(1);
      expect(lerOutbox("u1")).toHaveLength(0);
    }
  });

  it("normaliza item legado sem op/tabela como insert transactions", () => {
    localStorage.setItem(
      "casal-outbox:u1",
      JSON.stringify([
        {
          id: "old",
          criadoEm: "2026-09-01T00:00:00.000Z",
          tentativas: 0,
          linhas: [{ id: "t1" }],
        },
      ]),
    );
    const item = lerOutbox("u1")[0];
    expect(item?.op).toBe("insert");
    expect(item?.tabela).toBe("transactions");
  });

  it("drena update de commitments", async () => {
    enfileirarOp(
      {
        op: "update",
        tabela: "commitments",
        ids: ["c1"],
        patch: { status: "liquidado", updated_at: "2026-09-06T12:00:00.000Z" },
      },
      "u1",
    );
    const r = await drenarOutbox(clienteMock({}), "u1");
    expect(r.enviados).toBe(1);
    expect(lerOutbox("u1")).toHaveLength(0);
  });
});
