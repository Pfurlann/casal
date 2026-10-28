import type { Categoria, Transacao } from "./domain";
import type { ContaDfcl, LancDfcl, Meta } from "./dfcl";
import type { MovPortador, Portador } from "./portadores";
import {
  classificarPortador,
  parsearMetas,
  parsearRealizados,
  type LancImportado,
  type Linha,
} from "./planilhas";

/** Tudo que veio das planilhas, guardado no navegador até a migração entrar no banco. */
export type PacoteDfcl = {
  metas: Meta[];
  contas: ContaDfcl[];
  lancs: LancImportado[];
  avisos: string[];
  importadoEm: string;
};

export type DadosBrutos = { realizados: Linha[]; metas: Linha[]; config: Linha[] };

export function construirPacote(dados: DadosBrutos): PacoteDfcl {
  const m = parsearMetas(dados.metas, dados.config);
  const r = parsearRealizados(dados.realizados, m.contas);
  return {
    metas: m.metas,
    contas: m.contas,
    lancs: r.lancs,
    avisos: [...m.avisos, ...r.avisos],
    importadoEm: new Date().toISOString(),
  };
}

const chave = (uid: string) => `casal-dfcl:${uid}`;

export function salvarPacote(uid: string, p: PacoteDfcl): void {
  try {
    localStorage.setItem(chave(uid), JSON.stringify(p));
  } catch {
    /* sem armazenamento local: a importação vale só nesta sessão */
  }
}

export function carregarPacote(uid: string): PacoteDfcl | null {
  try {
    const bruto = localStorage.getItem(chave(uid));
    return bruto ? (JSON.parse(bruto) as PacoteDfcl) : null;
  } catch {
    return null;
  }
}

/** Portadores usados nos lançamentos importados, sem repetir. */
export function portadoresDoPacote(p: PacoteDfcl): Portador[] {
  const vistos = new Map<string, Portador>();
  for (const l of p.lancs) {
    if (!l.portadorNome) continue;
    const portador = classificarPortador(l.portadorNome);
    vistos.set(portador.id, portador);
  }
  return [...vistos.values()];
}

/** Lançamentos feitos no app que entram no DFCL: só os que têm pessoa, e nunca transferência. */
function doApp(transacoes: Transacao[]) {
  return transacoes.filter((t) => t.pessoa && t.tipo !== "transferencia");
}

export function lancsDoDfcl(p: PacoteDfcl, transacoes: Transacao[], categorias: Categoria[]): LancDfcl[] {
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const doApp_ = doApp(transacoes).map(
    (t): LancDfcl => ({
      competencia: t.data.slice(0, 7),
      conta: nomes.get(t.categoriaID ?? "") ?? "Outras Despesas",
      pessoa: t.pessoa!,
      tipo: t.tipo === "receita" ? "Entrada" : "Saída",
      valor: t.valor,
      natureza: t.natureza ?? "resultado",
    }),
  );
  // Com lançamentos no banco, eles são a fonte. O arquivo importado só vale sem eles (modo local),
  // senão cada realizado apareceria duas vezes.
  return doApp_.length > 0 ? doApp_ : [...p.lancs];
}

export function movsDosPortadores(p: PacoteDfcl, transacoes: Transacao[]): MovPortador[] {
  const importados = p.lancs
    .filter((l) => l.portadorNome)
    .map(
      (l): MovPortador => ({
        portadorId: classificarPortador(l.portadorNome).id,
        data: l.data,
        vencimento: l.vencimento,
        valor: l.tipo === "Entrada" ? l.valor : -l.valor,
        status: l.status,
        natureza: l.natureza,
      }),
    );
  const doApp_ = doApp(transacoes)
    .filter((t) => t.portadorID)
    .map(
      (t): MovPortador => ({
        portadorId: t.portadorID!,
        data: t.data,
        vencimento: t.vencimento,
        valor: t.tipo === "receita" ? t.valor : -t.valor,
        status: t.status === "a_pagar" ? "Em Aberto" : "Pago",
        natureza: t.natureza ?? "resultado",
      }),
    );
  return doApp_.length > 0 ? doApp_ : importados;
}
