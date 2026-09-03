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
  type Transacao,
} from "./domain";
import type { Centavos } from "./money";

export const CATEGORIA_OUTROS_ID = "00000000-0000-0000-0000-000000000012";

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
  data: string;
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

/** Quantas transações esta linha OFX gera (atual + futuras). */
export function lancamentosDaLinha(l: { descricao: string; parcelaN?: number; parcelaTotal?: number }): number {
  const p = parcelaDaLinha(l);
  return p ? p.m - p.n + 1 : 1;
}

export function fraseParcelaOfx(n: number, m: number): string | undefined {
  if (!eParcelaValida(n, m)) return undefined;
  const lanca = m - n + 1;
  return `parcela ${n}/${m} · lança ${lanca} restante${lanca === 1 ? "" : "s"}`;
}

/** Competências da parcela n até m. Atual = data do OFX; futuras = fechamento. */
export function expansaoParcelasOfx(
  dataISO: string,
  n: number,
  m: number,
  cartao: Cartao,
): { numero: number; data: string }[] {
  if (!eParcelaValida(n, m)) return [{ numero: 1, data: dataISO }];
  const atual = competenciaDaCompra(dataDeLocalISO(dataISO), cartao);
  const saida: { numero: number; data: string }[] = [];
  for (let k = n; k <= m; k++) {
    const competencia = avancando(atual, k - n);
    saida.push({
      numero: k,
      data: k === n ? dataISO : fechamento(competencia, cartao),
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
  const ano = Number(d[1]);
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

/** Pagamento, estorno, ajuste de crédito — não confundir com PADEIRO. */
export function pareceCredito(memo: string): boolean {
  return /pagamento\b|pagto\b|\bpgto\b|\bpayment\b|pgto\s*fatura|fatura\s+paga|\bestorno\b|devolu[cç]|ajuste\s*cred|ajuste\s*cr[eé]dito|cred\s+parc/i.test(
    memo,
  );
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

function fitIdDaLinha(bloco: string, data: string, centavos: number, descricao: string): string {
  const fit = campo(bloco, "FITID") || campo(bloco, "REFNUM");
  if (fit) return fit;
  const memo = descricao.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
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

/** Extrai STMTTRN de OFX/OFC (SGML ou XML). Gastos e créditos separados. */
export function parseOfx(texto: string): { gastos: LinhaOfx[]; creditos: LinhaOfx[] } {
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
    const tipo = classificarTipoOfx(campo(bloco, "TRNTYPE"), centavos, descricao);
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

export function hashDedupOfx(cartaoID: string, fitId: string): string {
  return `ofx|${cartaoID}|${fitId}`;
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

export function hashDedupOfxParcela(hashAtual: string, atual: number, numero: number, total: number): string {
  return numero === atual ? hashAtual : `${hashAtual}|p${numero}de${total}`;
}

export function transacoesDoOfx(p: {
  linhas: LinhaImportacaoOfx[];
  carteiraID: string;
  cartaoID: string;
  cartao?: Cartao;
  pagadorID?: string;
  existentes?: Transacao[];
}): Transacao[] {
  const hashes = new Set((p.existentes ?? []).map((t) => t.hashDedup));
  const novas: Transacao[] = [];
  for (const linha of p.linhas) {
    if (hashes.has(linha.hashDedup)) continue;
    const parc = parcelaDaLinha(linha);
    const partes =
      parc && p.cartao
        ? expansaoParcelasOfx(linha.data, parc.n, parc.m, p.cartao)
        : [{ numero: parc?.n ?? 1, data: linha.data }];
    const grupo = partes.length > 1 ? uuid() : undefined;
    const total = parc?.m ?? 1;
    const atual = parc?.n ?? 1;
    for (const parte of partes) {
      const hash = hashDedupOfxParcela(linha.hashDedup, atual, parte.numero, total);
      if (hashes.has(hash)) continue;
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
