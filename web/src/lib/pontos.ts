import type { Cartao, MoedaAcumulo, ProgramaPontos } from "./domain";
import type { Centavos } from "./money";

/** Programas comuns no Brasil — o nome livre fica em "Outro". */
export const NOMES_PROGRAMA = [
  "Livelo",
  "Azul",
  "LATAM Pass",
  "Smiles",
  "Nubank Rewards",
] as const;

export type ColunasPrograma = {
  programa_pontos?: string | null;
  saldo_pontos?: number | null;
  pontos_por_unidade_x100?: number | null;
  moeda_acumulo?: string | null;
  valor_ponto_centavos?: number | null;
};

/** Sem nome = cartão sem pontos. */
export function programaVisivel(p?: ProgramaPontos): ProgramaPontos | undefined {
  if (!p) return undefined;
  const nome = p.nome.trim();
  if (!nome) return undefined;
  return { ...p, nome };
}

export function programaDoCartao(c: Pick<Cartao, "programa">): ProgramaPontos | undefined {
  return programaVisivel(c.programa);
}

export function rotuloMoedaAcumulo(moeda: MoedaAcumulo): string {
  switch (moeda) {
    case "usd":
      return "US$ 1";
    case "brl":
      return "R$ 1";
    default: {
      const _nunca: never = moeda;
      return _nunca;
    }
  }
}

/** 220 → "2,2"; 100 → "1"; 105 → "1,05". */
export function textoMetricaX100(x100: number): string {
  const n = Math.abs(Math.trunc(x100));
  const inteiro = Math.trunc(n / 100);
  const frac = n % 100;
  if (frac === 0) return String(inteiro);
  const dec = frac % 10 === 0 ? String(frac / 10) : String(frac).padStart(2, "0");
  return `${inteiro},${dec}`;
}

export function formatarMetricaPontos(p: ProgramaPontos): string {
  return `${textoMetricaX100(p.pontosPorUnidadeX100)} pts por ${rotuloMoedaAcumulo(p.moeda)}`;
}

export function formatarSaldoPontos(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** R$ equivalente ao saldo quando a pessoa informou o valor do ponto. */
export function equivalenteEmCentavos(p: ProgramaPontos): Centavos | undefined {
  if (p.valorPontoCentavos == null || p.valorPontoCentavos <= 0) return undefined;
  return p.saldo * p.valorPontoCentavos;
}

export function parseSaldoPontos(s: string): number {
  const n = Number(s.replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** "2,2" → 220. Vazio ou inválido cai no default 1,00 pt por unidade. */
export function parseMetricaX100(s: string): number {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return 100;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.round(n * 100);
}

export function parseValorPontoCentavos(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100);
}

export function textoValorPonto(centavos?: number): string {
  if (centavos == null || centavos <= 0) return "";
  const reais = Math.trunc(centavos / 100);
  const resto = centavos % 100;
  return `${reais},${String(resto).padStart(2, "0")}`;
}

export function programaDeColunas(c: ColunasPrograma): ProgramaPontos | undefined {
  const nome = c.programa_pontos?.trim();
  if (!nome) return undefined;
  const moeda: MoedaAcumulo = c.moeda_acumulo === "brl" ? "brl" : "usd";
  return {
    nome,
    saldo: c.saldo_pontos ?? 0,
    pontosPorUnidadeX100: c.pontos_por_unidade_x100 && c.pontos_por_unidade_x100 > 0
      ? c.pontos_por_unidade_x100
      : 100,
    moeda,
    valorPontoCentavos: c.valor_ponto_centavos && c.valor_ponto_centavos > 0
      ? c.valor_ponto_centavos
      : undefined,
  };
}

export function colunasDoPrograma(p?: ProgramaPontos): {
  programa_pontos: string | null;
  saldo_pontos: number | null;
  pontos_por_unidade_x100: number | null;
  moeda_acumulo: string | null;
  valor_ponto_centavos: number | null;
} {
  const visivel = programaVisivel(p);
  if (!visivel) {
    return {
      programa_pontos: null,
      saldo_pontos: null,
      pontos_por_unidade_x100: null,
      moeda_acumulo: null,
      valor_ponto_centavos: null,
    };
  }
  return {
    programa_pontos: visivel.nome,
    saldo_pontos: visivel.saldo,
    pontos_por_unidade_x100: visivel.pontosPorUnidadeX100,
    moeda_acumulo: visivel.moeda,
    valor_ponto_centavos: visivel.valorPontoCentavos ?? null,
  };
}

export function escolhaDoPrograma(nome?: string): string {
  if (!nome?.trim()) return "";
  return (NOMES_PROGRAMA as readonly string[]).includes(nome) ? nome : "outro";
}
