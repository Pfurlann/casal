"use client";

import { useMemo } from "react";
import { movsDosPortadores, portadoresDoPacote } from "@/lib/dados-dfcl";
import { formatarBRL } from "@/lib/money";
import { saldosPorPortador } from "@/lib/portadores";
import { useLoja } from "@/lib/store";
import { usePacote } from "@/lib/usar-pacote";
import { Cabecalho } from "../ui/Cabecalho";
import { Esqueleto } from "../ui/Esqueleto";
import { Vazio } from "../ui/Vazio";

const MESES = 6;
const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotuloMes(deslocamento: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + deslocamento);
  return `${NOMES_MES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

export function Portadores() {
  const { transacoes, pronto } = useLoja();
  const { pacote, lido } = usePacote();

  const resultado = useMemo(() => {
    if (!pacote) return null;
    return saldosPorPortador({
      portadores: portadoresDoPacote(pacote),
      movs: movsDosPortadores(pacote, transacoes ?? []),
      hoje: new Date().toISOString(),
      meses: MESES,
    });
  }, [pacote, transacoes]);

  if (!pronto || !lido) {
    return (
      <div>
        <Cabecalho titulo="portadores" marca />
        <div role="status" aria-busy="true" className="space-y-4 px-4 pt-8 lg:px-0">
          <Esqueleto className="h-10 w-52" />
          <Esqueleto className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!resultado || resultado.porPortador.length === 0) {
    return (
      <div>
        <Cabecalho titulo="portadores" marca />
        <Vazio frase="Sem portadores ainda. Importe as planilhas na tela do DFCL para ver os saldos." />
      </div>
    );
  }

  return (
    <div>
      <Cabecalho titulo="portadores · saldo" marca />

      <section className="casal-heroi mx-4 mt-6 lg:mx-0" aria-label="Total">
        <p className="relative z-10 text-[13px] font-semibold uppercase tracking-wide opacity-80">saldo hoje</p>
        <p className="relative z-10 mt-1 text-[36px] font-bold leading-tight tabular-nums lg:text-[44px]">
          {formatarBRL(resultado.total)}
        </p>
        <ul className="relative z-10 mt-4 flex flex-wrap gap-2">
          {Object.entries(resultado.porPessoa).map(([pessoa, valor]) => (
            <li
              key={pessoa}
              className="rounded-etiqueta bg-[color-mix(in_srgb,var(--sobre-marca)_16%,transparent)] px-3 py-1 text-[13px]"
            >
              {pessoa} <span className="font-semibold tabular-nums">{formatarBRL(valor)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 px-4 pb-24 lg:grid-cols-2 lg:px-0 lg:pb-8">
        {resultado.porPortador.map(({ portador, atual, projetado }) => (
          <li key={portador.id} className="casal-card min-w-0 p-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold " +
                  (portador.tipo === "cartao" ? "bg-ambar-suave text-ambar-texto" : "bg-marca-suave text-marca-texto")
                }
              >
                {portador.instituicao.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-semibold">{portador.nome}</h2>
                <p className="text-[12px] text-cinza">{portador.dono}</p>
              </div>
              <span className="casal-pill">{portador.tipo === "cartao" ? "cartão" : "conta"}</span>
            </div>
            <p
              className={
                "mt-4 text-[26px] font-bold tabular-nums " + (atual < 0 ? "text-saida" : "text-grafite")
              }
            >
              {formatarBRL(atual)}
            </p>
            <Sparkline valores={projetado} />
            <div className="mt-2 overflow-x-auto">
              <table className="w-full whitespace-nowrap text-[12px] tabular-nums">
                <caption className="sr-only">Saldo projetado de {portador.nome}</caption>
                <thead>
                  <tr className="text-cinza">
                    {projetado.map((_, i) => (
                      <th key={i} scope="col" className="px-1 pb-1 text-right font-normal">
                        {rotuloMes(i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {projetado.map((v, i) => (
                      <td key={i} className={"px-1 text-right " + (v < 0 ? "text-saida" : "")}>
                        {formatarBRL(v)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha da projeção dos próximos meses. Decorativa: os valores estão na tabela abaixo. */
function Sparkline({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const faixa = max - min || 1;
  const L = 240;
  const A = 48;
  const pontos = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * L;
    const y = A - 4 - ((v - min) / faixa) * (A - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg aria-hidden viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className="mt-3 h-12 w-full text-marca">
      <polyline points={`0,${A} ${pontos.join(" ")} ${L},${A}`} fill="currentColor" opacity="0.1" stroke="none" />
      <polyline
        points={pontos.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
