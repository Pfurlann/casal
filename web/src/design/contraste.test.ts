import { describe, expect, it } from "vitest";
import { contraste } from "./contraste";

const CLARO = {
  ar: "#FBFAF7",
  grafite: "#0E0E0C",
  cinza: "#6E6E66",
  ambar: "#C98A2E",
  ambarTexto: "#8A5A0F",
};

const ESCURO = {
  ar: "#0E0E0C",
  grafite: "#FBFAF7",
  cinza: "#9A9A90",
  ambar: "#C98A2E",
  ambarTexto: "#E0A94A",
};

describe("contraste", () => {
  it("calcula o par conhecido preto sobre branco", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("é simétrico", () => {
    expect(contraste("#0E0E0C", "#FBFAF7")).toBeCloseTo(
      contraste("#FBFAF7", "#0E0E0C"),
      5,
    );
  });

  it("aceita forma abreviada de três dígitos", () => {
    expect(contraste("#000", "#fff")).toBeCloseTo(21, 1);
  });
});

describe("tokens de texto passam AA no tema claro", () => {
  it.each([
    ["grafite", CLARO.grafite],
    ["cinza", CLARO.cinza],
    ["ambarTexto", CLARO.ambarTexto],
  ])("%s sobre ar tem no mínimo 4,5:1", (_nome, cor) => {
    expect(contraste(cor, CLARO.ar)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("tokens de texto passam AA no tema escuro", () => {
  it.each([
    ["grafite", ESCURO.grafite],
    ["cinza", ESCURO.cinza],
    ["ambarTexto", ESCURO.ambarTexto],
  ])("%s sobre ar tem no mínimo 4,5:1", (_nome, cor) => {
    expect(contraste(cor, ESCURO.ar)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("ambar de preenchimento é reprovado para texto no tema claro", () => {
  it("fica abaixo de 4,5:1, por isso existe o ambar-texto", () => {
    expect(contraste(CLARO.ambar, CLARO.ar)).toBeLessThan(4.5);
  });
});
