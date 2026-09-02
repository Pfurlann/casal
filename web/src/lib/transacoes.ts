import type { Transacao } from "./domain";

export type EdicaoLancamento = {
  id: string;
  descricao: string;
  categoriaID?: string;
  valor?: number;
};

export type ApagarLancamento = {
  id: string;
  grupo?: boolean;
};

/** Valor só muda em lançamento à vista. Parcelas editam descrição e categoria. */
export function aplicarEdicao(transacoes: Transacao[], p: EdicaoLancamento): Transacao[] {
  return transacoes.map((t) => {
    if (t.id !== p.id) return t;
    const valor =
      t.parcelaTotal === 1 && p.valor != null && p.valor > 0 ? p.valor : t.valor;
    return {
      ...t,
      descricao: p.descricao,
      categoriaID: p.categoriaID,
      valor,
    };
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
