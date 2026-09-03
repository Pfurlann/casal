import {
  competenciaDaCompra,
  competenciaDe,
  chaveCompetencia,
  fechamento,
  rotuloDaCompetencia,
  totalDaFatura,
  uuid,
  vencimento,
  type Cartao,
  type Competencia,
  type Fatura,
  type Transacao,
} from "./domain";

export function hashDedupFatura(cartaoID: string, c: Competencia): string {
  return `fatura|${cartaoID}|${rotuloDaCompetencia(c)}`;
}

export function eLancamentoDeFatura(t: Transacao): boolean {
  return Boolean(t.hashDedup?.startsWith("fatura|"));
}

export function eCompraNoCartao(t: Transacao): boolean {
  return Boolean(t.cartaoID) && !eLancamentoDeFatura(t);
}

/** Compra no cartão e total da fatura: competência do fechamento, não o dia da compra. */
export function competenciaDaTransacao(t: Transacao, cartoes: Cartao[] = []): Competencia {
  if (eLancamentoDeFatura(t)) {
    const parsed = competenciaDoHashFatura(t.hashDedup);
    if (parsed) return parsed.competencia;
  }
  const cartao = t.cartaoID ? cartoes.find((c) => c.id === t.cartaoID) : undefined;
  if (cartao && eCompraNoCartao(t)) return competenciaDaCompra(new Date(t.data), cartao);
  return competenciaDe(new Date(t.data));
}

export function competenciaDoHashFatura(
  hash: string,
): { cartaoID: string; competencia: Competencia } | null {
  const m = /^fatura\|([^|]+)\|(\d{4})-(\d{2})$/.exec(hash);
  if (!m) return null;
  return { cartaoID: m[1]!, competencia: { ano: Number(m[2]), mes: Number(m[3]) } };
}

export function eLancamentoPago(t: Transacao, faturas: Fatura[] = []): boolean {
  if (eCompraNoCartao(t)) return true;
  if (eLancamentoDeFatura(t)) {
    if (t.status === "liquidado") return true;
    const parsed = competenciaDoHashFatura(t.hashDedup);
    const fatura = faturas.find((f) => {
      if (t.faturaID && f.id === t.faturaID) return true;
      if (!parsed) return false;
      return f.cartaoID === parsed.cartaoID && f.ano === parsed.competencia.ano && f.mes === parsed.competencia.mes;
    });
    return fatura?.status === "paga";
  }
  return t.status === "liquidado";
}

export function lancamentoDoTotalDaFatura(
  cartao: Cartao,
  fatura: Fatura,
  transacoes: Transacao[],
  existente?: Transacao,
): Transacao | null {
  const total = totalDaFatura(fatura, transacoes, cartao);
  if (total <= 0 && !existente) return null;
  const pago = fatura.status === "paga" || existente?.status === "liquidado";
  return {
    id: existente?.id ?? uuid(),
    carteiraID: cartao.carteiraID,
    tipo: "despesa",
    valor: total,
    data: new Date(`${fatura.fechaEm}T12:00:00`).toISOString(),
    descricao: `Fatura ${cartao.apelido}`,
    cartaoID: cartao.id,
    faturaID: fatura.id,
    hashDedup: hashDedupFatura(cartao.id, { ano: fatura.ano, mes: fatura.mes }),
    parcelaN: 1,
    parcelaTotal: 1,
    status: pago ? "liquidado" : "a_pagar",
  };
}

function competenciasDoCartao(
  cartao: Cartao,
  faturas: Fatura[],
  transacoes: Transacao[],
): Competencia[] {
  const mapa = new Map<string, Competencia>();
  const add = (c: Competencia) => mapa.set(chaveCompetencia(c), c);
  for (const f of faturas) {
    if (f.cartaoID === cartao.id) add({ ano: f.ano, mes: f.mes });
  }
  for (const t of transacoes) {
    if (t.cartaoID !== cartao.id) continue;
    const parsed = competenciaDoHashFatura(t.hashDedup);
    if (parsed) {
      add(parsed.competencia);
      continue;
    }
    if (t.tipo === "despesa") add(competenciaDaCompra(new Date(t.data), cartao));
  }
  return [...mapa.values()];
}

export function sincronizarTotaisFatura(
  cartoes: Cartao[],
  faturas: Fatura[],
  transacoes: Transacao[],
): { transacoes: Transacao[]; novas: Transacao[]; alteradas: Transacao[] } {
  const porHash = new Map<string, Transacao>();
  for (const t of transacoes) {
    if (eLancamentoDeFatura(t)) porHash.set(t.hashDedup, t);
  }
  const novas: Transacao[] = [];
  const alteradas: Transacao[] = [];
  const upserts = new Map<string, Transacao>();
  for (const cartao of cartoes) {
    for (const c of competenciasDoCartao(cartao, faturas, transacoes)) {
      const fatura = faturas.find((f) => f.cartaoID === cartao.id && f.ano === c.ano && f.mes === c.mes);
      const rascunho: Fatura = fatura ?? {
        id: uuid(),
        cartaoID: cartao.id,
        ano: c.ano,
        mes: c.mes,
        fechaEm: fechamento(c, cartao),
        venceEm: vencimento(c, cartao),
        status: "aberta",
        valorPago: 0,
      };
      const hash = hashDedupFatura(cartao.id, c);
      const existente = porHash.get(hash);
      const proximo = lancamentoDoTotalDaFatura(cartao, rascunho, transacoes, existente);
      if (!proximo) continue;
      upserts.set(hash, proximo);
      if (!existente) novas.push(proximo);
      else if (
        existente.valor !== proximo.valor
        || existente.status !== proximo.status
        || existente.faturaID !== proximo.faturaID
      ) {
        alteradas.push(proximo);
      }
    }
  }
  const idsAlterados = new Set(alteradas.map((t) => t.id));
  const hashesNovos = new Set(novas.map((t) => t.hashDedup));
  const mescladas = transacoes.map((t) => (idsAlterados.has(t.id) ? upserts.get(t.hashDedup)! : t));
  return {
    transacoes: [...mescladas, ...novas.filter((t) => hashesNovos.has(t.hashDedup))],
    novas,
    alteradas,
  };
}
