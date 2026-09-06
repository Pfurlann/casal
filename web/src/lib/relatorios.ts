import {
  fraseDiagnostico,
  gastosPorCategoria,
  totaisDoMes,
  type GastoCategoria,
} from "./diagnostico";
import {
  avancando,
  fechamento,
  rotuloCurto,
  saldoDevedor,
  totalDaFatura,
  vencimento,
  type Cartao,
  type Categoria,
  type Competencia,
  type Fatura,
  type Transacao,
} from "./domain";
import { eLancamentoDeFatura } from "./faturas";
import type { Centavos } from "./money";

export type FatiaRelatorio = GastoCategoria;

export type PontoCurvaRelatorio = {
  competencia: Competencia;
  rotulo: string;
  gasto: Centavos;
  receita: Centavos;
  fluxo: Centavos;
};

export type ResumoRelatorio = {
  competencia: Competencia;
  gasto: Centavos;
  receita: Centavos;
  fluxo: Centavos;
  comprometido: Centavos;
  fatias: FatiaRelatorio[];
  curva: PontoCurvaRelatorio[];
  frase: string;
};

export type ResumoMensalCurva = {
  ano: number;
  mes: number;
  despesas: number;
  receitas: number;
};

const TOP_FATIAS = 5;

export function lancamentosDoRelatorio(transacoes: Transacao[]): Transacao[] {
  return transacoes.filter((t) => !eLancamentoDeFatura(t));
}

export function fatiasDaRosca(categorias: GastoCategoria[]): FatiaRelatorio[] {
  if (categorias.length <= TOP_FATIAS) return categorias;
  const cabeca = categorias.slice(0, TOP_FATIAS);
  const resto = categorias.slice(TOP_FATIAS).reduce((s, c) => s + c.total, 0);
  if (resto <= 0) return cabeca;
  return [...cabeca, { categoriaID: "", nome: "Outros", total: resto }];
}

function faturaDoPeriodo(cartao: Cartao, faturas: Fatura[], c: Competencia): Fatura {
  return (
    faturas.find((f) => f.cartaoID === cartao.id && f.ano === c.ano && f.mes === c.mes) ?? {
      id: cartao.id,
      cartaoID: cartao.id,
      ano: c.ano,
      mes: c.mes,
      fechaEm: fechamento(c, cartao),
      venceEm: vencimento(c, cartao),
      status: "aberta",
      valorPago: 0,
    }
  );
}


const MESES_CURVA = 6;

export function curvaDoRelatorio(
  transacoes: Transacao[],
  competencia: Competencia,
  cartoes: Cartao[] = [],
  meses = MESES_CURVA,
): PontoCurvaRelatorio[] {
  const lancamentos = lancamentosDoRelatorio(transacoes);
  const inicio = avancando(competencia, -(meses - 1));
  return Array.from({ length: meses }, (_, i) => {
    const c = avancando(inicio, i);
    const { gasto, receita, fluxo } = totaisDoMes(lancamentos, c, cartoes);
    return { competencia: c, rotulo: rotuloCurto(c), gasto, receita, fluxo };
  });
}

/** Monta a mesma curva a partir dos totais mensais da loja (modo resumo). */
export function curvaDeResumoMensal(
  resumos: ResumoMensalCurva[],
  competencia: Competencia,
  meses = MESES_CURVA,
): PontoCurvaRelatorio[] {
  const mapa = new Map(
    resumos.map((r) => [`${r.ano}-${r.mes}`, r] as const),
  );
  const inicio = avancando(competencia, -(meses - 1));
  return Array.from({ length: meses }, (_, i) => {
    const c = avancando(inicio, i);
    const r = mapa.get(`${c.ano}-${c.mes}`);
    const gasto = r?.despesas ?? 0;
    const receita = r?.receitas ?? 0;
    return {
      competencia: c,
      rotulo: rotuloCurto(c),
      gasto,
      receita,
      fluxo: receita - gasto,
    };
  });
}

export function comprometidoDoPeriodo(
  cartoes: Cartao[],
  faturas: Fatura[],
  transacoes: Transacao[],
  c: Competencia,
): Centavos {
  return cartoes.reduce((s, cartao) => {
    if (cartao.arquivado) return s;
    const f = faturaDoPeriodo(cartao, faturas, c);
    return s + saldoDevedor(f, totalDaFatura(f, transacoes, cartao));
  }, 0);
}

export function montarRelatorio(p: {
  transacoes: Transacao[];
  categorias?: Categoria[];
  cartoes: Cartao[];
  faturas: Fatura[];
  competencia: Competencia;
}): ResumoRelatorio {
  const lancamentos = lancamentosDoRelatorio(p.transacoes);
  const { gasto, receita, fluxo } = totaisDoMes(lancamentos, p.competencia, p.cartoes);
  const categorias = gastosPorCategoria(lancamentos, p.categorias, p.competencia, p.cartoes);
  return {
    competencia: p.competencia,
    gasto,
    receita,
    fluxo,
    comprometido: comprometidoDoPeriodo(p.cartoes, p.faturas, p.transacoes, p.competencia),
    fatias: fatiasDaRosca(categorias),
    curva: curvaDoRelatorio(p.transacoes, p.competencia, p.cartoes),
    frase: fraseDiagnostico({ gasto, receita, problemas: [] }),
  };
}
