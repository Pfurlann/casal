import type { Natureza, Pessoa } from "./domain";
import type { Centavos } from "./money";

export type Portador = {
  id: string;
  dono: Pessoa;
  instituicao: string;
  tipo: "conta" | "cartao";
  nome: string;
};

/** Movimento financeiro de um portador. Valor: positivo entra, negativo sai. */
export type MovPortador = {
  portadorId: string;
  /** ISO (aceita data com hora). */
  data: string;
  vencimento?: string;
  valor: Centavos;
  status: "Pago" | "Em Aberto";
  natureza: Natureza;
};

export type SaldoPortador = { portador: Portador; atual: Centavos; projetado: Centavos[] };

export type ResultadoSaldos = {
  porPortador: SaldoPortador[];
  porPessoa: Record<string, Centavos>;
  total: Centavos;
};

const dia = (iso: string) => iso.slice(0, 10);

/** "2026-12" + 1 → "2027-01". */
function somarMeses(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const idx = a * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

/**
 * Saldo de hoje (caixa: só o que está Pago e já aconteceu) e saldo projetado ao fim de
 * cada um dos próximos `meses` meses, contando o que está em aberto ou é futuro pelo
 * vencimento (ou pela data, se não houver vencimento). O mês 0 é o mês de `hoje`.
 */
export function saldosPorPortador(args: {
  portadores: Portador[];
  movs: MovPortador[];
  hoje: string;
  meses: number;
}): ResultadoSaldos {
  const { portadores, movs, meses } = args;
  const hoje = dia(args.hoje);
  const mesHoje = hoje.slice(0, 7);

  const porPortador = portadores.map((portador): SaldoPortador => {
    const seus = movs.filter((m) => m.portadorId === portador.id);
    const realizado = (m: MovPortador) => m.status === "Pago" && dia(m.data) <= hoje;

    const atual = seus.filter(realizado).reduce((s, m) => s + m.valor, 0);
    const pendentes = seus.filter((m) => !realizado(m));

    const projetado = Array.from({ length: meses }, (_, i) => {
      const limite = somarMeses(mesHoje, i);
      const ate = pendentes
        .filter((m) => dia(m.vencimento ?? m.data).slice(0, 7) <= limite)
        .reduce((s, m) => s + m.valor, 0);
      return atual + ate;
    });

    return { portador, atual, projetado };
  });

  const porPessoa: Record<string, Centavos> = {};
  for (const p of porPortador) porPessoa[p.portador.dono] = (porPessoa[p.portador.dono] ?? 0) + p.atual;
  const total = porPortador.reduce((s, p) => s + p.atual, 0);

  return { porPortador, porPessoa, total };
}
