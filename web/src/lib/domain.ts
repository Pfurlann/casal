import { dividir, type Centavos } from "./money";

export type TipoConta = "corrente" | "poupanca" | "dinheiro";
export type TipoTransacao = "despesa" | "receita" | "transferencia";
export type StatusFatura = "aberta" | "fechada" | "parcial" | "paga";
export type Bandeira = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "outra";

export type Categoria = {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  tipo: "despesa" | "receita";
  /** Preenchido só em categoria da carteira. Ausente = padrão do sistema. */
  carteiraID?: string;
};

export type RotuloCarteira = "pessoal" | "compartilhada" | "pj";
export type VisibilidadeCarteira = "aberta" | "resumo" | "fechada";
/** Quem vê esta conta/cartão: só o dono, a conjunta, ou as duas carteiras dele. */
export type VisibilidadeOrigem = "pessoal" | "conjunta" | "ambas";

export type Carteira = {
  id: string;
  nome: string;
  cor: string;
  rotulo: RotuloCarteira;
  visibilidade: VisibilidadeCarteira;
};

export type Conta = {
  id: string;
  carteiraID: string;
  nome: string;
  tipo: TipoConta;
  saldoInicial: Centavos;
  arquivada: boolean;
  donoID?: string;
  visibilidade?: VisibilidadeOrigem;
  /** Mesma paleta dos cartões (`CORES_CARTAO`). */
  cor?: string;
};

/** usd = pontos por US$ 1 da fatura (IOF). brl = pontos por R$ 1 gasto. */
export type MoedaAcumulo = "usd" | "brl";

/**
 * Programa de pontos do cartão.
 * Saldo é o que a pessoa informa hoje — o app não consulta o banco.
 * Métrica: pontos × 100 por 1 USD ou 1 BRL (220 = 2,20 pts).
 */
export type ProgramaPontos = {
  nome: string;
  saldo: number;
  pontosPorUnidadeX100: number;
  moeda: MoedaAcumulo;
  valorPontoCentavos?: number;
};

export type Cartao = {
  id: string;
  carteiraID: string;
  apelido: string;
  banco: string;
  ultimos4: string;
  bandeira: Bandeira;
  cor: string;
  limite: Centavos;
  diaFechamento: number;
  diaVencimento: number;
  arquivado: boolean;
  programa?: ProgramaPontos;
  donoID?: string;
  visibilidade?: VisibilidadeOrigem;
};

export type Fatura = {
  id: string;
  cartaoID: string;
  ano: number;
  mes: number;
  fechaEm: string;
  venceEm: string;
  status: StatusFatura;
  valorPago: Centavos;
};

export type StatusLancamento = "liquidado" | "a_pagar";

export type Transacao = {
  id: string;
  carteiraID: string;
  tipo: TipoTransacao;
  valor: Centavos;
  data: string;
  categoriaID?: string;
  descricao: string;
  contaID?: string;
  cartaoID?: string;
  faturaID?: string;
  pagadorID?: string;
  hashDedup: string;
  grupoParcela?: string;
  parcelaN: number;
  parcelaTotal: number;
  status?: StatusLancamento;
  metaID?: string;
};

/** Fixo mensal da carteira. Gera lançamentos no horizonte (ou até a última parcela). */
export type DespesaFixa = {
  id: string;
  carteiraID: string;
  nome: string;
  valor: Centavos;
  categoriaID: string;
  diaVencimento: number;
  contaID?: string;
  cartaoID?: string;
  tipo: "despesa" | "receita";
  /** 1 = todo mês; N = N competências com valor por parcela. */
  parcelas?: number;
  /** Centavos de cada parcela. Tamanho = `parcelas` quando N > 1. */
  valoresParcelas?: Centavos[];
};

/** Teto por categoria, economia do mês ou objetivo de longo prazo. */
export type TipoMeta = "teto_categoria" | "economia_mensal" | "objetivo";
export type PeriodoMeta = "mensal" | "longo_prazo";
export type StatusCompromisso = "a_pagar" | "liquidado";

export type Meta = {
  id: string;
  carteiraID: string;
  tipo: TipoMeta;
  nome: string;
  valorAlvo: Centavos;
  categoriaID?: string;
  periodo: PeriodoMeta;
  dataAlvo?: string;
  ativa: boolean;
  /** Conta do envelope. Sem transferência fantasma — só reserva. */
  contaID?: string;
  /** Centavos reservados nesta conta. Livre da conta = saldo − soma disto. */
  alocado?: Centavos;
};

/** Conta a pagar (boleto, luz deste mês). Já é o lançamento; liquidar só escolhe a origem. */
export type Compromisso = {
  id: string;
  carteiraID: string;
  nome: string;
  valor: Centavos;
  venceEm: string;
  categoriaID: string;
  transacaoID: string;
  status: StatusCompromisso;
};

export type Competencia = { ano: number; mes: number };

export const WALLET_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const CONTA_CORRENTE_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

export const CATEGORIAS: Categoria[] = [
  { id: "00000000-0000-0000-0000-000000000001", nome: "Mercado", icone: "mercado", cor: "#34C759", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000002", nome: "Restaurante", icone: "restaurante", cor: "#FF9F0A", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000003", nome: "Combustível", icone: "combustivel", cor: "#FF453A", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000004", nome: "Transporte", icone: "transporte", cor: "#0A84FF", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000005", nome: "Moradia", icone: "moradia", cor: "#5E5CE6", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000006", nome: "Saúde", icone: "saude", cor: "#FF375F", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000007", nome: "Educação", icone: "educacao", cor: "#64D2FF", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000008", nome: "Lazer", icone: "lazer", cor: "#BF5AF2", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000009", nome: "Assinaturas", icone: "assinaturas", cor: "#FFD60A", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000010", nome: "Vestuário", icone: "vestuario", cor: "#AC8E68", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000011", nome: "Presentes", icone: "presentes", cor: "#FF6482", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000012", nome: "Outros", icone: "outros", cor: "#8E8E93", tipo: "despesa" },
  { id: "00000000-0000-0000-0000-000000000013", nome: "Salário", icone: "salario", cor: "#30D158", tipo: "receita" },
  { id: "00000000-0000-0000-0000-000000000014", nome: "Reembolso", icone: "reembolso", cor: "#66D4CF", tipo: "receita" },
];

export const CORES_CARTAO = ["#7C5CFF", "#8A2BE2", "#FF9F0A", "#FF453A", "#34C759", "#0A84FF", "#2C2C2E"];

export const ROTULO_CARTEIRA: Record<RotuloCarteira, string> = {
  pessoal: "Pessoal",
  compartilhada: "Conjunta",
  pj: "PJ",
};

export const ROTULO_TIPO_CONTA: Record<TipoConta, string> = {
  corrente: "Corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
};

export const ROTULO_BANDEIRA: Record<Bandeira, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "Amex",
  hipercard: "Hipercard",
  outra: "Outra",
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function competenciaDe(data: Date): Competencia {
  return { ano: data.getFullYear(), mes: data.getMonth() + 1 };
}

export function avancando(c: Competencia, meses: number): Competencia {
  const total = c.ano * 12 + (c.mes - 1) + meses;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export function rotuloCurto(c: Competencia): string {
  return MESES[c.mes - 1] ?? "?";
}

export function chaveCompetencia(c: Competencia): string {
  return `${c.ano}-${c.mes}`;
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function isoDia(ano: number, mes: number, dia: number): string {
  const d = Math.min(dia, diasNoMes(ano, mes));
  return `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function competenciaDaCompra(data: Date, cartao: Cartao): Competencia {
  const base = competenciaDe(data);
  return data.getDate() <= cartao.diaFechamento ? base : avancando(base, 1);
}

export function fechamento(c: Competencia, cartao: Cartao): string {
  return isoDia(c.ano, c.mes, cartao.diaFechamento);
}

export function vencimento(c: Competencia, cartao: Cartao): string {
  const alvo = cartao.diaVencimento > cartao.diaFechamento ? c : avancando(c, 1);
  return isoDia(alvo.ano, alvo.mes, cartao.diaVencimento);
}

export function saldoDevedor(fatura: Fatura, total: Centavos): Centavos {
  const resto = total - fatura.valorPago;
  return resto > 0 ? resto : 0;
}

export function aplicarPagamento(fatura: Fatura, pagamento: Centavos, total: Centavos): Fatura {
  if (pagamento <= 0) return fatura;
  const valorPago = fatura.valorPago + pagamento;
  return {
    ...fatura,
    valorPago,
    status: valorPago < total ? "parcial" : "paga",
  };
}

export function totalDaFatura(
  fatura: Fatura,
  transacoes: Transacao[],
  cartao: Cartao,
): Centavos {
  return transacoes
    .filter((t) => t.tipo === "despesa" && t.cartaoID === cartao.id)
    .filter((t) => {
      const c = competenciaDaCompra(new Date(t.data), cartao);
      return c.ano === fatura.ano && c.mes === fatura.mes;
    })
    .reduce((s, t) => s + t.valor, 0);
}

/** Parcelas datadas no fechamento de cada competência. */
export function planejarParcelas(total: Centavos, vezes: number, compraEm: Date, cartao: Cartao) {
  if (vezes <= 0) return [];
  const primeira = competenciaDaCompra(compraEm, cartao);
  const valores = dividir(total, vezes);
  return valores.map((valor, i) => {
    const competencia = avancando(primeira, i);
    return {
      competencia,
      valor,
      numero: i + 1,
      total: vezes,
      data: fechamento(competencia, cartao),
    };
  });
}

/**
 * Materializa o lançamento: à vista vira uma transação; com cartão e
 * `parcelas > 1` vira N despesas do mesmo `grupoParcela`, uma por competência.
 * Cartão não leva `contaID` — a compra mora na fatura. Sem cartão, `parcelas`
 * é ignorado: parcela sem fatura não existe.
 */
export function transacoesDoLancamento(p: {
  valor: Centavos;
  categoriaID?: string;
  descricao: string;
  data: Date;
  cartao?: Cartao;
  contaID?: string;
  parcelas: number;
  carteiraID: string;
  pagadorID?: string;
  tipo?: TipoTransacao;
}): Transacao[] {
  const tipo = p.tipo ?? "despesa";
  let cartao = p.cartao;
  switch (tipo) {
    case "receita":
      cartao = undefined;
      break;
    case "despesa":
    case "transferencia":
      break;
    default: {
      const _nunca: never = tipo;
      throw new Error(`tipo não tratado: ${_nunca}`);
    }
  }
  if (cartao && p.parcelas > 1) {
    const grupo = uuid();
    return planejarParcelas(p.valor, p.parcelas, p.data, cartao).map((parcela) => ({
      id: uuid(),
      carteiraID: p.carteiraID,
      tipo: "despesa" as const,
      valor: parcela.valor,
      data: new Date(`${parcela.data}T12:00:00`).toISOString(),
      categoriaID: p.categoriaID,
      descricao: p.descricao,
      cartaoID: cartao.id,
      pagadorID: p.pagadorID,
      hashDedup: `${p.valor}|${p.descricao}|p${parcela.numero}de${parcela.total}`,
      grupoParcela: grupo,
      parcelaN: parcela.numero,
      parcelaTotal: parcela.total,
    }));
  }
  return [
    {
      id: uuid(),
      carteiraID: p.carteiraID,
      tipo,
      valor: p.valor,
      data: p.data.toISOString(),
      categoriaID: p.categoriaID,
      descricao: p.descricao,
      contaID: cartao ? undefined : p.contaID,
      cartaoID: cartao?.id,
      pagadorID: p.pagadorID,
      hashDedup: `${p.valor}|${p.descricao}|${p.data.toISOString()}`,
      parcelaN: 1,
      parcelaTotal: 1,
    },
  ];
}

/** YYYY-MM-DD no fuso local — valor de `<input type="date">`. */
export function dataLocalISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

/** Interpreta YYYY-MM-DD como meio-dia local, sem virar o dia anterior em UTC. */
export function dataDeLocalISO(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1, 12, 0, 0);
}

export function horizonte(
  quantidade: number,
  desde: Competencia,
  transacoes: Transacao[],
  cartao: Cartao,
): { competencia: Competencia; total: Centavos }[] {
  const totais = new Map<string, Centavos>();
  for (const t of transacoes) {
    if (t.tipo !== "despesa" || t.cartaoID !== cartao.id) continue;
    const c = competenciaDaCompra(new Date(t.data), cartao);
    const k = chaveCompetencia(c);
    totais.set(k, (totais.get(k) ?? 0) + t.valor);
  }
  return Array.from({ length: quantidade }, (_, i) => {
    const competencia = avancando(desde, i);
    return { competencia, total: totais.get(chaveCompetencia(competencia)) ?? 0 };
  });
}

export function inicioDoMes(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function fimDoMes(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export function uuid(): string {
  return crypto.randomUUID();
}

/** Lê o segmento AAAA-MM da rota de pagamento de fatura. */
export function competenciaDaRota(s: string): Competencia {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s);
  if (!m) throw new Error(`competência inválida na rota: ${s}`);
  return { ano: Number(m[1]), mes: Number(m[2]) };
}

/** Escreve a competência no formato usado na rota. */
export function rotuloDaCompetencia(c: Competencia): string {
  return `${c.ano}-${String(c.mes).padStart(2, "0")}`;
}
