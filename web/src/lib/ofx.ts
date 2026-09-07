import { categoriasVisiveis } from "./categorias";
import {
  CATEGORIAS,
  avancando,
  competenciaDaCompra,
  dataDeLocalISO,
  fechamento,
  uuid,
  type Cartao,
  type Categoria,
  type Competencia,
  type Transacao,
} from "./domain";
import type { Centavos } from "./money";

export const CATEGORIA_OUTROS_ID = "00000000-0000-0000-0000-000000000012";
export const CATEGORIA_SALARIO_ID = "00000000-0000-0000-0000-000000000013";
export const CATEGORIA_REEMBOLSO_ID = "00000000-0000-0000-0000-000000000014";

export type TipoLinhaOfx = "gasto" | "credito";

export type LinhaOfx = {
  fitId: string;
  data: string;
  descricao: string;
  valorCentavos: Centavos;
  tipo: TipoLinhaOfx;
  parcelaN: number;
  parcelaTotal: number;
};

export type LinhaImportacaoOfx = {
  descricao: string;
  valor: Centavos;
  /** Data original do OFX — âncora da expansão de parcelas. */
  data: string;
  /**
   * Override só da parcela/mês atual (ex.: aplicar data em lote na fatura deste mês).
   * Não reancora competências futuras — essas seguem `data`.
   */
  dataOverride?: string;
  categoriaID: string;
  hashDedup: string;
  tipo?: TipoLinhaOfx;
  parcelaN?: number;
  parcelaTotal?: number;
};

export type ParcelaOfx = { n: number; m: number };

function eParcelaValida(n: number, m: number): boolean {
  return Number.isInteger(n) && Number.isInteger(m) && n >= 1 && m >= 2 && n <= m && m <= 48;
}

/** PARC 3/12, Parc. 03 de 12, PARCELA 3/12, 03/12 no fim — Itaú/Nubank/C6. */
export function parcelaDoTexto(texto: string): ParcelaOfx | null {
  const padroes: RegExp[] = [
    /\bparc(?:ela|elado)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/i,
    /\b(\d{1,2})\s+de\s+(\d{1,2})\s*(?:parc|$)/i,
    /(?:^|[\s\-])(\d{1,2})\/(\d{1,2})\s*$/,
  ];
  for (const re of padroes) {
    const achado = re.exec(texto);
    if (!achado) continue;
    const n = Number(achado[1]);
    const m = Number(achado[2]);
    if (eParcelaValida(n, m)) return { n, m };
  }
  return null;
}

export function parcelaDaLinha(l: { descricao: string; parcelaN?: number; parcelaTotal?: number }): ParcelaOfx | null {
  if (l.parcelaN != null && l.parcelaTotal != null && eParcelaValida(l.parcelaN, l.parcelaTotal)) {
    return { n: l.parcelaN, m: l.parcelaTotal };
  }
  return parcelaDoTexto(l.descricao);
}

/** Quantas transações esta linha OFX gera (atual + futuras k>n). */
export function lancamentosDaLinha(l: { descricao: string; parcelaN?: number; parcelaTotal?: number }): number {
  const p = parcelaDaLinha(l);
  return p ? p.m - p.n + 1 : 1;
}

export function fraseParcelaOfx(n: number, m: number): string | undefined {
  if (!eParcelaValida(n, m)) return undefined;
  const lanca = m - n + 1;
  return `parcela ${n}/${m} · lança ${lanca} restante${lanca === 1 ? "" : "s"}`;
}

/**
 * Se DTPOSTED não cai na competência do extrato (DTSTART/DTEND), carimba no
 * fechamento dessa competência — assim totalDaFatura/CartaoDetalhe alinham ao PDF
 * sem mudar a fronteira de competenciaDaCompra (P1).
 */
export function dataNaCompetenciaDoExtrato(
  dataISO: string,
  competenciaExtrato: Competencia | null | undefined,
  cartao: Cartao,
): string {
  if (!competenciaExtrato) return dataISO;
  const c = competenciaDaCompra(dataDeLocalISO(dataISO), cartao);
  if (c.ano === competenciaExtrato.ano && c.mes === competenciaExtrato.mes) return dataISO;
  return fechamento(competenciaExtrato, cartao);
}

/**
 * Competências da parcela n até m (só k≥n).
 * Âncora = competência do extrato se houver; senão competência da data OFX original.
 * `dataOverrideAtual` altera só a data da parcela n, sem reancorar o cronograma.
 */
export function expansaoParcelasOfx(
  dataISO: string,
  n: number,
  m: number,
  cartao: Cartao,
  dataOverrideAtual?: string,
  competenciaExtrato?: Competencia | null,
): { numero: number; data: string }[] {
  const stamped = dataNaCompetenciaDoExtrato(dataISO, competenciaExtrato, cartao);
  const dataAtual = dataOverrideAtual ?? stamped;
  if (!eParcelaValida(n, m)) return [{ numero: 1, data: dataAtual }];
  const atual =
    competenciaExtrato ?? competenciaDaCompra(dataDeLocalISO(dataISO), cartao);
  const saida: { numero: number; data: string }[] = [];
  for (let k = n; k <= m; k++) {
    const competencia = avancando(atual, k - n);
    saida.push({
      numero: k,
      data: k === n ? dataAtual : fechamento(competencia, cartao),
    });
  }
  return saida;
}

type TipoStmt =
  | "CREDIT"
  | "PAYMENT"
  | "INT"
  | "DIV"
  | "DEP"
  | "DIRECTDEP"
  | "DEBIT"
  | "POS"
  | "ATM"
  | "FEE"
  | "SRVCHG"
  | "CHECK"
  | "XFER"
  | "CASH"
  | "DIRECTDEBIT"
  | "REPEATPMT"
  | "OTHER"
  | "UNKNOWN";

/** Valor OFX → centavos com sinal. Parse de string, sem float. */
export function centavosDeOfx(raw: string): number | null {
  const limpo = raw.trim().replace(/\s/g, "").replace(/[^\d+\-.,]/g, "");
  if (!limpo) return null;
  const neg = limpo.startsWith("-");
  const corpo = limpo.replace(/^[+-]/, "");
  if (!corpo || corpo === "." || corpo === ",") return null;

  const ultimoPonto = corpo.lastIndexOf(".");
  const ultimaVirgula = corpo.lastIndexOf(",");
  const sep = Math.max(ultimoPonto, ultimaVirgula);

  let inteiro: string;
  let frac: string;
  if (sep < 0) {
    inteiro = corpo;
    frac = "00";
  } else {
    const depois = corpo.slice(sep + 1);
    if (!/^\d+$/.test(depois)) return null;
    if (depois.length <= 2) {
      inteiro = corpo.slice(0, sep).replace(/[.,]/g, "");
      frac = depois.padEnd(2, "0");
    } else {
      inteiro = corpo.replace(/[.,]/g, "");
      frac = "00";
    }
  }

  if (!inteiro) inteiro = "0";
  if (!/^\d+$/.test(inteiro)) return null;
  const cents = Number(inteiro) * 100 + Number(frac);
  if (!Number.isSafeInteger(cents)) return null;
  return neg ? -cents : cents;
}

function campo(bloco: string, tag: string): string {
  const m = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(bloco);
  return (m?.[1] ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").trim();
}

function dataDePosted(raw: string): string | null {
  const d = /^(\d{4})(\d{2})(\d{2})/.exec(raw.trim());
  if (!d) return null;
  const mes = Number(d[2]);
  const dia = Number(d[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${d[1]}-${d[2]}-${d[3]}`;
}

function normalizarTipo(raw: string): TipoStmt {
  const t = raw.toUpperCase().trim();
  switch (t) {
    case "CREDIT":
    case "PAYMENT":
    case "INT":
    case "DIV":
    case "DEP":
    case "DIRECTDEP":
    case "DEBIT":
    case "POS":
    case "ATM":
    case "FEE":
    case "SRVCHG":
    case "CHECK":
    case "XFER":
    case "CASH":
    case "DIRECTDEBIT":
    case "REPEATPMT":
    case "OTHER":
      return t;
    default:
      return "UNKNOWN";
  }
}

/** Pagamento de fatura no extrato da conta — não é gasto (senão o mês conta dobrado). */
export function parecePagamentoDeFatura(memo: string): boolean {
  const t = memo.toLowerCase();
  return /(?:pagamento|pagto|\bpgto\b|\bpayment\b).{0,24}(?:fatura|cart[aã]o|nubank|inter|c6|itin[eé]u|mastercard|visa|amex)|(?:fatura|cart[aã]o).{0,16}(?:paga|pago|pagamento)|pgto\s*fatura|pagto\s*fatura|pagamento\s+de\s+fatura/i.test(
    t,
  );
}

/** Pagamento, estorno, ajuste de crédito — não confundir com PADEIRO. */
export function pareceCredito(memo: string): boolean {
  return /pagamento\b|pagto\b|\bpgto\b|\bpayment\b|pgto\s*fatura|fatura\s+paga|\bestorno\b|devolu[cç]|ajuste\s*cred|ajuste\s*cr[eé]dito|cred\s+parc/i.test(
    memo,
  );
}

/**
 * Valor pendente/saldo anterior da fatura passada (carry-forward).
 * NÃO é gasto novo do ciclo — desmarcar por padrão.
 */
export function pareceValorPendente(memo: string): boolean {
  return /\b(?:valor\s*)?pend[eê]nte\b|\bsaldo\s*(?:anterior|pend|dev|rotat|financ)|financ(?:iamento)?\s*saldo|\bsaldo\s*da?\s*fatura\s*ant|\bsaldo\s*parcel/i.test(
    memo,
  );
}

/**
 * Juros, multa, IOF, encargos de atraso/rotativo.
 * NÃO são compras do ciclo — desmarcar por padrão.
 * Exclui "sem juros" / "s juros" (ajuste de crédito).
 */
export function pareceEncargosAtraso(memo: string): boolean {
  const t = memo.toLowerCase();
  if (/\bs(?:em)?\s*juros\b/i.test(t)) return false;
  return /\bjuros\b|\bmulta\b|\biof\b|\bencarg|\bmora\b|\brotat(?:ivo)?\b|\btarifa\s*(?:juro|atraso|rotat)/i.test(t);
}

/**
 * Linha que NÃO deve vir marcada por padrão na fatura:
 * - Pagamento de fatura
 * - Valor pendente / saldo anterior
 * - Encargos de atraso (juros/multa/IOF)
 */
export function deveDesmarcadoPadrao(memo: string): boolean {
  return pareceCredito(memo) && !creditoRelevanteNaFatura(memo)
    || pareceValorPendente(memo)
    || pareceEncargosAtraso(memo);
}

/** Extrai o "núcleo" do nome para matching de estorno (remove ESTORNO, PARC, dígitos etc). */
function nucleoDescricao(memo: string): string {
  return memo
    .toLowerCase()
    .replace(/\bestorno\b|\bdevolu[cç][aã]o\b|\bcancel\w*\b/gi, "")
    .replace(/\bparc(?:ela|elado)?\.?\s*\d+\s*(?:\/|de)\s*\d+/gi, "")
    .replace(/\b\d{1,2}\s*(?:\/|de)\s*\d{1,2}\b/g, "")
    .replace(/[^\p{L}\p{N}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica se um estorno (crédito) cancela uma compra parcelada.
 * Retorna true se descrições têm núcleo similar e valores compatíveis.
 */
export function estornoCancelaParcelada(
  estorno: { descricao: string; valorCentavos: number },
  parcelada: { descricao: string; valorCentavos: number; parcelaN?: number; parcelaTotal?: number },
): boolean {
  if (!pareceCredito(estorno.descricao)) return false;
  const parc = parcelaDaLinha(parcelada);
  if (!parc) return false;
  const nucleoEstorno = nucleoDescricao(estorno.descricao);
  const nucleoParc = nucleoDescricao(parcelada.descricao);
  if (nucleoEstorno.length < 3 || nucleoParc.length < 3) return false;
  if (!nucleoEstorno.includes(nucleoParc) && !nucleoParc.includes(nucleoEstorno)) return false;
  const tolerancia = parcelada.valorCentavos * 0.05;
  return Math.abs(estorno.valorCentavos - parcelada.valorCentavos) <= tolerancia;
}

/**
 * Dado o conjunto de linhas do OFX, retorna os hashes das parceladas
 * cujas parcelas futuras NÃO devem ser projetadas (têm estorno correspondente).
 */
export function parceladasCanceladasPorEstorno(
  linhas: { descricao: string; valorCentavos: number; hashDedup: string; parcelaN?: number; parcelaTotal?: number; tipo: TipoLinhaOfx }[],
): Set<string> {
  const canceladas = new Set<string>();
  const estornos = linhas.filter((l) => l.tipo === "credito" && pareceCredito(l.descricao));
  const parceladas = linhas.filter((l) => l.tipo === "gasto" && parcelaDaLinha(l) !== null);
  for (const p of parceladas) {
    for (const e of estornos) {
      if (estornoCancelaParcelada(e, p)) {
        canceladas.add(p.hashDedup);
        break;
      }
    }
  }
  return canceladas;
}

/** Crédito que deve entrar na fatura abatendo total (ex.: estorno/ajuste). */
export function creditoRelevanteNaFatura(memo: string): boolean {
  const t = memo.toLowerCase();
  if (/\bpagamento\b|\bpagto\b|\bpgto\b|\bpayment\b|pgto\s*fatura|fatura\s+paga/.test(t)) return false;
  return /\bestorno\b|devolu[cç]|ajuste\s*cred|ajuste\s*cr[eé]dito|cred\s+parc/.test(t);
}

/**
 * Cartão BR inverte TRNTYPE/sinal: compra vem CREDIT ou valor positivo.
 * Memo de pagamento/estorno/ajuste ganha; CREDIT sem isso = gasto.
 */
export function classificarTipoOfx(trntype: string, _centavos: number, memo: string): TipoLinhaOfx {
  if (pareceCredito(memo)) return "credito";
  const tipo = normalizarTipo(trntype);
  switch (tipo) {
    case "PAYMENT":
    case "DIV":
    case "DEP":
    case "DIRECTDEP":
      return "credito";
    case "CREDIT":
    case "INT":
    case "DEBIT":
    case "POS":
    case "ATM":
    case "FEE":
    case "SRVCHG":
    case "CHECK":
    case "XFER":
    case "CASH":
    case "DIRECTDEBIT":
    case "REPEATPMT":
    case "OTHER":
    case "UNKNOWN":
      return "gasto";
    default: {
      const _nunca: never = tipo;
      throw new Error(`tipo OFX não tratado: ${_nunca}`);
    }
  }
}

/**
 * Conta bancária: sinal OFX padrão (negativo = saída / gasto).
 * XFER / transferências e memos de TED/PIX entre contas → ainda pelo sinal.
 */
export function classificarTipoOfxConta(trntype: string, centavos: number, memo: string): TipoLinhaOfx {
  const tipo = trntype.toUpperCase();
  const texto = memo.toLowerCase();
  if (/pagamento\s+recebido|pagto\s+recebido|estorno|ajuste\s+cred|devol/i.test(texto)) {
    return "credito";
  }
  if (tipo === "CREDIT" || tipo === "DEP" || tipo === "DIRECTDEP") return "credito";
  if (tipo === "DEBIT" || tipo === "POS" || tipo === "ATM" || tipo === "PAYMENT") return "gasto";
  if (tipo === "XFER" || tipo === "TRANSFER") {
    return centavos < 0 ? "gasto" : "credito";
  }
  return centavos < 0 ? "gasto" : "credito";
}

function blocosStmttrn(texto: string): string[] {
  const blocos: string[] = [];
  const re = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    if (m[1]?.trim()) blocos.push(m[1]);
  }
  return blocos;
}

function descricaoDaLinha(bloco: string): string {
  const memo = campo(bloco, "MEMO");
  const name = campo(bloco, "NAME");
  const payee = campo(bloco, "PAYEE");
  return (memo || name || payee || "Sem descrição").replace(/\s+/g, " ").trim();
}

/** Dedupe: FITID sozinho quebra no Nu (FITID repetido). Sempre FITID+valor+memo. */
function fitIdDaLinha(bloco: string, data: string, centavos: number, descricao: string): string {
  const fit = campo(bloco, "FITID") || campo(bloco, "REFNUM");
  const memo = descricao.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (fit) return `${fit}|${centavos}|${memo}`;
  return `${data}|${centavos}|${memo}`;
}

/**
 * iOS Safari/PWA some .ofx se o accept for estreito (UTI desconhecido).
 * Vazio = sem atributo accept: o iPhone mostra Arquivos/iCloud.
 */
export const ACCEPT_ARQUIVO_OFX = "";

export function eNomeOfx(nome: string): boolean {
  return /\.(ofx|ofc|qfx)$/i.test(nome.trim());
}

export function eConteudoOfx(texto: string): boolean {
  const cabeca = texto.slice(0, 8000);
  return /OFXHEADER\s*:/i.test(cabeca) || /<OFX\b/i.test(cabeca);
}

/** null = segue; senão, frase para a pessoa. Exige OFXHEADER ou `<OFX`. */
export function erroSeNaoForOfx(nome: string, texto: string): string | null {
  if (eConteudoOfx(texto)) return null;
  return eNomeOfx(nome)
    ? "Esse arquivo não tem um OFX válido."
    : "Isso não parece um arquivo OFX. No app do banco, exporte a fatura em OFX.";
}

export function lerTextoDoArquivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("não deu para ler o arquivo"));
    r.readAsText(file);
  });
}

function parseStmttrn(
  texto: string,
  classificar: (trntype: string, centavos: number, memo: string) => TipoLinhaOfx,
): { gastos: LinhaOfx[]; creditos: LinhaOfx[] } {
  const gastos: LinhaOfx[] = [];
  const creditos: LinhaOfx[] = [];
  const vistos = new Set<string>();

  for (const bloco of blocosStmttrn(texto)) {
    const rawValor = campo(bloco, "TRNAMT");
    const centavos = centavosDeOfx(rawValor);
    if (centavos == null || centavos === 0) continue;
    const data = dataDePosted(campo(bloco, "DTPOSTED") || campo(bloco, "DTUSER"));
    if (!data) continue;
    const descricao = descricaoDaLinha(bloco);
    const tipo = classificar(campo(bloco, "TRNTYPE"), centavos, descricao);
    const valorCentavos = centavos < 0 ? -centavos : centavos;
    const fitId = fitIdDaLinha(bloco, data, tipo === "gasto" ? -valorCentavos : valorCentavos, descricao);
    if (vistos.has(fitId)) continue;
    vistos.add(fitId);
    const parc = parcelaDoTexto(descricao);
    const linha: LinhaOfx = {
      fitId,
      data,
      descricao,
      valorCentavos,
      tipo,
      parcelaN: parc?.n ?? 1,
      parcelaTotal: parc?.m ?? 1,
    };
    if (tipo === "gasto") gastos.push(linha);
    else creditos.push(linha);
  }

  gastos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  creditos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  return { gastos, creditos };
}


/** Janela do extrato (BANKTRANLIST DTSTART/DTEND). Define a competência da fatura. */
export function periodoDoOfx(texto: string): { inicio: string; fim: string } | null {
  const inicio = dataDePosted(campo(texto, "DTSTART") || "");
  const fim = dataDePosted(campo(texto, "DTEND") || "");
  if (inicio && fim) return { inicio, fim };
  if (fim) return { inicio: fim, fim };
  if (inicio) return { inicio, fim: inicio };
  return null;
}

/** Competência do import = mês do DTEND do extrato (não só diaFechamento do cartão). */
export function competenciaDoPeriodoOfx(
  periodo: { inicio: string; fim: string } | null | undefined,
  fallbackISO?: string,
): { ano: number; mes: number } | null {
  const iso = periodo?.fim || periodo?.inicio || fallbackISO;
  if (!iso) return null;
  const [ano, mes] = iso.split("-").map(Number);
  if (!ano || !mes) return null;
  return { ano, mes };
}

/** Extrai STMTTRN de OFX/OFC (SGML ou XML). Gastos e créditos separados — classificação de cartão BR. */
export function parseOfx(texto: string): {
  gastos: LinhaOfx[];
  creditos: LinhaOfx[];
  periodo: { inicio: string; fim: string } | null;
} {
  return { ...parseStmttrn(texto, classificarTipoOfx), periodo: periodoDoOfx(texto) };
}

/** Extrato de conta bancária: sinal OFX padrão (não inverte como cartão BR). */
export function parseOfxConta(texto: string): {
  gastos: LinhaOfx[];
  creditos: LinhaOfx[];
  periodo: { inicio: string; fim: string } | null;
} {
  return { ...parseStmttrn(texto, classificarTipoOfxConta), periodo: periodoDoOfx(texto) };
}

export function hashDedupOfx(cartaoID: string, fitId: string): string {
  return `ofx|${cartaoID}|${fitId}`;
}

export function hashDedupOfxConta(contaID: string, fitId: string): string {
  return `ofx|${contaID}|${fitId}`;
}

export function jaImportada(transacoes: Transacao[], hash: string): boolean {
  return transacoes.some((t) => t.hashDedup === hash);
}

const REGRAS: { id: string; re: RegExp }[] = [
  { id: "00000000-0000-0000-0000-000000000002", re: /ifood|rappi|restaurante|lanchonete|padaria|pizz|bar\b|outback|mcdonald|burger|habib/i },
  { id: "00000000-0000-0000-0000-000000000001", re: /mercado|super(\s|$)|atacad|carrefour|assai|assaí|pao de acucar|pão de açúcar|sams?\b|hortifruti/i },
  { id: "00000000-0000-0000-0000-000000000003", re: /posto|shell|ipiranga|raizen|raízen|petrobras|combust|ale\s/i },
  { id: "00000000-0000-0000-0000-000000000004", re: /\buber\b|\b99\b|cabify|metro|metrô|onibus|ônibus|passagem|estaciona/i },
  { id: "00000000-0000-0000-0000-000000000006", re: /farmac|drogaria|hospital|clinica|clínica|laboratorio|laboratório|dent/i },
  { id: "00000000-0000-0000-0000-000000000009", re: /netflix|spotify|prime video|disney|youtube|icloud|google\s*one|apple\.com\/bill|amazon prime/i },
  { id: "00000000-0000-0000-0000-000000000008", re: /cinema|ingresso|steam|playstation|xbox|show\b/i },
  { id: "00000000-0000-0000-0000-000000000010", re: /renner|zara|c&a|cea\b|shein|nike|adidas|centauro/i },
  { id: "00000000-0000-0000-0000-000000000005", re: /aluguel|condominio|condomínio|enel|cpfl|comgas|comgás|sabesp|vivo fibra|claro resid/i },
  { id: "00000000-0000-0000-0000-000000000007", re: /escola|faculdade|udemy|alura|curso/i },
];

/** Categoria padrão + custom. Sem match → Outros. */
export function classificarCategoria(descricao: string, custom?: Categoria[]): string {
  const visiveis = new Set(categoriasVisiveis(custom, "despesa").map((c) => c.id));
  for (const regra of REGRAS) {
    if (regra.re.test(descricao) && visiveis.has(regra.id)) return regra.id;
  }
  if (visiveis.has(CATEGORIA_OUTROS_ID)) return CATEGORIA_OUTROS_ID;
  return categoriasVisiveis(custom, "despesa")[0]?.id ?? CATEGORIAS.find((c) => c.tipo === "despesa")?.id ?? CATEGORIA_OUTROS_ID;
}

/** Categoria para linha de conta: despesa pelas regras; receita → Reembolso ou Salário. */
export function classificarCategoriaOfxConta(
  descricao: string,
  tipo: TipoLinhaOfx,
  custom?: Categoria[],
): string {
  if (tipo === "gasto") return classificarCategoria(descricao, custom);
  const visiveis = new Set(categoriasVisiveis(custom, "receita").map((c) => c.id));
  if (/reembolso|estorno|devolu[cç]/i.test(descricao) && visiveis.has(CATEGORIA_REEMBOLSO_ID)) {
    return CATEGORIA_REEMBOLSO_ID;
  }
  if (visiveis.has(CATEGORIA_SALARIO_ID)) return CATEGORIA_SALARIO_ID;
  return (
    categoriasVisiveis(custom, "receita")[0]?.id ??
    CATEGORIAS.find((c) => c.tipo === "receita")?.id ??
    CATEGORIA_SALARIO_ID
  );
}

export function hashDedupOfxParcela(hashAtual: string, atual: number, numero: number, total: number): string {
  return numero === atual ? hashAtual : `${hashAtual}|p${numero}de${total}`;
}

/**
 * Quantos lançamentos desta linha ainda faltam (parcela n + k>n).
 * Se n já existe, conta só as futuras ausentes — base do "completar parcelas futuras".
 */
export function lancamentosPendentesDaLinha(
  l: { hashDedup: string; descricao: string; parcelaN?: number; parcelaTotal?: number },
  existentes: Transacao[],
): number {
  const hashes = new Set(existentes.map((t) => t.hashDedup));
  const parc = parcelaDaLinha(l);
  if (!parc) return hashes.has(l.hashDedup) ? 0 : 1;
  let faltam = 0;
  for (let k = parc.n; k <= parc.m; k++) {
    if (!hashes.has(hashDedupOfxParcela(l.hashDedup, parc.n, k, parc.m))) faltam++;
  }
  return faltam;
}

/** n já na fatura, mas pelo menos uma k>n ausente. */
export function precisaCompletarParcelas(
  l: { hashDedup: string; descricao: string; parcelaN?: number; parcelaTotal?: number },
  existentes: Transacao[],
): boolean {
  const parc = parcelaDaLinha(l);
  if (!parc || parc.n >= parc.m) return false;
  const hashes = new Set(existentes.map((t) => t.hashDedup));
  if (!hashes.has(l.hashDedup)) return false;
  return lancamentosPendentesDaLinha(l, existentes) > 0;
}

export function fraseCompletarParcelas(faltam: number): string | undefined {
  if (faltam <= 0) return undefined;
  return `completar ${faltam} parcela${faltam === 1 ? "" : "s"} futura${faltam === 1 ? "" : "s"}`;
}

/** `carteiraID` deve ser `cartao.carteiraID` (não a carteira só da UI). */
export function transacoesDoOfx(p: {
  linhas: LinhaImportacaoOfx[];
  carteiraID: string;
  cartaoID: string;
  cartao?: Cartao;
  pagadorID?: string;
  existentes?: Transacao[];
  /** Competência do extrato (mês do DTEND). Carimba parcela n e ancora k>n. */
  competenciaExtrato?: Competencia | null;
}): Transacao[] {
  const existentes = p.existentes ?? [];
  const hashes = new Set(existentes.map((t) => t.hashDedup));
  const novas: Transacao[] = [];
  for (const linha of p.linhas) {
    // Não aborta a linha se hash de n já existe: ainda pode faltar expansão k>n.
    const parc = parcelaDaLinha(linha);
    const partes =
      parc && p.cartao
        ? expansaoParcelasOfx(
            linha.data,
            parc.n,
            parc.m,
            p.cartao,
            linha.dataOverride,
            p.competenciaExtrato,
          )
        : [
            {
              numero: parc?.n ?? 1,
              data:
                linha.dataOverride ??
                (p.cartao
                  ? dataNaCompetenciaDoExtrato(linha.data, p.competenciaExtrato, p.cartao)
                  : linha.data),
            },
          ];
    const total = parc?.m ?? 1;
    const atual = parc?.n ?? 1;
    const pendentes = partes.filter(
      (parte) => !hashes.has(hashDedupOfxParcela(linha.hashDedup, atual, parte.numero, total)),
    );
    if (pendentes.length === 0) continue;
    const grupoExistente = existentes.find((t) => t.hashDedup === linha.hashDedup)?.grupoParcela;
    const grupo =
      partes.length > 1 ? (grupoExistente ?? uuid()) : undefined;
    for (const parte of pendentes) {
      const hash = hashDedupOfxParcela(linha.hashDedup, atual, parte.numero, total);
      hashes.add(hash);
      const valor = linha.tipo === "credito" ? -linha.valor : linha.valor;
      novas.push({
        id: uuid(),
        carteiraID: p.carteiraID,
        tipo: "despesa",
        valor,
        data: dataDeLocalISO(parte.data).toISOString(),
        categoriaID: linha.categoriaID,
        descricao: linha.descricao,
        cartaoID: p.cartaoID,
        pagadorID: p.pagadorID,
        hashDedup: hash,
        grupoParcela: grupo,
        parcelaN: parte.numero,
        parcelaTotal: total,
        status: "liquidado",
      });
    }
  }
  return novas;
}

/**
 * Extrato de conta → lançamentos líquidos (já aconteceram).
 * 1 linha = 1 tx; sem parcelas de cartão; crédito = receita, débito = despesa.
 */
export function transacoesDoOfxConta(p: {
  linhas: LinhaImportacaoOfx[];
  carteiraID: string;
  contaID: string;
  pagadorID?: string;
  existentes?: Transacao[];
}): Transacao[] {
  const hashes = new Set((p.existentes ?? []).map((t) => t.hashDedup));
  const novas: Transacao[] = [];
  for (const linha of p.linhas) {
    if (hashes.has(linha.hashDedup)) continue;
    hashes.add(linha.hashDedup);
    const credito = linha.tipo === "credito";
    // Pagamento de fatura no banco: transferência (como pagarFatura), nunca despesa.
    const pagamentoFatura = !credito && parecePagamentoDeFatura(linha.descricao);
    novas.push({
      id: uuid(),
      carteiraID: p.carteiraID,
      tipo: credito ? "receita" : pagamentoFatura ? "transferencia" : "despesa",
      valor: linha.valor,
      data: dataDeLocalISO(linha.data).toISOString(),
      categoriaID: pagamentoFatura ? undefined : linha.categoriaID,
      descricao: linha.descricao,
      contaID: p.contaID,
      pagadorID: p.pagadorID,
      hashDedup: linha.hashDedup,
      parcelaN: 1,
      parcelaTotal: 1,
      status: "liquidado",
    });
  }
  return novas;
}
