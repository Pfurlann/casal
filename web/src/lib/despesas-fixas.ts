import {
  isoDia,
  rotuloDaCompetencia,
  uuid,
  type Competencia,
  type DespesaFixa,
  type Transacao,
} from "./domain";

export type VencimentoFixa = {
  fixa: DespesaFixa;
  venceEm: string;
  lancada: boolean;
};

export function hashDedupFixa(fixaID: string, c: Competencia): string {
  return `fixa|${fixaID}|${rotuloDaCompetencia(c)}`;
}

export function dataVencimento(c: Competencia, dia: number): string {
  return isoDia(c.ano, c.mes, dia);
}

export function jaLancada(transacoes: Transacao[], fixaID: string, c: Competencia): boolean {
  const hash = hashDedupFixa(fixaID, c);
  return transacoes.some((t) => t.hashDedup === hash);
}

export function transacaoDaFixa(fixa: DespesaFixa, c: Competencia): Transacao {
  const dia = dataVencimento(c, fixa.diaVencimento);
  const tipo = fixa.tipo === "receita" ? "receita" : "despesa";
  return {
    id: uuid(),
    carteiraID: fixa.carteiraID,
    tipo,
    valor: fixa.valor,
    data: new Date(`${dia}T12:00:00`).toISOString(),
    categoriaID: fixa.categoriaID,
    descricao: fixa.nome,
    contaID: tipo === "receita" || !fixa.cartaoID ? fixa.contaID : undefined,
    cartaoID: tipo === "receita" ? undefined : fixa.cartaoID,
    hashDedup: hashDedupFixa(fixa.id, c),
    parcelaN: 1,
    parcelaTotal: 1,
  };
}

export function vencimentosDoMes(
  fixas: DespesaFixa[],
  transacoes: Transacao[],
  c: Competencia,
): VencimentoFixa[] {
  return fixas
    .map((fixa) => ({
      fixa,
      venceEm: dataVencimento(c, fixa.diaVencimento),
      lancada: jaLancada(transacoes, fixa.id, c),
    }))
    .sort((a, b) => {
      const porDia = a.fixa.diaVencimento - b.fixa.diaVencimento;
      return porDia !== 0 ? porDia : a.fixa.nome.localeCompare(b.fixa.nome, "pt-BR");
    });
}

export function validarDespesaFixa(p: {
  nome: string;
  valor: number;
  diaVencimento: number;
  contaID?: string;
  cartaoID?: string;
  tipo?: "despesa" | "receita";
}): string | null {
  if (!p.nome.trim()) return "Dê um nome para o lançamento fixo.";
  if (!Number.isInteger(p.valor) || p.valor <= 0) return "Informe o valor.";
  if (!Number.isInteger(p.diaVencimento) || p.diaVencimento < 1 || p.diaVencimento > 31) {
    return "Vencimento precisa ser um dia entre 1 e 31.";
  }
  const tipo = p.tipo === "receita" ? "receita" : "despesa";
  switch (tipo) {
    case "receita":
      if (p.cartaoID) return "Receita entra numa conta, não no cartão.";
      if (!p.contaID) return "Escolha a conta que recebe.";
      return null;
    case "despesa":
      if (p.cartaoID && p.contaID) return "Escolha conta ou cartão, não os dois.";
      if (!p.cartaoID && !p.contaID) return "Escolha como esse valor é pago.";
      return null;
    default: {
      const _nunca: never = tipo;
      return `tipo inválido: ${_nunca}`;
    }
  }
}
