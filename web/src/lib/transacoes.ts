import type { Transacao } from "./domain";

export type EdicaoLancamento = {
  id: string;
  descricao: string;
  categoriaID?: string;
  /** ISO datetime (meio-dia local) — só a linha tocada; move a fatura sem relançar. */
  data?: string;
  valor?: number;
  carteiraID?: string;
  contaID?: string;
  cartaoID?: string;
  pagadorID?: string;
};

export type ApagarLancamento = {
  id: string;
  grupo?: boolean;
};

function mudaCarteiraOuOrigem(alvo: Transacao, p: EdicaoLancamento): boolean {
  if (p.carteiraID && p.carteiraID !== alvo.carteiraID) return true;
  if (p.cartaoID && p.cartaoID !== (alvo.cartaoID ?? "")) return true;
  if (p.contaID && p.contaID !== (alvo.contaID ?? "")) return true;
  if (p.cartaoID && alvo.contaID && !p.contaID) return true;
  if (p.contaID && alvo.cartaoID && !p.cartaoID) return true;
  return false;
}

function mudaPagador(alvo: Transacao, p: EdicaoLancamento): boolean {
  return Boolean(p.pagadorID && p.pagadorID !== (alvo.pagadorID ?? ""));
}

/** Carteira, origem e pagador novos valem para o grupo inteiro. Descrição e valor, só na linha tocada. */
export function idsParaEditar(transacoes: Transacao[], p: EdicaoLancamento): string[] {
  const alvo = transacoes.find((t) => t.id === p.id);
  if (!alvo) return [];
  if ((mudaCarteiraOuOrigem(alvo, p) || mudaPagador(alvo, p)) && alvo.grupoParcela) {
    return transacoes.filter((t) => t.grupoParcela === alvo.grupoParcela).map((t) => t.id);
  }
  return [alvo.id];
}

/** Valor só muda em lançamento à vista. Data/descrição/categoria só na linha tocada. */
export function aplicarEdicao(transacoes: Transacao[], p: EdicaoLancamento): Transacao[] {
  const ids = new Set(idsParaEditar(transacoes, p));
  return transacoes.map((t) => {
    if (!ids.has(t.id)) return t;
    const tocada = t.id === p.id;
    const valor =
      tocada && t.parcelaTotal === 1 && p.valor != null && p.valor > 0 ? p.valor : t.valor;
    const proxima: Transacao = {
      ...t,
      descricao: tocada ? p.descricao : t.descricao,
      categoriaID: tocada ? p.categoriaID : t.categoriaID,
      data: tocada && p.data ? p.data : t.data,
      valor,
    };
    if (p.carteiraID) proxima.carteiraID = p.carteiraID;
    if (p.pagadorID) proxima.pagadorID = p.pagadorID;
    if (p.cartaoID) {
      proxima.cartaoID = p.cartaoID;
      proxima.contaID = undefined;
    } else if (p.contaID) {
      proxima.contaID = p.contaID;
      proxima.cartaoID = undefined;
    }
    return proxima;
  });
}

export function idsParaApagar(transacoes: Transacao[], p: ApagarLancamento): string[] {
  const alvo = transacoes.find((t) => t.id === p.id);
  if (!alvo) return [];
  if (p.grupo && alvo.grupoParcela) {
    return transacoes.filter((t) => t.grupoParcela === alvo.grupoParcela).map((t) => t.id);
  }
  return [alvo.id];
}

export function aplicarApagar(transacoes: Transacao[], p: ApagarLancamento): Transacao[] {
  const ids = new Set(idsParaApagar(transacoes, p));
  return transacoes.filter((t) => !ids.has(t.id));
}

export function ehGrupoParcela(t: Transacao): boolean {
  return Boolean(t.grupoParcela) && t.parcelaTotal > 1;
}

export type ApagarLancamentosEmLote = {
  ids: string[];
};

export function idsParaApagarEmLote(transacoes: Transacao[], p: ApagarLancamentosEmLote): string[] {
  const existentes = new Set(transacoes.map((t) => t.id));
  return p.ids.filter((id) => existentes.has(id));
}

export function aplicarApagarEmLote(transacoes: Transacao[], p: ApagarLancamentosEmLote): Transacao[] {
  const idsSet = new Set(p.ids);
  return transacoes.filter((t) => !idsSet.has(t.id));
}
