import type { ContaDfcl, Meta } from "./dfcl";
import type { Pessoa } from "./domain";
import type { PacoteDfcl } from "./dados-dfcl";
import { portadoresDoPacote } from "./dados-dfcl";

const CENARIO = "C01";
const LOTE = 200;

type Resposta<T = unknown> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

/** Só o que usamos do cliente Supabase, para testar sem rede. */
export type ClienteRemoto = {
  from: (tabela: string) => {
    upsert: (linhas: unknown[], opcoes: { onConflict: string }) => Resposta;
    insert: (linhas: unknown[]) => Resposta;
    select: (colunas: string) => {
      eq: (coluna: string, valor: string) => Resposta<Record<string, unknown>[]>;
    };
  };
};

export type ResumoGravacao = { metas: number; contas: number; portadoresNovos: number };

function falhou(contexto: string, erro: { message: string } | null) {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
}

function emLotes<T>(itens: T[]): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += LOTE) lotes.push(itens.slice(i, i + LOTE));
  return lotes;
}

/**
 * Grava metas, contas e portadores da carteira. Pode rodar de novo sem duplicar:
 * metas e contas pela chave única, portadores só os que ainda não existem.
 */
export async function gravarPacote(
  sb: ClienteRemoto,
  carteiraId: string,
  pacote: PacoteDfcl,
): Promise<ResumoGravacao> {
  for (const lote of emLotes(pacote.contas)) {
    const { error } = await sb.from("dfcl_contas").upsert(
      lote.map((c) => ({ wallet_id: carteiraId, nome: c.nome, tipo: c.tipo, classe: c.classe })),
      { onConflict: "wallet_id,nome" },
    );
    falhou("contas", error);
  }

  for (const lote of emLotes(pacote.metas)) {
    const { error } = await sb.from("dfcl_metas").upsert(
      lote.map((m) => ({
        wallet_id: carteiraId,
        cenario: CENARIO,
        competencia: m.competencia,
        conta: m.conta,
        pessoa: m.pessoa,
        valor_centavos: m.valor,
      })),
      { onConflict: "wallet_id,cenario,competencia,conta,pessoa" },
    );
    falhou("metas", error);
  }

  const existentes = await sb.from("portadores").select("nome").eq("wallet_id", carteiraId);
  falhou("portadores", existentes.error);
  const jaTem = new Set((existentes.data ?? []).map((r) => String(r.nome)));
  const novos = portadoresDoPacote(pacote).filter((p) => !jaTem.has(p.nome));
  if (novos.length > 0) {
    const { error } = await sb.from("portadores").insert(
      novos.map((p) => ({
        id: crypto.randomUUID(),
        wallet_id: carteiraId,
        dono: p.dono,
        instituicao: p.instituicao,
        tipo: p.tipo,
        nome: p.nome,
      })),
    );
    falhou("portadores", error);
  }

  return { metas: pacote.metas.length, contas: pacote.contas.length, portadoresNovos: novos.length };
}

/** Metas e contas gravadas na carteira; null se ainda não há nada. */
export async function lerMetasEContas(
  sb: ClienteRemoto,
  carteiraId: string,
): Promise<{ metas: Meta[]; contas: ContaDfcl[] } | null> {
  const [metas, contas] = await Promise.all([
    sb.from("dfcl_metas").select("competencia,conta,pessoa,valor_centavos,cenario").eq("wallet_id", carteiraId),
    sb.from("dfcl_contas").select("nome,tipo,classe").eq("wallet_id", carteiraId),
  ]);
  falhou("metas", metas.error);
  falhou("contas", contas.error);
  const linhasMetas = (metas.data ?? []).filter((r) => r.cenario === CENARIO);
  if (linhasMetas.length === 0) return null;
  return {
    metas: linhasMetas.map((r) => ({
      competencia: String(r.competencia),
      conta: String(r.conta),
      pessoa: r.pessoa as Pessoa,
      valor: Number(r.valor_centavos),
    })),
    contas: (contas.data ?? []).map((r) => ({
      nome: String(r.nome),
      tipo: r.tipo as ContaDfcl["tipo"],
      classe: r.classe as ContaDfcl["classe"],
    })),
  };
}
