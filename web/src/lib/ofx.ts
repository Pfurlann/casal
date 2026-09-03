import { categoriasVisiveis } from "./categorias";
import {
  CATEGORIAS,
  dataDeLocalISO,
  uuid,
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
};

export type LinhaImportacaoOfx = {
  descricao: string;
  valor: Centavos;
  data: string;
  categoriaID: string;
  hashDedup: string;
};

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

function parecePagamento(memo: string): boolean {
  return /pag(amento|to)|payment|\bpgto\b|fatura\s+paga/i.test(memo);
}

function tipoDaLinha(trntype: string, centavos: number, memo: string): TipoLinhaOfx {
  if (parecePagamento(memo)) return "credito";
  const tipo = normalizarTipo(trntype);
  switch (tipo) {
    case "CREDIT":
    case "PAYMENT":
    case "INT":
    case "DIV":
    case "DEP":
    case "DIRECTDEP":
      return "credito";
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
      return "gasto";
    case "UNKNOWN":
      return centavos < 0 ? "gasto" : "credito";
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
    const tipo = tipoDaLinha(campo(bloco, "TRNTYPE"), centavos, descricao);
    const valorCentavos = centavos < 0 ? -centavos : centavos;
    const fitId = fitIdDaLinha(bloco, data, tipo === "gasto" ? -valorCentavos : valorCentavos, descricao);
    if (vistos.has(fitId)) continue;
    vistos.add(fitId);
    const linha: LinhaOfx = { fitId, data, descricao, valorCentavos, tipo };
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

export function transacoesDoOfx(p: {
  linhas: LinhaImportacaoOfx[];
  carteiraID: string;
  cartaoID: string;
  pagadorID?: string;
  existentes?: Transacao[];
}): Transacao[] {
  const hashes = new Set((p.existentes ?? []).map((t) => t.hashDedup));
  const novas: Transacao[] = [];
  for (const linha of p.linhas) {
    if (hashes.has(linha.hashDedup)) continue;
    hashes.add(linha.hashDedup);
    novas.push({
      id: uuid(),
      carteiraID: p.carteiraID,
      tipo: "despesa",
      valor: linha.valor,
      data: dataDeLocalISO(linha.data).toISOString(),
      categoriaID: linha.categoriaID,
      descricao: linha.descricao,
      cartaoID: p.cartaoID,
      pagadorID: p.pagadorID,
      hashDedup: linha.hashDedup,
      parcelaN: 1,
      parcelaTotal: 1,
      status: "liquidado",
    });
  }
  return novas;
}
