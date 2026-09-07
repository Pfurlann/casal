import { describe, expect, it } from "vitest";
import type { Transacao } from "./domain";
import {
  aplicarApagar,
  aplicarApagarEmLote,
  aplicarEdicao,
  ehGrupoParcela,
  idsParaApagar,
  idsParaApagarEmLote,
  idsParaEditar,
} from "./transacoes";

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

  it("transfere o grupo inteiro para outra carteira e cartão", () => {
    const grupo = [
      tx({ id: "1", grupoParcela: "g", parcelaN: 1, parcelaTotal: 2, cartaoID: "k1" }),
      tx({ id: "2", grupoParcela: "g", parcelaN: 2, parcelaTotal: 2, cartaoID: "k1" }),
    ];
    const edicao = {
      id: "1",
      descricao: "Sofá",
      carteiraID: "c2",
      cartaoID: "k2",
    };
    expect(idsParaEditar(grupo, edicao)).toEqual(["1", "2"]);
    const saida = aplicarEdicao(grupo, edicao);
    expect(saida.every((t) => t.carteiraID === "c2" && t.cartaoID === "k2" && !t.contaID)).toBe(true);
    expect(saida[0].descricao).toBe("Sofá");
    expect(saida[1].descricao).toBe("Padaria");
  });

  it("propaga o pagador para o grupo inteiro", () => {
    const grupo = [
      tx({ id: "1", grupoParcela: "g", parcelaN: 1, parcelaTotal: 2, pagadorID: "u1" }),
      tx({ id: "2", grupoParcela: "g", parcelaN: 2, parcelaTotal: 2, pagadorID: "u1" }),
    ];
    const edicao = { id: "1", descricao: "Sofá", pagadorID: "u2" };
    expect(idsParaEditar(grupo, edicao)).toEqual(["1", "2"]);
    const saida = aplicarEdicao(grupo, edicao);
    expect(saida.every((t) => t.pagadorID === "u2")).toBe(true);
    expect(saida[0].descricao).toBe("Sofá");
    expect(saida[1].descricao).toBe("Padaria");
  });

  it("preserva status e metaID ao editar descrição", () => {
    const a = tx({ id: "a", status: "a_pagar", metaID: "g1" });
    const [editada] = aplicarEdicao([a], { id: "a", descricao: "Luz", categoriaID: "cat-1" });
    expect(editada.status).toBe("a_pagar");
    expect(editada.metaID).toBe("g1");
  });

  it("não mexe no resto do grupo se só muda a descrição", () => {
    const grupo = [
      tx({ id: "1", grupoParcela: "g", parcelaN: 1, parcelaTotal: 2, cartaoID: "k1" }),
      tx({ id: "2", grupoParcela: "g", parcelaN: 2, parcelaTotal: 2, cartaoID: "k1" }),
    ];
    expect(idsParaEditar(grupo, { id: "1", descricao: "X", carteiraID: "c1", cartaoID: "k1" })).toEqual(["1"]);
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

describe("idsParaApagarEmLote", () => {
  it("retorna apenas IDs que existem nas transações", () => {
    const lista = [tx({ id: "a" }), tx({ id: "b" }), tx({ id: "c" })];
    expect(idsParaApagarEmLote(lista, { ids: ["a", "c", "x"] })).toEqual(["a", "c"]);
  });

  it("retorna array vazio se nenhum ID existe", () => {
    const lista = [tx({ id: "a" })];
    expect(idsParaApagarEmLote(lista, { ids: ["x", "y"] })).toEqual([]);
  });

  it("retorna todos os IDs pedidos se todos existem", () => {
    const lista = [tx({ id: "a" }), tx({ id: "b" })];
    expect(idsParaApagarEmLote(lista, { ids: ["a", "b"] })).toEqual(["a", "b"]);
  });
});

describe("aplicarApagarEmLote", () => {
  it("remove múltiplas transações de uma vez", () => {
    const lista = [tx({ id: "a" }), tx({ id: "b" }), tx({ id: "c" }), tx({ id: "d" })];
    const resultado = aplicarApagarEmLote(lista, { ids: ["a", "c"] });
    expect(resultado.map((t) => t.id)).toEqual(["b", "d"]);
  });

  it("não faz nada se nenhum ID corresponde", () => {
    const lista = [tx({ id: "a" }), tx({ id: "b" })];
    const resultado = aplicarApagarEmLote(lista, { ids: ["x", "y"] });
    expect(resultado.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("remove todas se todos IDs correspondem", () => {
    const lista = [tx({ id: "a" }), tx({ id: "b" })];
    const resultado = aplicarApagarEmLote(lista, { ids: ["a", "b"] });
    expect(resultado).toEqual([]);
  });
});
