import {
  transacoesDoLancamento,
  type Cartao,
  type TipoTransacao,
  type Transacao,
} from "./domain";

export function cartoesDaLoja(cartoesTodos?: Cartao[], cartoes?: Cartao[]): Cartao[] {
  if (cartoesTodos && cartoesTodos.length > 0) return cartoesTodos;
  return cartoes ?? [];
}

export function cartaoDoLancamento(
  cartaoID: string | undefined,
  tipo: TipoTransacao | undefined,
  cartoes: Cartao[],
): Cartao | undefined {
  if (!cartaoID) return undefined;
  const t = tipo ?? "despesa";
  switch (t) {
    case "receita":
      return undefined;
    case "despesa":
    case "transferencia":
      return cartoes.find((c) => c.id === cartaoID);
    default: {
      const _nunca: never = t;
      throw new Error(`tipo não tratado: ${_nunca}`);
    }
  }
}

export function linhaDaTransacao(t: Transacao) {
  return {
    id: t.id,
    wallet_id: t.carteiraID,
    tipo: t.tipo,
    valor_centavos: t.valor,
    data: t.data,
    category_id: t.categoriaID ?? null,
    descricao: t.descricao,
    account_id: t.contaID ?? null,
    card_id: t.cartaoID ?? null,
    invoice_id: t.faturaID ?? null,
    pagador_id: t.pagadorID ?? null,
    hash_dedup: t.hashDedup,
    grupo_parcela: t.grupoParcela ?? null,
    parcela_n: t.parcelaN,
    parcela_total: t.parcelaTotal,
    status: t.status ?? "a_pagar",
    goal_id: t.metaID ?? null,
  };
}

export function transacoesDaCarteira(txs: Transacao[], carteiraID: string): Transacao[] {
  return txs.filter((t) => t.carteiraID === carteiraID);
}

/** Gasto no cartão: materializa as txs (à vista ou parcelas) já com `card_id`. */
export function transacoesDoGastoNoCartao(p: {
  valor: number;
  descricao: string;
  data: Date;
  cartaoID: string;
  parcelas: number;
  carteiraID: string;
  cartoes: Cartao[];
  categoriaID?: string;
  pagadorID?: string;
}): Transacao[] {
  const cartao = cartaoDoLancamento(p.cartaoID, "despesa", p.cartoes);
  if (!cartao) throw new Error("Não achei esse cartão.");
  return transacoesDoLancamento({
    valor: p.valor,
    descricao: p.descricao,
    data: p.data,
    cartao,
    parcelas: p.parcelas,
    carteiraID: p.carteiraID,
    categoriaID: p.categoriaID,
    pagadorID: p.pagadorID,
    tipo: "despesa",
  }).map((t) => ({ ...t, status: "a_pagar" as const }));
}
