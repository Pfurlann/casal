import { describe, expect, it } from "vitest";
import { saldosPorPortador, type MovPortador, type Portador } from "./portadores";

const PAGBANK: Portador = { id: "pb", dono: "Pedro", instituicao: "Pagbank", tipo: "conta", nome: "Pedro - Pagbank" };
const NUBANK: Portador = { id: "nu", dono: "PHF", instituicao: "Nubank", tipo: "conta", nome: "PHF - Nubank" };
const ELO: Portador = { id: "elo", dono: "Pedro", instituicao: "Elo", tipo: "cartao", nome: "Nanquim Elo - Pedro" };

const mov = (o: Partial<MovPortador>): MovPortador => ({
  portadorId: "pb",
  data: "2026-10-01",
  valor: 0,
  status: "Pago",
  natureza: "resultado",
  ...o,
});

const HOJE = "2026-10-15";

describe("saldosPorPortador", () => {
  it("o saldo de hoje soma só o que está Pago e já aconteceu, inclusive o saldo inicial", () => {
    const r = saldosPorPortador({
      portadores: [PAGBANK],
      movs: [
        mov({ valor: 100000, natureza: "movimento" }),
        mov({ valor: -2500 }),
        mov({ valor: -9000, status: "Em Aberto" }),
        mov({ valor: -700, data: "2026-11-02" }),
      ],
      hoje: HOJE,
      meses: 2,
    });
    expect(r.porPortador[0].atual).toBe(97500);
  });

  it("o projetado desconta o que está em aberto ou no futuro até o fim de cada mês", () => {
    const r = saldosPorPortador({
      portadores: [PAGBANK],
      movs: [
        mov({ valor: 100000, natureza: "movimento" }),
        mov({ valor: -9000, status: "Em Aberto", vencimento: "2026-10-30" }),
        mov({ valor: -700, status: "Em Aberto", data: "2026-11-02" }),
      ],
      hoje: HOJE,
      meses: 2,
    });
    expect(r.porPortador[0].projetado).toEqual([91000, 90300]);
  });

  it("compra no cartão em aberto reduz só o projetado do cartão, nunca o atual", () => {
    const r = saldosPorPortador({
      portadores: [ELO],
      movs: [mov({ portadorId: "elo", valor: -30000, status: "Em Aberto", vencimento: "2026-11-10" })],
      hoje: HOJE,
      meses: 2,
    });
    expect(r.porPortador[0].atual).toBe(0);
    expect(r.porPortador[0].projetado).toEqual([0, -30000]);
  });

  it("agrupa por dono e soma o total dos saldos de hoje", () => {
    const r = saldosPorPortador({
      portadores: [PAGBANK, NUBANK],
      movs: [mov({ valor: 5000 }), mov({ portadorId: "nu", valor: 1200 })],
      hoje: HOJE,
      meses: 1,
    });
    expect(r.porPessoa).toEqual({ Pedro: 5000, PHF: 1200 });
    expect(r.total).toBe(6200);
  });

  it("projeta atravessando a virada de ano", () => {
    const r = saldosPorPortador({
      portadores: [PAGBANK],
      movs: [mov({ valor: 1000, natureza: "movimento" }), mov({ valor: -100, status: "Em Aberto", vencimento: "2027-01-05" })],
      hoje: "2026-12-10",
      meses: 2,
    });
    expect(r.porPortador[0].projetado).toEqual([1000, 900]);
  });
});
