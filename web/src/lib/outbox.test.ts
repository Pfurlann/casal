import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  chaveOutbox,
  drenarOutbox,
  eErroRede,
  enfileirarOutbox,
  lerOutbox,
  removerOutbox,
  tamanhoOutbox,
} from "./outbox";

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
  });

  it("drena com sucesso e remove da fila", async () => {
    enfileirarOutbox([{ id: "a" }, { id: "b" }], "u1");
    const sb = {
      from: () => ({
        insert: async () => ({ error: null }),
      }),
    };
    const r = await drenarOutbox(sb, "u1");
    expect(r.enviados).toBe(2);
    expect(r.restam).toBe(0);
    expect(lerOutbox("u1")).toHaveLength(0);
  });

  it("trata 23505 como sucesso", async () => {
    enfileirarOutbox([{ id: "a" }], "u1");
    const sb = {
      from: () => ({
        insert: async () => ({ error: { code: "23505", message: "dup" } }),
      }),
    };
    const r = await drenarOutbox(sb, "u1");
    expect(r.enviados).toBe(1);
    expect(lerOutbox("u1")).toHaveLength(0);
  });

  it("mantém item se o insert falhar", async () => {
    enfileirarOutbox([{ id: "a" }], "u1");
    const sb = {
      from: () => ({
        insert: async () => ({ error: { code: "400", message: "nope" } }),
      }),
    };
    const r = await drenarOutbox(sb, "u1");
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
});
