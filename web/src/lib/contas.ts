import type { Conta, Transacao } from "./domain";
import type { Centavos } from "./money";

/**
 * Saldo atual: inicial + receitas liquidadas − despesas liquidadas
 * (inclui pagamento de fatura). Fixo/conta a_pagar não baixa até o swipe.
 */
export function saldoDaConta(conta: Conta, transacoes: Transacao[]): Centavos {
  let saldo = conta.saldoInicial;
  for (const t of transacoes) {
    if (t.contaID !== conta.id) continue;
    switch (t.tipo) {
      case "receita":
        if (t.status === "liquidado") saldo += t.valor;
        break;
      case "despesa":
        if (t.status === "liquidado") saldo -= t.valor;
        break;
      case "transferencia":
        saldo -= t.valor;
        break;
      default: {
        const _nunca: never = t.tipo;
        throw new Error(`tipo não tratado: ${_nunca}`);
      }
    }
  }
  return saldo;
}

export function saldoDasContas(contas: Conta[], transacoes: Transacao[] = []): Centavos | undefined {
  const ativas = contas.filter((c) => !c.arquivada);
  if (ativas.length === 0) return undefined;
  return ativas.reduce((s, c) => s + saldoDaConta(c, transacoes), 0);
}
