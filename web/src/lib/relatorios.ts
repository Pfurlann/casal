import {
  fraseDiagnostico,
  gastosPorCategoria,
  totaisDoMes,
  type GastoCategoria,
} from "./diagnostico";
import {
  fechamento,
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

export type ResumoRelatorio = {
  competencia: Competencia;
  gasto: Centavos;
  receita: Centavos;
  fluxo: Centavos;
  comprometido: Centavos;
  fatias: FatiaRelatorio[];
  frase: string;
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
    frase: fraseDiagnostico({ gasto, receita, problemas: [] }),
  };
}
