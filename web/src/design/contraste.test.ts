import { describe, expect, it } from "vitest";
import { contraste } from "./contraste";

const CLARO = {
  ar: "#FFFFFF",
  fundo: "#F3F4F9",
  grafite: "#14142B",
  cinza: "#5B6078",
  ambar: "#C98A2E",
  ambarTexto: "#8A5A0F",
  marca: "#6D28D9",
  marcaTexto: "#5B21B6",
  marcaSuave: "#F1EBFE",
  entrada: "#0B7A4B",
  entradaSuave: "#E0F5EA",
  saida: "#C2253A",
  saidaSuave: "#FDE8EB",
};

const ESCURO = {
  ar: "#17142B",
  fundo: "#0C0A1A",
  grafite: "#F2F1FA",
  cinza: "#A8A5C2",
  ambar: "#C98A2E",
  ambarTexto: "#E0A94A",
  marca: "#7C3AED",
  marcaTexto: "#C4B5FD",
  marcaSuave: "#2A2150",
  entrada: "#4ADE80",
  entradaSuave: "#12301F",
  saida: "#FF8591",
  saidaSuave: "#3A1820",
};

describe("pares da marca e semânticos passam AA nos dois temas", () => {
  it.each([
    ["claro", CLARO],
    ["escuro", ESCURO],
  ])("%s", (_nome, t) => {
    expect(contraste("#FFFFFF", t.marca)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.marcaTexto, t.marcaSuave)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.entrada, t.entradaSuave)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.saida, t.saidaSuave)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.cinza, t.fundo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.grafite, t.fundo)).toBeGreaterThanOrEqual(4.5);
  });
});

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
