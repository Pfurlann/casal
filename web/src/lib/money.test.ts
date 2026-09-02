import { describe, expect, it } from "vitest";
import { dividir, formatarBRL, EntradaValor } from "./money";

describe("dividir", () => {
  it("põe a sobra na primeira parcela", () => {
    expect(dividir(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it("divide exato quando não há sobra", () => {
    expect(dividir(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it("devolve vazio para zero partes", () => {
    expect(dividir(10000, 0)).toEqual([]);
  });
});

describe("formatarBRL", () => {
  it("formata com separador de milhar pt-BR", () => {
    expect(formatarBRL(428310)).toBe("R$ 4.283,10");
  });

  it("marca negativo com sinal de menos", () => {
    expect(formatarBRL(-1800)).toBe("−R$ 18,00");
  });

  it("preenche centavos com zero à esquerda", () => {
    expect(formatarBRL(105)).toBe("R$ 1,05");
  });
});

describe("EntradaValor", () => {
  it("digita da direita para a esquerda em centavos", () => {
    const e = new EntradaValor();
    e.digitar(2);
    e.digitar(1);
    e.digitar(4);
    e.digitar(9);
    expect(e.centavos).toBe(2149);
    // Quatro dígitos num teclado de centavos são R$ 21,49, não R$ 214,90.
    expect(formatarBRL(e.centavos)).toBe("R$ 21,49");
  });

  it("apaga o último dígito", () => {
    const e = EntradaValor.deCentavos(21490);
    e.apagar();
    expect(e.centavos).toBe(2149);
  });

  it("não permite salvar valor zero", () => {
    expect(new EntradaValor().podeSalvar).toBe(false);
  });
});
