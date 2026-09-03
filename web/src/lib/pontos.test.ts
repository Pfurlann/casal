import { describe, expect, it } from "vitest";
import type { Cartao, ProgramaPontos } from "./domain";
import {
  colunasDoPrograma,
  equivalenteEmCentavos,
  formatarMetricaPontos,
  formatarSaldoPontos,
  parseMetricaX100,
  parseSaldoPontos,
  parseValorPontoCentavos,
  programaDeColunas,
  programaDoCartao,
  textoMetricaX100,
  textoValorPonto,
} from "./pontos";

const PROGRAMA: ProgramaPontos = {
  nome: "Livelo",
  saldo: 12500,
  pontosPorUnidadeX100: 220,
  moeda: "usd",
  valorPontoCentavos: 3,
};

describe("métrica racional × 100", () => {
  it("2,2 pts por US$ 1 vira 220", () => {
    expect(parseMetricaX100("2,2")).toBe(220);
    expect(parseMetricaX100("2.2")).toBe(220);
    expect(textoMetricaX100(220)).toBe("2,2");
  });

  it("default é 1 pt por unidade", () => {
    expect(parseMetricaX100("")).toBe(100);
    expect(textoMetricaX100(100)).toBe("1");
  });

  it("1,05 não perde o zero", () => {
    expect(textoMetricaX100(105)).toBe("1,05");
  });
});

describe("saldo informado", () => {
  it("lê só dígitos", () => {
    expect(parseSaldoPontos("12.500")).toBe(12500);
    expect(parseSaldoPontos("12500 pts")).toBe(12500);
  });

  it("formata no pt-BR", () => {
    expect(formatarSaldoPontos(12500)).toBe("12.500");
  });
});

describe("valor do ponto", () => {
  it("0,03 vira 3 centavos", () => {
    expect(parseValorPontoCentavos("0,03")).toBe(3);
    expect(textoValorPonto(3)).toBe("0,03");
  });

  it("vazio omite o equivalente", () => {
    expect(parseValorPontoCentavos("")).toBeUndefined();
    expect(equivalenteEmCentavos({ ...PROGRAMA, valorPontoCentavos: undefined })).toBeUndefined();
  });

  it("12.500 pts a R$ 0,03 = R$ 375,00", () => {
    expect(equivalenteEmCentavos(PROGRAMA)).toBe(37500);
  });
});

describe("colunas do cartão", () => {
  it("salva programa + saldo + pts/USD", () => {
    expect(colunasDoPrograma(PROGRAMA)).toEqual({
      programa_pontos: "Livelo",
      saldo_pontos: 12500,
      pontos_por_unidade_x100: 220,
      moeda_acumulo: "usd",
      valor_ponto_centavos: 3,
    });
  });

  it("lê as colunas de volta", () => {
    expect(programaDeColunas(colunasDoPrograma(PROGRAMA))).toEqual(PROGRAMA);
  });

  it("cartão sem programa zera as colunas", () => {
    expect(colunasDoPrograma(undefined)).toEqual({
      programa_pontos: null,
      saldo_pontos: null,
      pontos_por_unidade_x100: null,
      moeda_acumulo: null,
      valor_ponto_centavos: null,
    });
    expect(programaDeColunas({})).toBeUndefined();
  });
});

describe("programa do cartão", () => {
  it("some quando o nome está vazio", () => {
    const cartao = { programa: { ...PROGRAMA, nome: "  " } } as Pick<Cartao, "programa">;
    expect(programaDoCartao(cartao)).toBeUndefined();
  });

  it("rotula a métrica em português", () => {
    expect(formatarMetricaPontos(PROGRAMA)).toBe("2,2 pts por US$ 1");
    expect(formatarMetricaPontos({ ...PROGRAMA, moeda: "brl", pontosPorUnidadeX100: 100 })).toBe(
      "1 pts por R$ 1",
    );
  });
});
