import { describe, expect, it } from "vitest";
import { caminhoMarca, corDaMarca, faixaDe, yFundo } from "./marca";

describe("yFundo", () => {
  it("dá a curva mais funda com folga de 40% ou mais", () => {
    expect(yFundo(0.4)).toBe(46);
    expect(yFundo(0.9)).toBe(46);
  });

  it("interpola no meio da faixa de aperto", () => {
    expect(yFundo(0.2)).toBeCloseTo(35.5, 1);
  });

  it("mantém o piso de 25 enquanto ainda há folga", () => {
    expect(yFundo(0.001)).toBeGreaterThanOrEqual(25);
    expect(yFundo(0.15)).toBeCloseTo(32.875, 2);
  });

  it("vira reta exata quando a folga acaba", () => {
    expect(yFundo(0)).toBe(22);
    expect(yFundo(-0.3)).toBe(22);
  });

  it("assume folga larga quando não há dado", () => {
    expect(yFundo(undefined)).toBe(46);
  });
});

describe("corDaMarca", () => {
  it("usa grafite com folga de 15% ou mais", () => {
    expect(corDaMarca(0.36)).toBe("grafite");
    expect(corDaMarca(0.15)).toBe("grafite");
  });

  it("usa ambar quando está no limite", () => {
    expect(corDaMarca(0.05)).toBe("ambar");
  });

  it("usa ambar-texto no estouro", () => {
    expect(corDaMarca(0)).toBe("ambar-texto");
    expect(corDaMarca(-0.1)).toBe("ambar-texto");
  });

  it("usa grafite sem dado", () => {
    expect(corDaMarca(undefined)).toBe("grafite");
  });
});

describe("faixaDe", () => {
  it("separa as três faixas nos limites da spec", () => {
    expect(faixaDe(64)).toBe("grande");
    expect(faixaDe(32)).toBe("grande");
    expect(faixaDe(31)).toBe("medio");
    expect(faixaDe(20)).toBe("medio");
    expect(faixaDe(19)).toBe("pequeno");
    expect(faixaDe(16)).toBe("pequeno");
  });
});

describe("caminhoMarca", () => {
  it("usa o desenho grande com o traço da spec", () => {
    const { d, traco } = caminhoMarca(48, 42);
    expect(d).toBe("M8 22 C20 22 22 42 32 42 C42 42 44 22 56 22");
    expect(traco).toBe(7);
  });

  it("usa o desenho médio, com curso mais curto e traço mais grosso", () => {
    const { d, traco } = caminhoMarca(28, 43);
    expect(d).toBe("M7 21 C18 21 20 43 32 43 C44 43 46 21 57 21");
    expect(traco).toBe(9.5);
  });

  it("usa o desenho pequeno abaixo de 20px", () => {
    const { d, traco } = caminhoMarca(16, 44);
    expect(d).toBe("M6 20 C16 20 18 44 32 44 C46 44 48 20 58 20");
    expect(traco).toBe(13);
  });

  it("aplica o y recebido no desenho, e não um valor fixo", () => {
    expect(caminhoMarca(48, 31).d).toBe(
      "M8 22 C20 22 22 31 32 31 C42 31 44 22 56 22",
    );
  });
});
