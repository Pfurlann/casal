import { categoriaPorId } from "./categorias";
import {
  competenciaDe,
  type Categoria,
  type Competencia,
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
      return "Objetivo com aporte entra depois.";
    default: {
      const _nunca: never = p.tipo;
      return `tipo inválido: ${_nunca}`;
    }
  }
}
