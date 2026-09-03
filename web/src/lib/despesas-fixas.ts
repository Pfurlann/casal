import {
  avancando,
  isoDia,
  rotuloDaCompetencia,
  uuid,
  type Cartao,
  type Competencia,
  type DespesaFixa,
  type Transacao,
} from "./domain";
import { validarLiquidacao } from "./compromissos";
import { eCompraNoCartao } from "./faturas";

export const HORIZONTE_FIXOS = 12;

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

export function vezesDaFixa(fixa: DespesaFixa): number {
  const n = fixa.parcelas ?? 1;
  return Number.isInteger(n) && n > 1 ? n : HORIZONTE_FIXOS;
}

export function valorDaParcela(fixa: DespesaFixa, indice: number): number {
  const lista = fixa.valoresParcelas;
  if (lista && lista.length > 0) {
    const v = lista[indice] ?? lista[lista.length - 1];
    if (typeof v === "number" && Number.isInteger(v) && v > 0) return v;
  }
  return fixa.valor;
}

export function competenciasDoHorizonte(fixa: DespesaFixa, desde: Competencia): Competencia[] {
  return Array.from({ length: vezesDaFixa(fixa) }, (_, i) => avancando(desde, i));
}

export function normalizarDesc(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ");
}

export function jaLancada(transacoes: Transacao[], fixaID: string, c: Competencia): boolean {
  const hash = hashDedupFixa(fixaID, c);
  return transacoes.some((t) => t.hashDedup === hash);
}

/** Lançamento do mês que não veio do hash do fixo — mesma descrição, valor e categoria. */
export function matchManualDoMes(
  transacoes: Transacao[],
  fixa: DespesaFixa,
  c: Competencia,
  valor: number,
): Transacao | undefined {
  const nome = normalizarDesc(fixa.nome);
  const tipo = fixa.tipo === "receita" ? "receita" : "despesa";
  const hash = hashDedupFixa(fixa.id, c);
  return transacoes.find((t) => {
    if (t.hashDedup === hash) return false;
    if (t.tipo !== tipo) return false;
    if (t.valor !== valor) return false;
    if (t.categoriaID && t.categoriaID !== fixa.categoriaID) return false;
    const d = new Date(t.data);
    if (d.getFullYear() !== c.ano || d.getMonth() + 1 !== c.mes) return false;
    return normalizarDesc(t.descricao) === nome;
  });
}

export function transacaoDaFixa(
  fixa: DespesaFixa,
  c: Competencia,
  extra?: {
    valor?: number;
    parcelaN?: number;
    parcelaTotal?: number;
    grupoParcela?: string;
    cartao?: Cartao;
  },
): Transacao {
  const tipo = fixa.tipo === "receita" ? "receita" : "despesa";
  const cartao = tipo === "receita" ? undefined : extra?.cartao;
  const dia = cartao ? dataDaFixaNoCartao(c, cartao) : dataVencimento(c, fixa.diaVencimento);
  const parcelaTotal = extra?.parcelaTotal ?? (fixa.parcelas && fixa.parcelas > 1 ? fixa.parcelas : 1);
  const parcelaN = extra?.parcelaN ?? 1;
  return {
    id: uuid(),
    carteiraID: fixa.carteiraID,
    tipo,
    valor: extra?.valor ?? valorDaParcela(fixa, parcelaN - 1),
    data: new Date(`${dia}T12:00:00`).toISOString(),
    categoriaID: fixa.categoriaID,
    descricao: fixa.nome,
    contaID: tipo === "receita" || !fixa.cartaoID ? fixa.contaID : undefined,
    cartaoID: tipo === "receita" ? undefined : fixa.cartaoID,
    hashDedup: hashDedupFixa(fixa.id, c),
    grupoParcela: extra?.grupoParcela,
    parcelaN,
    parcelaTotal,
    status: "a_pagar",
  };
}

export function gerarLancamentosFixos(
  fixas: DespesaFixa[],
  transacoes: Transacao[],
  desde: Competencia,
  cartoes: Cartao[] = [],
): Transacao[] {
  const hashes = new Set(transacoes.map((t) => t.hashDedup));
  const novas: Transacao[] = [];
  for (const fixa of fixas) {
    const comps = competenciasDoHorizonte(fixa, desde);
    const parcelado = (fixa.parcelas ?? 1) > 1;
    const grupo = parcelado ? uuid() : undefined;
    const cartao = cartoes.find((k) => k.id === fixa.cartaoID);
    comps.forEach((c, i) => {
      const hash = hashDedupFixa(fixa.id, c);
      if (hashes.has(hash)) return;
      const valor = valorDaParcela(fixa, i);
      if (matchManualDoMes(transacoes, fixa, c, valor)) return;
      const tx = transacaoDaFixa(fixa, c, {
        valor,
        parcelaN: parcelado ? i + 1 : 1,
        parcelaTotal: parcelado ? (fixa.parcelas ?? comps.length) : 1,
        grupoParcela: grupo,
        cartao,
      });
      hashes.add(hash);
      novas.push(tx);
    });
  }
  return novas;
}

export { eLancamentoPago } from "./faturas";

export function liquidarLancamento(
  t: Transacao,
  origem: { contaID?: string; cartaoID?: string },
): Transacao {
  if (eCompraNoCartao(t)) throw new Error("Compra no cartão se liquida na fatura.");
  const erro = validarLiquidacao(origem);
  if (erro) throw new Error(erro);
  if (t.status === "liquidado") throw new Error("Este lançamento já foi pago.");
  const cartao = Boolean(origem.cartaoID);
  return {
    ...t,
    contaID: cartao ? undefined : origem.contaID,
    cartaoID: cartao ? origem.cartaoID : undefined,
    status: "liquidado",
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
      lancada: jaLancada(transacoes, fixa.id, c) || Boolean(matchManualDoMes(transacoes, fixa, c, valorDaParcela(fixa, 0))),
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
  parcelas?: number;
  valoresParcelas?: number[];
}): string | null {
  if (!p.nome.trim()) return "Dê um nome para o lançamento fixo.";
  const n = p.parcelas ?? 1;
  if (n > 1) {
    if (!Number.isInteger(n) || n < 2 || n > 48) return "Parcelas entre 2 e 48.";
    const vals = p.valoresParcelas ?? [];
    if (vals.length !== n) return "Informe o valor de cada parcela.";
    if (vals.some((v) => !Number.isInteger(v) || v <= 0)) return "Cada parcela precisa de um valor.";
  } else if (!Number.isInteger(p.valor) || p.valor <= 0) {
    return "Informe o valor.";
  }
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

/** Data do gasto no cartão: no fechamento da competência, para cair na fatura certa. */
export function dataDaFixaNoCartao(c: Competencia, cartao: Cartao): string {
  return isoDia(c.ano, c.mes, cartao.diaFechamento);
}
