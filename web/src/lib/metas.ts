import { categoriaPorId } from "./categorias";
import {
  competenciaDe,
  ROTULO_TIPO_CONTA,
  type Categoria,
  type Competencia,
  type Conta,
  type Meta,
  type TipoMeta,
  type Transacao,
} from "./domain";
import { formatarBRL, type Centavos } from "./money";

export const ALERTA_TETO = 0.8;

export type FaixaTeto = "folga" | "alerta" | "estouro";

export type ProgressoTeto = {
  gasto: Centavos;
  alvo: Centavos;
  resto: Centavos;
  razao: number;
  faixa: FaixaTeto;
};

export function noMes(t: Transacao, c: Competencia): boolean {
  const d = new Date(t.data);
  return d.getFullYear() === c.ano && d.getMonth() + 1 === c.mes;
}

export function gastoDaCategoria(
  transacoes: Transacao[],
  categoriaID: string,
  c: Competencia,
): Centavos {
  return transacoes
    .filter((t) => t.tipo === "despesa" && t.categoriaID === categoriaID && noMes(t, c))
    .reduce((s, t) => s + t.valor, 0);
}

export function economiaDoMes(transacoes: Transacao[], c: Competencia): Centavos {
  return transacoes.filter((t) => noMes(t, c)).reduce((s, t) => {
    switch (t.tipo) {
      case "receita":
        return s + t.valor;
      case "despesa":
        return s - t.valor;
      case "transferencia":
        return s;
      default: {
        const _nunca: never = t.tipo;
        throw new Error(`tipo não tratado: ${_nunca}`);
      }
    }
  }, 0);
}

export function progressoTeto(alvo: Centavos, gasto: Centavos): ProgressoTeto {
  const resto = alvo - gasto;
  const razao = alvo > 0 ? gasto / alvo : 0;
  let faixa: FaixaTeto;
  if (resto <= 0) faixa = "estouro";
  else if (razao >= ALERTA_TETO) faixa = "alerta";
  else faixa = "folga";
  return { gasto, alvo, resto, razao, faixa };
}

export function tetoDaCategoria(metas: Meta[] | undefined, categoriaID: string): Meta | undefined {
  return (metas ?? []).find(
    (m) => m.ativa && m.tipo === "teto_categoria" && m.categoriaID === categoriaID,
  );
}

export function metasAtivas(metas: Meta[] | undefined): Meta[] {
  return (metas ?? []).filter((m) => m.ativa);
}

export function fraseTeto(p: ProgressoTeto, nome: string): string {
  switch (p.faixa) {
    case "estouro": {
      const passou = p.gasto - p.alvo;
      if (passou === 0) return `Chegou no teto de ${nome}.`;
      return `Estourou o teto de ${nome} em ${formatarBRL(passou)}.`;
    }
    case "alerta":
    case "folga":
      return `Sobram ${formatarBRL(p.resto)} no teto de ${nome}.`;
    default: {
      const _nunca: never = p.faixa;
      throw new Error(`faixa não tratada: ${_nunca}`);
    }
  }
}

export function fraseEconomia(economia: Centavos, alvo: Centavos): string {
  if (economia >= alvo) return "A economia do mês bateu a meta.";
  return `Faltam ${formatarBRL(alvo - economia)} para a economia do mês.`;
}

/**
 * Fração da sobra sobre o previsto. Sem meta ativa devolve undefined —
 * a marca fica no estado de folga larga.
 */
export function folgaDoPeriodo(
  metas: Meta[] | undefined,
  transacoes: Transacao[],
  c: Competencia = competenciaDe(new Date()),
): number | undefined {
  const tetos = metasAtivas(metas).filter((m) => m.tipo === "teto_categoria" && m.categoriaID);
  if (tetos.length > 0) {
    const alvo = tetos.reduce((s, m) => s + m.valorAlvo, 0);
    if (alvo <= 0) return undefined;
    const gasto = tetos.reduce(
      (s, m) => s + gastoDaCategoria(transacoes, m.categoriaID ?? "", c),
      0,
    );
    return (alvo - gasto) / alvo;
  }
  const economias = metasAtivas(metas).filter((m) => m.tipo === "economia_mensal");
  if (economias.length === 0) return undefined;
  const alvo = economias.reduce((s, m) => s + m.valorAlvo, 0);
  if (alvo <= 0) return undefined;
  return economiaDoMes(transacoes, c) / alvo;
}

export function nomeDaMeta(meta: Meta, categorias?: Categoria[]): string {
  if (meta.nome.trim()) return meta.nome.trim();
  if (meta.tipo === "teto_categoria") {
    return categoriaPorId(meta.categoriaID, categorias)?.nome ?? "Teto";
  }
  if (meta.tipo === "economia_mensal") return "Economia do mês";
  return "Objetivo";
}

export function validarMeta(p: {
  tipo: TipoMeta;
  nome: string;
  valorAlvo: number;
  categoriaID?: string;
  outras: Meta[];
  id?: string;
}): string | null {
  if (!Number.isInteger(p.valorAlvo) || p.valorAlvo <= 0) return "Informe o valor.";
  const irmas = p.outras.filter((m) => m.ativa && m.id !== p.id);
  switch (p.tipo) {
    case "teto_categoria":
      if (!p.categoriaID) return "Escolha a categoria do teto.";
      if (irmas.some((m) => m.tipo === "teto_categoria" && m.categoriaID === p.categoriaID)) {
        return "Essa categoria já tem teto neste mês.";
      }
      return null;
    case "economia_mensal":
      if (irmas.some((m) => m.tipo === "economia_mensal")) {
        return "Já existe uma economia do mês nesta carteira.";
      }
      return null;
    case "objetivo":
      if (!p.nome.trim()) return "Dê um nome para a meta.";
      return null;
    default: {
      const _nunca: never = p.tipo;
      return `tipo inválido: ${_nunca}`;
    }
  }
}

export function ehEconomia(meta: Meta): boolean {
  return meta.tipo === "economia_mensal" || meta.tipo === "objetivo";
}

export function alocadoDe(meta: Meta): Centavos {
  return meta.alocado ?? 0;
}

export function reservasDaConta(metas: Meta[] | undefined, contaID: string): Meta[] {
  return metasAtivas(metas).filter((m) => ehEconomia(m) && m.contaID === contaID && alocadoDe(m) > 0);
}

export function alocadoNaConta(metas: Meta[] | undefined, contaID: string): Centavos {
  return (metas ?? [])
    .filter((m) => m.ativa && m.contaID === contaID)
    .reduce((s, m) => s + alocadoDe(m), 0);
}

export function saldoLivre(saldo: Centavos, metas: Meta[] | undefined, contaID: string): Centavos {
  return saldo - alocadoNaConta(metas, contaID);
}

export function cabimentoNaConta(
  metas: Meta[] | undefined,
  contaID: string,
  saldo: Centavos,
  metaID?: string,
): Centavos {
  const atual = (metas ?? []).find((m) => m.id === metaID);
  return saldoLivre(saldo, metas, contaID) + (atual?.contaID === contaID ? alocadoDe(atual) : 0);
}

export function validarAlocacao(p: {
  alocado: number;
  livreMaisAtual: number;
}): string | null {
  if (!Number.isInteger(p.alocado) || p.alocado < 0) return "Informe quanto reservar.";
  if (p.alocado > p.livreMaisAtual) return "Não cabe no saldo livre desta conta.";
  return null;
}

export function alocarNaMeta(
  meta: Meta,
  alocado: Centavos,
  livreMaisAtual: Centavos,
): Meta {
  const erro = validarAlocacao({ alocado, livreMaisAtual });
  if (erro) throw new Error(erro);
  return { ...meta, alocado };
}

export function unicaReservaDaConta(metas: Meta[] | undefined, contaID: string): Meta | undefined {
  const reservas = reservasDaConta(metas, contaID);
  return reservas.length === 1 ? reservas[0] : undefined;
}

/**
 * Gastar da conta da meta (ou da reserva marcada) reduz o envelope.
 * Sem transferência fantasma — só baixa `alocado`.
 */
export function aplicarGastoNaReserva(
  metas: Meta[],
  p: { valor: Centavos; contaID?: string; metaID?: string },
): Meta[] {
  if (p.valor <= 0) return metas;
  let alvo: Meta | undefined;
  if (p.metaID) {
    alvo = metas.find((m) => m.id === p.metaID && m.ativa && ehEconomia(m) && alocadoDe(m) > 0);
  } else if (p.contaID) {
    alvo = unicaReservaDaConta(metas, p.contaID);
  }
  if (!alvo) return metas;
  const deduz = Math.min(alocadoDe(alvo), p.valor);
  if (deduz <= 0) return metas;
  return metas.map((m) => (m.id === alvo!.id ? { ...m, alocado: alocadoDe(m) - deduz } : m));
}

export function progressoReserva(alvo: Centavos, alocado: Centavos): ProgressoTeto {
  const resto = alvo - alocado;
  const razao = alvo > 0 ? alocado / alvo : 0;
  let faixa: FaixaTeto;
  if (resto <= 0) faixa = "estouro";
  else if (razao >= ALERTA_TETO) faixa = "alerta";
  else faixa = "folga";
  return { gasto: alocado, alvo, resto, razao, faixa };
}

export function fraseReserva(alocado: Centavos, alvo: Centavos, nome: string): string {
  if (alocado >= alvo) return `A reserva de ${nome} chegou no alvo.`;
  return `Faltam ${formatarBRL(alvo - alocado)} na reserva de ${nome}.`;
}

export function rotuloContaComReserva(conta: Conta, meta: Meta): string {
  return `${conta.nome} · ${formatarBRL(alocadoDe(meta))} na ${nomeDaMeta(meta)}`;
}

export function rotuloContaLivre(conta: Conta, livre: Centavos): string {
  return `${conta.nome} · livre ${formatarBRL(livre)}`;
}

export type OpcaoOrigem = { valor: string; rotulo: string };

export function opcoesContaComReserva(
  contas: Conta[],
  metas: Meta[] | undefined,
): OpcaoOrigem[] {
  const out: OpcaoOrigem[] = [];
  for (const c of contas) {
    const reservas = reservasDaConta(metas, c.id);
    const livre = saldoLivre(c.saldoInicial, metas, c.id);
    if (reservas.length === 0) {
      out.push({ valor: `conta:${c.id}`, rotulo: `${c.nome} · ${ROTULO_TIPO_CONTA[c.tipo]}` });
      continue;
    }
    if (livre > 0) {
      out.push({ valor: `conta:${c.id}`, rotulo: rotuloContaLivre(c, livre) });
    }
    for (const m of reservas) {
      out.push({ valor: `reserva:${c.id}:${m.id}`, rotulo: rotuloContaComReserva(c, m) });
    }
  }
  return out;
}

export function parseOrigemPago(valor: string): {
  contaID?: string;
  cartaoID?: string;
  metaID?: string;
} {
  if (valor.startsWith("cartao:")) return { cartaoID: valor.slice("cartao:".length) };
  if (valor.startsWith("reserva:")) {
    const partes = valor.split(":");
    return { contaID: partes[1], metaID: partes[2] };
  }
  if (valor.startsWith("conta:")) return { contaID: valor.slice("conta:".length) };
  return {};
}

export function valorPagoCom(p: { contaID?: string; cartaoID?: string; metaID?: string }): string {
  if (p.cartaoID) return `cartao:${p.cartaoID}`;
  if (p.metaID && p.contaID) return `reserva:${p.contaID}:${p.metaID}`;
  if (p.contaID) return `conta:${p.contaID}`;
  return "";
}

export function marcarMetaConcluida(meta: Meta): Meta {
  return { ...meta, ativa: false };
}
