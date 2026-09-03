import { describe, expect, it } from "vitest";
import {
  carteiraMostraPagador,
  indicadorPagador,
  iniciaisPagador,
  membroPodeEditarLancamento,
  pagadorPadrao,
  rotuloPagador,
} from "./pagador";

const EU = { userId: "u1", email: "eu@casa.br" };
const PARCEIRO = { userId: "u2", email: "ana@casa.br" };

describe("pagadorPadrao", () => {
  it("usa o usuário logado quando ninguém foi escolhido", () => {
    expect(pagadorPadrao(undefined, "u1")).toBe("u1");
  });

  it("mantém a escolha explícita", () => {
    expect(pagadorPadrao("u2", "u1")).toBe("u2");
  });
});

describe("carteiraMostraPagador", () => {
  it("mostra na conjunta e omite na pessoal", () => {
    expect(carteiraMostraPagador({ visibilidade: "aberta", rotulo: "compartilhada" })).toBe(true);
    expect(carteiraMostraPagador({ visibilidade: "fechada", rotulo: "pessoal" })).toBe(false);
    expect(carteiraMostraPagador(undefined)).toBe(false);
  });
});

describe("rotuloPagador", () => {
  it("chama o logado de Você e o outro pelo e-mail ou Parceiro", () => {
    expect(rotuloPagador(EU, "u1")).toBe("Você");
    expect(rotuloPagador(PARCEIRO, "u1")).toBe("ana@casa.br");
    expect(rotuloPagador({ userId: "u2" }, "u1")).toBe("Parceiro");
  });
});

describe("indicadorPagador", () => {
  it("é discreto: você, iniciais ou parceiro", () => {
    expect(indicadorPagador("u1", [EU, PARCEIRO], "u1")).toBe("você");
    expect(indicadorPagador("u2", [EU, PARCEIRO], "u1")).toBe("AN");
    expect(indicadorPagador("u9", [EU], "u1")).toBe("parceiro");
    expect(indicadorPagador(undefined, [EU], "u1")).toBeNull();
  });
});

describe("iniciaisPagador", () => {
  it("pega as duas primeiras letras do e-mail", () => {
    expect(iniciaisPagador(PARCEIRO)).toBe("AN");
    expect(iniciaisPagador({ userId: "x" })).toBe("P");
  });
});

describe("membroPodeEditarLancamento", () => {
  it("libera o membro, não só o dono", () => {
    expect(membroPodeEditarLancamento([EU, { ...PARCEIRO, userId: "u2" }], "u2")).toBe(true);
    expect(membroPodeEditarLancamento([EU], "u2")).toBe(false);
    expect(membroPodeEditarLancamento([], "u2")).toBe(true);
  });
});
