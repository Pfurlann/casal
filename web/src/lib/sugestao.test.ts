import { describe, expect, it } from "vitest";
import { sugerir } from "./sugestao";

const HIST = [
  { descricao: "Mercado Angeloni", conta: "Mercado", portadorId: "elo", pessoa: "Pedro" as const, data: "2026-09-01" },
  { descricao: "Mercado Giassi", conta: "Alimentação", portadorId: "nu", pessoa: "Conjunto" as const, data: "2026-10-05" },
  { descricao: "Pagamento Tim", conta: "Telefone", portadorId: "pb", pessoa: "Pedro" as const, data: "2026-10-02" },
];

describe("sugerir", () => {
  it("usa o lançamento parecido mais recente", () => {
    expect(sugerir("mercado 230", HIST)).toEqual({ conta: "Alimentação", portadorId: "nu", pessoa: "Conjunto" });
  });

  it("ignora acento e maiúscula", () => {
    expect(sugerir("PAGAMENTO TIM", HIST)).toEqual({ conta: "Telefone", portadorId: "pb", pessoa: "Pedro" });
    expect(sugerir("pagamento tím", HIST).conta).toBe("Telefone");
  });

  it("não sugere nada quando nada se parece", () => {
    expect(sugerir("farmácia", HIST)).toEqual({});
    expect(sugerir("   ", HIST)).toEqual({});
  });

  it("não casa por palavras muito curtas", () => {
    expect(sugerir("de", [{ descricao: "Conta de luz", conta: "Luz", data: "2026-10-01" }])).toEqual({});
  });
});
