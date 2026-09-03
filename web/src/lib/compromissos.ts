import {
  uuid,
  type Compromisso,
  type StatusCompromisso,
  type Transacao,
} from "./domain";

export function hashDedupCompromisso(id: string): string {
  return `compromisso|${id}`;
}

export function transacaoDoCompromisso(c: Compromisso): Transacao {
  return {
    id: c.transacaoID,
    carteiraID: c.carteiraID,
    tipo: "despesa",
    valor: c.valor,
    data: new Date(`${c.venceEm}T12:00:00`).toISOString(),
    categoriaID: c.categoriaID,
    descricao: c.nome,
    hashDedup: hashDedupCompromisso(c.id),
    parcelaN: 1,
    parcelaTotal: 1,
    status: c.status,
  };
}

export function montarCompromisso(p: {
  id?: string;
  carteiraID: string;
  nome: string;
  valor: number;
  venceEm: string;
  categoriaID: string;
  transacaoID?: string;
  status?: StatusCompromisso;
}): Compromisso {
  const id = p.id ?? uuid();
  return {
    id,
    carteiraID: p.carteiraID,
    nome: p.nome.trim(),
    valor: p.valor,
    venceEm: p.venceEm,
    categoriaID: p.categoriaID,
    transacaoID: p.transacaoID ?? uuid(),
    status: p.status ?? "a_pagar",
  };
}

export function validarCompromisso(p: {
  nome: string;
  valor: number;
  venceEm: string;
  categoriaID?: string;
}): string | null {
  if (!p.nome.trim()) return "Dê um nome para o compromisso.";
  if (!Number.isInteger(p.valor) || p.valor <= 0) return "Informe o valor.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.venceEm)) return "Informe o vencimento.";
  if (!p.categoriaID) return "Escolha a categoria.";
  return null;
}

export function validarLiquidacao(p: { contaID?: string; cartaoID?: string }): string | null {
  if (p.cartaoID && p.contaID) return "Escolha conta ou cartão, não os dois.";
  if (!p.cartaoID && !p.contaID) return "Escolha com o que pagar.";
  return null;
}

/**
 * Liquidar não pede valor de novo: usa o do cadastro.
 * Só grava a origem (conta ou cartão) e passa a liquidado.
 */
export function liquidarCompromisso(
  c: Compromisso,
  tx: Transacao,
  origem: { contaID?: string; cartaoID?: string },
): { compromisso: Compromisso; transacao: Transacao } {
  const erro = validarLiquidacao(origem);
  if (erro) throw new Error(erro);
  if (c.status === "liquidado") throw new Error("Este compromisso já foi liquidado.");
  const cartao = Boolean(origem.cartaoID);
  return {
    compromisso: { ...c, status: "liquidado" },
    transacao: {
      ...tx,
      valor: c.valor,
      contaID: cartao ? undefined : origem.contaID,
      cartaoID: cartao ? origem.cartaoID : undefined,
      status: "liquidado",
    },
  };
}

export function compromissoDaTransacao(
  compromissos: Compromisso[] | undefined,
  transacaoID: string,
): Compromisso | undefined {
  return (compromissos ?? []).find((c) => c.transacaoID === transacaoID);
}

export function compromissosAPagar(lista: Compromisso[] | undefined): Compromisso[] {
  return (lista ?? [])
    .filter((c) => c.status === "a_pagar")
    .sort((a, b) => a.venceEm.localeCompare(b.venceEm) || a.nome.localeCompare(b.nome, "pt-BR"));
}
