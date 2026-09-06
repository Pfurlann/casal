import { CORES_CARTAO, type Cartao, type Conta, type Transacao } from "./domain";

export const COR_ORIGEM_PADRAO = CORES_CARTAO[0] ?? "#0E0E0C";

export function corValida(cor?: string | null): string {
  if (cor && CORES_CARTAO.includes(cor)) return cor;
  return COR_ORIGEM_PADRAO;
}

export function origemDaTransacao(
  t: Transacao,
  contas: Conta[],
  cartoes: Cartao[],
): { nome: string; cor: string } | null {
  if (t.cartaoID) {
    const cartao = cartoes.find((c) => c.id === t.cartaoID);
    if (!cartao) return { nome: "cartão", cor: COR_ORIGEM_PADRAO };
    return {
      nome: `${cartao.banco} · final ${cartao.ultimos4}`,
      cor: corValida(cartao.cor),
    };
  }
  if (t.contaID) {
    const conta = contas.find((c) => c.id === t.contaID);
    if (!conta) return { nome: "conta", cor: COR_ORIGEM_PADRAO };
    return {
      nome: conta.nome,
      cor: corValida(conta.cor),
    };
  }
  return null;
}
