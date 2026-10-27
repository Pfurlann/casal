import type { Natureza, Pessoa } from "./domain";
import type { Centavos } from "./money";

export type TipoDfcl = "Entrada" | "Saída";

export type ContaDfcl = { nome: string; tipo: TipoDfcl; classe: "Fixo" | "Variavel" };

/** Previsto: uma meta por competência ("2026-10"), conta e pessoa. */
export type Meta = { competencia: string; conta: string; pessoa: Pessoa; valor: Centavos };

/** Realizado: o que de fato foi lançado. */
export type LancDfcl = {
  competencia: string;
  conta: string;
  pessoa: Pessoa;
  tipo: TipoDfcl;
  valor: Centavos;
  natureza: Natureza;
};

export type LinhaDfcl = {
  id: string;
  rotulo: string;
  /** 0 = Entradas/Saídas, 1 = pessoa, 2 = Fixas/Variáveis, 3 = conta. */
  nivel: number;
  prev: Centavos[];
  real: Centavos[];
  pct: (number | null)[];
};

export type ResultadoDfcl = {
  linhas: LinhaDfcl[];
  acumulado: { prev: Centavos[]; real: Centavos[] };
};

/** Ordem das pessoas em cada bloco, como na aba DFCL do C03. A numeração é fixa. */
const ORDEM: Record<TipoDfcl, Pessoa[]> = {
  Entrada: ["Daniele", "Pedro", "Conjunto", "PHF"],
  Saída: ["Conjunto", "Daniele", "Pedro", "PHF"],
};
const PLURAL: Record<TipoDfcl, string> = { Entrada: "Entradas", Saída: "Saídas" };
const NUM: Record<TipoDfcl, number> = { Entrada: 1, Saída: 2 };

type Celulas = { prev: Centavos[]; real: Centavos[] };

const vazio = (n: number): Celulas => ({
  prev: Array<Centavos>(n).fill(0),
  real: Array<Centavos>(n).fill(0),
});

function somar(alvo: Celulas, outro: Celulas) {
  outro.prev.forEach((v, i) => (alvo.prev[i] += v));
  outro.real.forEach((v, i) => (alvo.real[i] += v));
}

function pct(prev: Centavos, real: Centavos): number | null {
  return prev === 0 ? null : Math.round((real / prev) * 100);
}

function linha(id: string, rotulo: string, nivel: number, c: Celulas): LinhaDfcl {
  return { id, rotulo, nivel, prev: c.prev, real: c.real, pct: c.prev.map((p, i) => pct(p, c.real[i])) };
}

export function montarDfcl(args: {
  competencias: string[];
  contas: ContaDfcl[];
  metas: Meta[];
  lancs: LancDfcl[];
  pessoa?: Pessoa | "Todos";
  saldoInicial: Centavos;
}): ResultadoDfcl {
  const { competencias, contas, metas, lancs, saldoInicial } = args;
  const filtro = args.pessoa ?? "Todos";
  const n = competencias.length;
  const col = new Map(competencias.map((c, i) => [c, i]));
  const cadastro = new Map(contas.map((c) => [c.nome, c]));
  const quer = (p: Pessoa) => filtro === "Todos" || p === filtro;

  // chave: tipo|pessoa|classe|conta
  const celulas = new Map<string, Celulas>();
  const pega = (tipo: TipoDfcl, pessoa: Pessoa, classe: string, conta: string) => {
    const k = `${tipo}|${pessoa}|${classe}|${conta}`;
    let c = celulas.get(k);
    if (!c) celulas.set(k, (c = vazio(n)));
    return c;
  };

  for (const m of metas) {
    const i = col.get(m.competencia);
    if (i === undefined || !quer(m.pessoa)) continue;
    const cad = cadastro.get(m.conta);
    pega(cad?.tipo ?? "Saída", m.pessoa, cad?.classe ?? "Variavel", m.conta).prev[i] += m.valor;
  }
  for (const l of lancs) {
    const i = col.get(l.competencia);
    if (i === undefined || l.natureza === "movimento" || !quer(l.pessoa)) continue;
    const cad = cadastro.get(l.conta);
    pega(l.tipo, l.pessoa, cad?.classe ?? "Variavel", l.conta).real[i] += l.valor;
  }

  const linhas: LinhaDfcl[] = [];
  const totais: Record<TipoDfcl, Celulas> = { Entrada: vazio(n), Saída: vazio(n) };

  for (const tipo of ["Entrada", "Saída"] as TipoDfcl[]) {
    const corpo: LinhaDfcl[] = [];
    const totalTipo = vazio(n);

    ORDEM[tipo].forEach((pessoa, idx) => {
      const totalPessoa = vazio(n);
      const blocos: LinhaDfcl[] = [];
      for (const classe of ["Fixo", "Variavel"] as const) {
        const doGrupo = [...celulas.entries()]
          .filter(([k]) => {
            const [t, p, c] = k.split("|");
            return t === tipo && p === pessoa && c === classe;
          })
          .sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
        if (doGrupo.length === 0) continue;
        const totalGrupo = vazio(n);
        const nome = `${PLURAL[tipo]} ${classe === "Fixo" ? "Fixas" : "Variáveis"} - ${pessoa}`;
        const filhas = doGrupo.map(([k, c]) => {
          somar(totalGrupo, c);
          const conta = k.split("|").slice(3).join("|");
          return linha(`${tipo}-${pessoa}-${classe}-${conta}`, conta, 3, c);
        });
        somar(totalPessoa, totalGrupo);
        blocos.push(linha(`${tipo}-${pessoa}-${classe}`, nome, 2, totalGrupo), ...filhas);
      }
      if (blocos.length === 0) return;
      somar(totalTipo, totalPessoa);
      corpo.push(linha(`${tipo}-${pessoa}`, `${NUM[tipo]}.${idx + 1}. ${pessoa}`, 1, totalPessoa), ...blocos);
    });

    totais[tipo] = totalTipo;
    linhas.push(linha(`${tipo}`, `${NUM[tipo]}. ${PLURAL[tipo]}`, 0, totalTipo), ...corpo);
  }

  const acumulado = { prev: [] as Centavos[], real: [] as Centavos[] };
  let ap = saldoInicial;
  let ar = saldoInicial;
  for (let i = 0; i < n; i++) {
    ap += totais.Entrada.prev[i] - totais.Saída.prev[i];
    ar += totais.Entrada.real[i] - totais.Saída.real[i];
    acumulado.prev.push(ap);
    acumulado.real.push(ar);
  }

  return { linhas, acumulado };
}
