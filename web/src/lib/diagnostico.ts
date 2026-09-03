import { categoriaPorId } from "./categorias";
import {
  avancando,
  competenciaDe,
  dataLocalISO,
  fechamento,
  rotuloCurto,
  saldoDevedor,
  totalDaFatura,
  vencimento,
  type Cartao,
  type Categoria,
  type Competencia,
  type Compromisso,
  type Conta,
  type Fatura,
  type Meta,
  type Transacao,
} from "./domain";
import {
  alocadoDe,
  ehEconomia,
  economiaDoMes,
  gastoDaCategoria,
  metasAtivas,
  noMes,
  nomeDaMeta,
  progressoReserva,
  progressoTeto,
  saldoLivre,
  type FaixaTeto,
} from "./metas";
import { saldoDaConta, saldoDasContas } from "./contas";
import { formatarBRL, type Centavos } from "./money";

/** 80% do limite — comparação em inteiros, sem float de dinheiro. */
export const ALERTA_LIMITE_X100 = 80;

export type TipoProblema =
  | "teto_estourado"
  | "a_pagar_vencido"
  | "envelope_comido"
  | "cartao_perto_do_limite";

export type Problema = {
  tipo: TipoProblema;
  titulo: string;
  detalhe: string;
  valor?: Centavos;
  href?: string;
};

export type GastoCategoria = {
  categoriaID: string;
  nome: string;
  total: Centavos;
};

export type CartaoDiagnostico = {
  cartaoID: string;
  nome: string;
  fatura: Centavos;
  comprometido: Centavos;
  limite: Centavos;
  usadoX100: number;
};

export type PontoEvolucao = {
  competencia: Competencia;
  rotulo: string;
  gasto: Centavos;
};

export type MetaDiagnostico = {
  metaID: string;
  tipo: Meta["tipo"];
  nome: string;
  alvo: Centavos;
  atual: Centavos;
  faixa: FaixaTeto;
  href: string;
};

export type Diagnostico = {
  competencia: Competencia;
  gasto: Centavos;
  receita: Centavos;
  fluxo: Centavos;
  saldoContas?: Centavos;
  categorias: GastoCategoria[];
  cartoes: CartaoDiagnostico[];
  problemas: Problema[];
  evolucao: PontoEvolucao[];
  metas: MetaDiagnostico[];
  frase: string;
};

/** Parte / todo em pontos percentuais inteiros. Nunca divide dinheiro em float. */
export function percentualInteiro(parte: Centavos, todo: Centavos): number {
  if (todo <= 0) return 0;
  return Math.trunc((parte * 100) / todo);
}

export function acimaDoLimite(usado: Centavos, limite: Centavos, x100 = ALERTA_LIMITE_X100): boolean {
  if (limite <= 0) return false;
  return usado * 100 >= limite * x100;
}

export function totaisDoMes(transacoes: Transacao[], c: Competencia, cartoes: Cartao[] = []): {
  gasto: Centavos;
  receita: Centavos;
  fluxo: Centavos;
} {
  let gasto = 0;
  let receita = 0;
  for (const t of transacoes) {
    if (!noMes(t, c, cartoes)) continue;
    switch (t.tipo) {
      case "despesa":
        gasto += t.valor;
        break;
      case "receita":
        receita += t.valor;
        break;
      case "transferencia":
        break;
      default: {
        const _nunca: never = t.tipo;
        throw new Error(`tipo não tratado: ${_nunca}`);
      }
    }
  }
  return { gasto, receita, fluxo: receita - gasto };
}

export { saldoDasContas } from "./contas";

export function gastosPorCategoria(
  transacoes: Transacao[],
  categorias: Categoria[] | undefined,
  c: Competencia,
  cartoes: Cartao[] = [],
): GastoCategoria[] {
  const totais = new Map<string, Centavos>();
  for (const t of transacoes) {
    if (t.tipo !== "despesa" || !noMes(t, c, cartoes)) continue;
    const id = t.categoriaID ?? "";
    totais.set(id, (totais.get(id) ?? 0) + t.valor);
  }
  return [...totais.entries()]
    .map(([categoriaID, total]) => ({
      categoriaID,
      nome: categoriaPorId(categoriaID, categorias)?.nome ?? "Sem categoria",
      total,
    }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
}

function faturaDoMes(cartao: Cartao, faturas: Fatura[], agora: Date): Fatura {
  const c = competenciaDe(agora);
  const existente = faturas.find((f) => f.cartaoID === cartao.id && f.ano === c.ano && f.mes === c.mes);
  if (existente) return existente;
  return {
    id: cartao.id,
    cartaoID: cartao.id,
    ano: c.ano,
    mes: c.mes,
    fechaEm: fechamento(c, cartao),
    venceEm: vencimento(c, cartao),
    status: "aberta",
    valorPago: 0,
  };
}

export function cartoesDoPeriodo(
  cartoes: Cartao[],
  faturas: Fatura[],
  transacoes: Transacao[],
  agora: Date,
): CartaoDiagnostico[] {
  return cartoes
    .filter((c) => !c.arquivado)
    .map((cartao) => {
      const fatura = faturaDoMes(cartao, faturas, agora);
      const total = totalDaFatura(fatura, transacoes, cartao);
      const comprometido = saldoDevedor(fatura, total);
      return {
        cartaoID: cartao.id,
        nome: `${cartao.banco} · ${cartao.apelido}`,
        fatura: total,
        comprometido,
        limite: cartao.limite,
        usadoX100: percentualInteiro(total, cartao.limite),
      };
    })
    .sort((a, b) => b.fatura - a.fatura || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function evolucaoDeGastos(
  transacoes: Transacao[],
  c: Competencia,
  meses = 6,
  cartoes: Cartao[] = [],
): PontoEvolucao[] {
  const inicio = avancando(c, -(meses - 1));
  return Array.from({ length: meses }, (_, i) => {
    const competencia = avancando(inicio, i);
    return {
      competencia,
      rotulo: rotuloCurto(competencia),
      gasto: totaisDoMes(transacoes, competencia, cartoes).gasto,
    };
  });
}

function diaLocal(iso: string, agora: Date): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dataLocalISO(agora);
  return dataLocalISO(d);
}

export function problemasDoPeriodo(p: {
  transacoes: Transacao[];
  categorias?: Categoria[];
  cartoes: Cartao[];
  faturas: Fatura[];
  contas: Conta[];
  metas: Meta[];
  compromissos: Compromisso[];
  agora: Date;
}): Problema[] {
  const c = competenciaDe(p.agora);
  const hoje = dataLocalISO(p.agora);
  const out: Problema[] = [];

  for (const meta of metasAtivas(p.metas).filter((m) => m.tipo === "teto_categoria" && m.categoriaID)) {
    const gasto = gastoDaCategoria(p.transacoes, meta.categoriaID ?? "", c, p.cartoes);
    const prog = progressoTeto(meta.valorAlvo, gasto);
    if (prog.faixa !== "estouro") continue;
    const nome = categoriaPorId(meta.categoriaID, p.categorias)?.nome ?? nomeDaMeta(meta, p.categorias);
    const passou = gasto - meta.valorAlvo;
    out.push({
      tipo: "teto_estourado",
      titulo: `${nome} no teto`,
      detalhe: passou > 0 ? `estourou em ${formatarBRL(passou)}` : "chegou no teto",
      valor: passou > 0 ? passou : gasto,
      href: `/metas/${meta.id}`,
    });
  }

  for (const comp of p.compromissos) {
    if (comp.status !== "a_pagar") continue;
    if (comp.venceEm >= hoje) continue;
    out.push({
      tipo: "a_pagar_vencido",
      titulo: comp.nome,
      detalhe: `venceu ${comp.venceEm.split("-").reverse().join("/")}`,
      valor: comp.valor,
      href: `/mais/compromissos/${comp.id}`,
    });
  }

  const idsCompromisso = new Set(p.compromissos.map((x) => x.transacaoID));
  for (const t of p.transacoes) {
    if (t.tipo !== "despesa" || t.status !== "a_pagar") continue;
    if (t.cartaoID && !t.hashDedup.startsWith("fatura|")) continue;
    if (idsCompromisso.has(t.id)) continue;
    if (diaLocal(t.data, p.agora) >= hoje) continue;
    out.push({
      tipo: "a_pagar_vencido",
      titulo: t.descricao || "A pagar",
      detalhe: `venceu ${diaLocal(t.data, p.agora).split("-").reverse().join("/")}`,
      valor: t.valor,
      href: `/lancamentos/${t.id}`,
    });
  }

  for (const meta of metasAtivas(p.metas).filter((m) => ehEconomia(m) && m.contaID)) {
    const conta = p.contas.find((x) => x.id === meta.contaID);
    const nome = nomeDaMeta(meta, p.categorias);
    const saldo = conta ? saldoDaConta(conta, p.transacoes) : 0;
    const comidoNaConta = conta ? saldoLivre(saldo, p.metas, conta.id) < 0 : false;
    const gastoEnvelope = p.transacoes
      .filter((t) => t.tipo === "despesa" && t.metaID === meta.id && noMes(t, c, p.cartoes))
      .reduce((s, t) => s + t.valor, 0);
    if (!comidoNaConta && gastoEnvelope <= 0) continue;
    const valor = comidoNaConta && conta
      ? Math.abs(saldoLivre(saldo, p.metas, conta.id))
      : gastoEnvelope;
    out.push({
      tipo: "envelope_comido",
      titulo: `envelope de ${nome}`,
      detalhe: comidoNaConta
        ? `reserva comida em ${formatarBRL(valor)}`
        : `comeu ${formatarBRL(gastoEnvelope)} neste mês`,
      valor,
      href: `/metas/${meta.id}`,
    });
  }

  for (const cartao of cartoesDoPeriodo(p.cartoes, p.faturas, p.transacoes, p.agora)) {
    if (!acimaDoLimite(cartao.fatura, cartao.limite)) continue;
    out.push({
      tipo: "cartao_perto_do_limite",
      titulo: cartao.nome,
      detalhe: `${cartao.usadoX100}% do limite`,
      valor: cartao.fatura,
      href: `/cartoes/${cartao.cartaoID}`,
    });
  }

  return out;
}

export function metasDoPeriodo(
  metas: Meta[],
  transacoes: Transacao[],
  categorias: Categoria[] | undefined,
  c: Competencia,
  cartoes: Cartao[] = [],
): MetaDiagnostico[] {
  const economiaMes = economiaDoMes(transacoes, c, cartoes);
  return metasAtivas(metas).map((meta) => {
    const nome = nomeDaMeta(meta, categorias);
    switch (meta.tipo) {
      case "teto_categoria": {
        const gasto = gastoDaCategoria(transacoes, meta.categoriaID ?? "", c, cartoes);
        const p = progressoTeto(meta.valorAlvo, gasto);
        return {
          metaID: meta.id,
          tipo: meta.tipo,
          nome,
          alvo: meta.valorAlvo,
          atual: gasto,
          faixa: p.faixa,
          href: `/metas/${meta.id}`,
        };
      }
      case "economia_mensal":
      case "objetivo": {
        const temEnvelope = Boolean(meta.contaID);
        const atual = temEnvelope ? alocadoDe(meta) : economiaMes;
        const p = temEnvelope
          ? progressoReserva(meta.valorAlvo, atual)
          : progressoTeto(meta.valorAlvo, Math.max(atual, 0));
        return {
          metaID: meta.id,
          tipo: meta.tipo,
          nome,
          alvo: meta.valorAlvo,
          atual,
          faixa: p.faixa,
          href: `/metas/${meta.id}`,
        };
      }
      default: {
        const _nunca: never = meta.tipo;
        throw new Error(`tipo não tratado: ${_nunca}`);
      }
    }
  });
}

export function fraseDiagnostico(p: {
  gasto: Centavos;
  receita: Centavos;
  problemas: Problema[];
}): string {
  const partes: string[] = [];
  if (p.receita <= 0 && p.gasto <= 0) {
    partes.push("ainda sem movimento neste mês");
  } else if (p.receita <= 0) {
    partes.push("só gastos neste mês; sem receita");
  } else if (p.gasto > p.receita) {
    const pct = percentualInteiro(p.gasto - p.receita, p.receita);
    partes.push(pct > 0 ? `gastos ${pct}% acima da receita` : "gastos acima da receita");
  } else if (p.gasto === p.receita) {
    partes.push("gastos iguais à receita");
  } else {
    const pct = percentualInteiro(p.receita - p.gasto, p.receita);
    partes.push(pct > 0 ? `sobra ${pct}% da receita` : "mês no azul");
  }

  const teto = p.problemas.find((x) => x.tipo === "teto_estourado");
  if (teto) partes.push(teto.titulo);
  else {
    const outro = p.problemas[0];
    if (outro) {
      switch (outro.tipo) {
        case "a_pagar_vencido":
          partes.push(`${outro.titulo} vencido`);
          break;
        case "envelope_comido":
          partes.push(outro.titulo);
          break;
        case "cartao_perto_do_limite":
          partes.push(`${outro.titulo} perto do limite`);
          break;
        case "teto_estourado":
          partes.push(outro.titulo);
          break;
        default: {
          const _nunca: never = outro.tipo;
          throw new Error(`tipo não tratado: ${_nunca}`);
        }
      }
    }
  }

  return partes.slice(0, 2).join("; ");
}

export function montarDiagnostico(p: {
  transacoes: Transacao[];
  categorias?: Categoria[];
  cartoes: Cartao[];
  faturas: Fatura[];
  contas: Conta[];
  metas: Meta[];
  compromissos: Compromisso[];
  agora?: Date;
}): Diagnostico {
  const agora = p.agora ?? new Date();
  const competencia = competenciaDe(agora);
  const { gasto, receita, fluxo } = totaisDoMes(p.transacoes, competencia, p.cartoes);
  const problemas = problemasDoPeriodo({ ...p, agora });
  return {
    competencia,
    gasto,
    receita,
    fluxo,
    saldoContas: saldoDasContas(p.contas, p.transacoes),
    categorias: gastosPorCategoria(p.transacoes, p.categorias, competencia, p.cartoes),
    cartoes: cartoesDoPeriodo(p.cartoes, p.faturas, p.transacoes, agora),
    problemas,
    evolucao: evolucaoDeGastos(p.transacoes, competencia, 6, p.cartoes),
    metas: metasDoPeriodo(p.metas, p.transacoes, p.categorias, competencia, p.cartoes),
    frase: fraseDiagnostico({ gasto, receita, problemas }),
  };
}
