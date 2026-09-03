import { describe, expect, it } from "vitest";
import {
  carteiraEhPessoal,
  cartoesAposApagar,
  eDonoDaOrigem,
  filtrarOrigensDaCarteira,
  origemVisivelNaCarteira,
  origensDoPagador,
  visibilidadePadraoDaCarteira,
} from "./visibilidade";

const PESSOAL = { id: "wp", visibilidade: "fechada", rotulo: "pessoal" };
const CONJUNTA = { id: "wj", visibilidade: "aberta", rotulo: "compartilhada" };

describe("visibilidadePadraoDaCarteira", () => {
  it("na pessoal sugere pessoal; na conjunta, conjunta", () => {
    expect(visibilidadePadraoDaCarteira(PESSOAL)).toBe("pessoal");
    expect(visibilidadePadraoDaCarteira(CONJUNTA)).toBe("conjunta");
    expect(carteiraEhPessoal(PESSOAL)).toBe(true);
    expect(carteiraEhPessoal(CONJUNTA)).toBe(false);
  });
});

describe("origemVisivelNaCarteira", () => {
  it("carteira pessoal mostra só pessoal e ambas do dono", () => {
    expect(
      origemVisivelNaCarteira({ visibilidade: "pessoal", donoID: "u1" }, PESSOAL, "u1"),
    ).toBe(true);
    expect(
      origemVisivelNaCarteira({ visibilidade: "ambas", donoID: "u1" }, PESSOAL, "u1"),
    ).toBe(true);
    expect(
      origemVisivelNaCarteira({ visibilidade: "conjunta", donoID: "u1" }, PESSOAL, "u1"),
    ).toBe(false);
    expect(
      origemVisivelNaCarteira({ visibilidade: "pessoal", donoID: "u2" }, PESSOAL, "u1"),
    ).toBe(false);
  });

  it("carteira conjunta mostra conjunta e ambas do dono, nunca a pessoal do parceiro", () => {
    expect(
      origemVisivelNaCarteira({ visibilidade: "conjunta", donoID: "u1" }, CONJUNTA, "u1"),
    ).toBe(true);
    expect(
      origemVisivelNaCarteira({ visibilidade: "ambas", donoID: "u1" }, CONJUNTA, "u1"),
    ).toBe(true);
    expect(
      origemVisivelNaCarteira({ visibilidade: "pessoal", donoID: "u1" }, CONJUNTA, "u1"),
    ).toBe(false);
    expect(
      origemVisivelNaCarteira({ visibilidade: "pessoal", donoID: "u2" }, CONJUNTA, "u1"),
    ).toBe(false);
    expect(
      origemVisivelNaCarteira({ visibilidade: "conjunta", donoID: "u2" }, CONJUNTA, "u1"),
    ).toBe(false);
  });

  it("ambas atravessa as duas carteiras do dono", () => {
    const ambas = { visibilidade: "ambas" as const, donoID: "u1", carteiraID: "wp" };
    expect(origemVisivelNaCarteira(ambas, PESSOAL, "u1")).toBe(true);
    expect(origemVisivelNaCarteira(ambas, CONJUNTA, "u1")).toBe(true);
    expect(origemVisivelNaCarteira(ambas, CONJUNTA, "u2")).toBe(false);
  });

  it("legado sem visibilidade fica só na carteira de origem", () => {
    const legado = { carteiraID: "wj", donoID: "u1" };
    expect(origemVisivelNaCarteira(legado, CONJUNTA, "u1")).toBe(true);
    expect(origemVisivelNaCarteira(legado, PESSOAL, "u1")).toBe(false);
  });
});

describe("origensDoPagador", () => {
  const lista = [
    { id: "eu-j", visibilidade: "conjunta" as const, donoID: "u1" },
    { id: "eu-p", visibilidade: "pessoal" as const, donoID: "u1" },
    { id: "ela-j", visibilidade: "conjunta" as const, donoID: "u2" },
    { id: "ela-p", visibilidade: "pessoal" as const, donoID: "u2" },
    { id: "eu-a", visibilidade: "ambas" as const, donoID: "u1" },
  ];

  it("na conjunta, quem pagou vê só as dele conjunta/ambas", () => {
    expect(origensDoPagador(lista, CONJUNTA, "u1", "u1").map((o) => o.id)).toEqual([
      "eu-j",
      "eu-a",
    ]);
    expect(origensDoPagador(lista, CONJUNTA, "u2", "u1").map((o) => o.id)).toEqual(["ela-j"]);
  });

  it("não quebra se contasTodas/cartoesTodos vieram undefined", () => {
    expect(origensDoPagador(undefined, CONJUNTA, "u1", "u1")).toEqual([]);
    expect(filtrarOrigensDaCarteira(undefined, CONJUNTA, "u1")).toEqual([]);
  });

  it("se o pagador não tem origem visível, volta para as do logado", () => {
    const soPessoalParceiro = lista.filter((o) => o.id === "ela-p" || o.id === "eu-j");
    expect(origensDoPagador(soPessoalParceiro, CONJUNTA, "u2", "u1").map((o) => o.id)).toEqual([
      "eu-j",
    ]);
  });

  it("filtra a lista da carteira atual pelo dono logado", () => {
    expect(filtrarOrigensDaCarteira(lista, CONJUNTA, "u1").map((o) => o.id)).toEqual([
      "eu-j",
      "eu-a",
    ]);
    expect(filtrarOrigensDaCarteira(lista, PESSOAL, "u1").map((o) => o.id)).toEqual([
      "eu-p",
      "eu-a",
    ]);
  });
});

describe("eDonoDaOrigem", () => {
  it("só o dono apaga; legado sem donoID libera", () => {
    expect(eDonoDaOrigem({ donoID: "u1" }, "u1")).toBe(true);
    expect(eDonoDaOrigem({ donoID: "u1" }, "u2")).toBe(false);
    expect(eDonoDaOrigem({}, "u1")).toBe(true);
    expect(eDonoDaOrigem({ donoID: "u1" })).toBe(true);
  });
});

describe("cartoesAposApagar", () => {
  it("some da lista e das faturas ativas sem tocar em outros cartões", () => {
    const cartoes = [
      { id: "k1", visibilidade: "conjunta" as const, donoID: "u1" },
      { id: "k2", visibilidade: "conjunta" as const, donoID: "u1" },
      { id: "k-ela", visibilidade: "pessoal" as const, donoID: "u2" },
    ];
    const faturas = [
      { id: "f1", cartaoID: "k1" },
      { id: "f2", cartaoID: "k2" },
      { id: "f3", cartaoID: "k-ela" },
    ];
    const { cartoesTodos, cartoes: visiveis, faturas: ativas } = cartoesAposApagar(
      cartoes,
      faturas,
      CONJUNTA,
      "k1",
      "u1",
    );
    expect(cartoesTodos.map((c) => c.id)).toEqual(["k2", "k-ela"]);
    expect(visiveis.map((c) => c.id)).toEqual(["k2"]);
    expect(ativas.map((f) => f.id)).toEqual(["f2"]);
  });
});
