import { PESSOAS, type Natureza, type Pessoa } from "./domain";
import type { ContaDfcl, LancDfcl, Meta } from "./dfcl";
import type { Portador } from "./portadores";

export type Linha = Record<string, unknown>;

export type LancImportado = LancDfcl & {
  descricao: string;
  portadorNome: string;
  data: string;
  vencimento: string;
  status: "Pago" | "Em Aberto";
  parcela: number;
  parcelaTotal: number;
  formaPagamento: string;
};

const MOVIMENTOS = /^(Saldo Inicial|Transferência - .+|Aplicação - .+|Fatura de Cartão - .+)$/;

/** Contas que só mexem no saldo do portador e não entram no DFCL (D6, M5). */
export function naturezaDaConta(conta: string): Natureza {
  return MOVIMENTOS.test(conta.trim()) ? "movimento" : "resultado";
}

const ehPessoa = (s: string): s is Pessoa => (PESSOAS as readonly string[]).includes(s);

/** Exceções à regra "instituição - dono = cartão, dono - instituição = conta". */
const PORTADOR_FIXO: Record<string, Pick<Portador, "tipo">> = {
  "Caxinha - PHF": { tipo: "conta" },
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Tabela M13: "Pedro - Pagbank" é conta de Pedro; "Nubank - Pedro" é cartão de Pedro. */
export function classificarPortador(nome: string): Portador {
  const limpo = nome.trim();
  const id = slug(limpo);
  const [a, ...resto] = limpo.split(" - ");
  const b = resto.join(" - ");

  if (ehPessoa(a) && b) return { id, nome: limpo, dono: a, instituicao: b, tipo: "conta" };
  if (ehPessoa(b)) {
    return { id, nome: limpo, dono: b, instituicao: a, tipo: PORTADOR_FIXO[limpo]?.tipo ?? "cartao" };
  }
  return { id, nome: limpo, dono: "Conjunto", instituicao: limpo, tipo: "conta" };
}

const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return txt(v).slice(0, 10);
}

function centavos(v: unknown): number {
  const n = typeof v === "number" ? v : Number(txt(v).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function tipoDe(v: unknown): "Entrada" | "Saída" | undefined {
  const t = txt(v);
  return t === "Entrada" || t === "Saída" ? t : undefined;
}

export function parsearRealizados(
  linhas: Linha[],
  contasConhecidas?: ContaDfcl[],
): { lancs: LancImportado[]; avisos: string[] } {
  const lancs: LancImportado[] = [];
  const avisos: string[] = [];
  const conhecidas = contasConhecidas && new Set(contasConhecidas.map((c) => c.nome));
  const jaAvisou = new Set<string>();

  linhas.forEach((l, i) => {
    const onde = `Realizados, linha ${i + 2}`;
    const pessoa = txt(l.Responsabilidade);
    const tipo = tipoDe(l.Tipo);
    const conta = txt(l["Conta Financeira"]);
    const data = iso(l.Data);

    if (!ehPessoa(pessoa)) return void avisos.push(`${onde}: responsabilidade desconhecida "${pessoa}" (ignorada)`);
    if (!tipo || !conta || !data) return void avisos.push(`${onde}: tipo, conta ou data ausente (ignorada)`);

    const natureza = naturezaDaConta(conta);
    if (conhecidas && natureza === "resultado" && !conhecidas.has(conta) && !jaAvisou.has(conta)) {
      jaAvisou.add(conta);
      avisos.push(`Conta "${conta}" não está no cadastro de contas do C03; entra como Variável`);
    }

    lancs.push({
      competencia: data.slice(0, 7),
      conta,
      pessoa,
      tipo,
      valor: centavos(l.Valor),
      natureza,
      descricao: txt(l["Descrição"]),
      portadorNome: txt(l.Portador),
      data,
      vencimento: iso(l.Vencimento) || data,
      status: txt(l.Status) === "Pago" ? "Pago" : "Em Aberto",
      parcela: Number(l.Parcela) || 1,
      parcelaTotal: Number(l["Total de Parcelas"]) || 1,
      formaPagamento: txt(l.Pagamento),
    });
  });

  return { lancs, avisos };
}

/**
 * Metas (aba Lançamentos do C03). O mês vem da data da coluna "Mês" e o ano da coluna
 * "Ano": a planilha guarda datas como 2026-01-01 com Ano 2027 para janeiro de 2027.
 */
export function parsearMetas(
  linhas: Linha[],
  config: Linha[],
): { metas: Meta[]; contas: ContaDfcl[]; avisos: string[] } {
  const contas: ContaDfcl[] = config.flatMap((c) => {
    const nome = txt(c["Nome Conta"]);
    const tipo = tipoDe(c["Classificação Conta"]);
    if (!nome || !tipo) return [];
    return [{ nome, tipo, classe: txt(c["Tipo Conta"]) === "Fixo" ? ("Fixo" as const) : ("Variavel" as const) }];
  });
  const conhecidas = new Set(contas.map((c) => c.nome));
  const avisos: string[] = [];
  const jaAvisou = new Set<string>();
  const metas: Meta[] = [];

  linhas.forEach((l, i) => {
    const conta = txt(l.Conta);
    const pessoa = txt(l.Pessoa);
    const mes = l["Mês"] instanceof Date ? l["Mês"].getUTCMonth() + 1 : Number(txt(l["Mês"]).slice(5, 7));
    const ano = Number(l.Ano);
    if (!conta || !ehPessoa(pessoa) || !ano || !mes) {
      if (conta) avisos.push(`Metas, linha ${i + 2}: pessoa, ano ou mês inválido (ignorada)`);
      return;
    }
    if (!conhecidas.has(conta) && !jaAvisou.has(conta)) {
      jaAvisou.add(conta);
      avisos.push(`Meta com conta "${conta}" sem cadastro em Configurações`);
    }
    metas.push({
      competencia: `${ano}-${String(mes).padStart(2, "0")}`,
      conta,
      pessoa,
      valor: centavos(l.Valor),
    });
  });

  return { metas, contas, avisos };
}
