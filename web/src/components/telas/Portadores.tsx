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

      <section className="px-4 pt-6 lg:px-0" aria-label="Total">
        <p className="text-[12px] uppercase tracking-wide text-cinza">saldo hoje</p>
        <p className="text-[32px] font-semibold tabular-nums">{formatarBRL(resultado.total)}</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-cinza">
          {Object.entries(resultado.porPessoa).map(([pessoa, valor]) => (
            <li key={pessoa}>
              {pessoa} <span className="tabular-nums text-grafite">{formatarBRL(valor)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ul className="mt-6 grid gap-3 px-4 pb-24 lg:grid-cols-2 lg:px-0 lg:pb-8">
        {resultado.porPortador.map(({ portador, atual, projetado }) => (
          <li key={portador.id} className="rounded-controle border border-nevoa p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[14px] font-semibold">{portador.nome}</h2>
              <span className="text-[11px] text-cinza">{portador.tipo === "cartao" ? "cartão" : "conta"}</span>
            </div>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{formatarBRL(atual)}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12px] tabular-nums">
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
                      <td key={i} className="px-1 text-right">
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
