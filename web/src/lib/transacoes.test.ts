import { describe, expect, it } from "vitest";
import type { Transacao } from "./domain";
import { aplicarApagar, aplicarEdicao, ehGrupoParcela, idsParaApagar } from "./transacoes";

function tx(parcial: Partial<Transacao> & Pick<Transacao, "id">): Transacao {
  return {
    carteiraID: "c1",
    tipo: "despesa",
    valor: 1000,
    data: "2026-09-02T12:00:00.000Z",
    descricao: "Padaria",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    ...parcial,
  };
}

describe("aplicarEdicao", () => {
  it("atualiza descrição, categoria e valor de um lançamento à vista", () => {
    const a = tx({ id: "a", valor: 1000, descricao: "Padaria" });
    const [editada] = aplicarEdicao([a], {
      id: "a",
      descricao: "Mercado",
      categoriaID: "cat-1",
      valor: 21490,
    });
    expect(editada).toMatchObject({
      descricao: "Mercado",
      categoriaID: "cat-1",
      valor: 21490,
    });
  });

  it("não muda o valor de uma parcela do grupo", () => {
    const p = tx({
      id: "p2",
      valor: 3333,
      parcelaN: 2,
      parcelaTotal: 3,
      grupoParcela: "g1",
    });
    const [editada] = aplicarEdicao([p], {
      id: "p2",
      descricao: "Sofá",
      categoriaID: "cat-2",
      valor: 99999,
    });
    expect(editada.valor).toBe(3333);
    expect(editada.descricao).toBe("Sofá");
    expect(editada.categoriaID).toBe("cat-2");
  });
});

describe("aplicarApagar", () => {
  it("remove só a parcela tocada", () => {
    const grupo = [
      tx({ id: "1", grupoParcela: "g", parcelaN: 1, parcelaTotal: 3 }),
      tx({ id: "2", grupoParcela: "g", parcelaN: 2, parcelaTotal: 3 }),
      tx({ id: "3", grupoParcela: "g", parcelaN: 3, parcelaTotal: 3 }),
    ];
    expect(aplicarApagar(grupo, { id: "2" }).map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("remove o parcelamento inteiro quando pedido", () => {
    const grupo = [
      tx({ id: "1", grupoParcela: "g", parcelaN: 1, parcelaTotal: 2 }),
      tx({ id: "2", grupoParcela: "g", parcelaN: 2, parcelaTotal: 2 }),
      tx({ id: "x" }),
    ];
    expect(aplicarApagar(grupo, { id: "1", grupo: true }).map((t) => t.id)).toEqual(["x"]);
  });

  it("lista os ids do grupo para o soft-delete remoto", () => {
    const grupo = [
      tx({ id: "1", grupoParcela: "g", parcelaN: 1, parcelaTotal: 2 }),
      tx({ id: "2", grupoParcela: "g", parcelaN: 2, parcelaTotal: 2 }),
    ];
    expect(idsParaApagar(grupo, { id: "2", grupo: true })).toEqual(["1", "2"]);
  });
});

describe("ehGrupoParcela", () => {
  it("reconhece só grupo com mais de uma parcela", () => {
    expect(ehGrupoParcela(tx({ id: "a", grupoParcela: "g", parcelaTotal: 3 }))).toBe(true);
    expect(ehGrupoParcela(tx({ id: "b" }))).toBe(false);
  });
});
