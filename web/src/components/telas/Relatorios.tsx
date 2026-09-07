"use client";

import Link from "next/link";
import { fraseDiagnostico } from "@/lib/diagnostico";
import { avancando, competenciaDaConsulta, hrefDoRelatorio } from "@/lib/domain";
import { curvaDeResumoMensal, montarRelatorio } from "@/lib/relatorios";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { CurvaMeses } from "../ui/CurvaMeses";
import { Numero } from "../ui/Numero";
import { Rosca } from "../ui/Rosca";
import { Rotulo } from "../ui/Rotulo";
import { Esqueleto } from "../ui/Esqueleto";
import { Vazio } from "../ui/Vazio";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function Relatorios({ competenciaRota }: { competenciaRota?: string } = {}) {
  const {
    transacoes,
    categorias,
    cartoes,
    faturas,
    carteira,
    pronto,
    modoResumo,
    resumoMensal,
  } = useLoja();
  const competencia = competenciaDaConsulta(competenciaRota);

  if (!pronto) {
    return (
      <div>
        <Cabecalho titulo={`relatórios · ${carteira.nome}`} marca />
        <div role="status" aria-busy="true" className="space-y-4 px-4 pt-8 lg:px-0">
          <Esqueleto className="h-3 w-40" />
          <Esqueleto className="h-10 w-52" />
          <Esqueleto className="h-3 w-full" />
          <Esqueleto className="mt-6 h-40 w-full" />
          <p className="pt-2 text-center text-[12px] text-cinza">Carregando relatório…</p>
        </div>
      </div>
    );
  }

  const resumoDoMes = (resumoMensal ?? []).find(
    (r) => r.ano === competencia.ano && r.mes === competencia.mes,
  );
  const r = modoResumo
    ? (() => {
        const gasto = resumoDoMes?.despesas ?? 0;
        const receita = resumoDoMes?.receitas ?? 0;
        return {
          gasto,
          receita,
          fluxo: receita - gasto,
          comprometido: 0,
          fatias: [] as const,
          curva: curvaDeResumoMensal(resumoMensal ?? [], competencia),
          frase: fraseDiagnostico({ gasto, receita, problemas: [] }),
        };
      })()
    : montarRelatorio({
        transacoes: transacoes ?? [],
        categorias,
        cartoes: cartoes ?? [],
        faturas: faturas ?? [],
        competencia,
      });

  const vazio = r.gasto <= 0 && r.receita <= 0 && r.fatias.length === 0;

  return (
    <div>
      <Cabecalho
        titulo={`relatórios · ${carteira.nome}`}
        marca
        acao={
          <div className="flex items-center">
            <Link
              href={hrefDoRelatorio(avancando(competencia, -1))}
              aria-label="Mês anterior"
              className="casal-toque flex min-h-[44px] min-w-[44px] items-center justify-center text-[22px] text-grafite"
            >
              ‹
            </Link>
            <Link
              href={hrefDoRelatorio(avancando(competencia, 1))}
              aria-label="Próximo mês"
              className="casal-toque flex min-h-[44px] min-w-[44px] items-center justify-center text-[22px] text-grafite"
            >
              ›
            </Link>
          </div>
        }
      />
      <div className="px-4 pt-6 lg:px-0 lg:pt-8">
        <p className="text-[12px] text-cinza">
          {MESES[(competencia.mes ?? 1) - 1]} · {competencia.ano}
        </p>
        <p className="mt-2 max-w-[54ch] text-[16px] leading-snug text-grafite lg:text-[18px]">
          {r.frase}
        </p>

        {modoResumo && (
          <p className="mt-4 rounded-controle border border-nevoa bg-nevoa px-3 py-2 text-[12px] text-cinza">
            Carteira em modo resumo: você vê só os totais, sem cada lançamento.
          </p>
        )}

        <div className="casal-paineis mt-6 space-y-6 lg:mt-8 lg:space-y-0">
          <section className="casal-painel casal-painel-6">
            <Rotulo>gasto</Rotulo>
            <div className="mt-2">
              <Numero centavos={r.gasto} tamanho="heroi" subordinaCentavos animar />
            </div>
            <div className="mt-5 space-y-5 border-t border-nevoa pt-5">
              <div>
                <Rotulo>receita</Rotulo>
                <div className="mt-1">
                  <Numero centavos={r.receita} tamanho="secao" />
                </div>
              </div>
              <div>
                <Rotulo>fluxo</Rotulo>
                <div className="mt-1">
                  <Numero
                    centavos={r.fluxo}
                    tamanho="secao"
                    tom={r.fluxo < 0 ? "atencao" : "normal"}
                  />
                </div>
                <p className="mt-1 text-[12px] text-cinza">receitas − gastos</p>
              </div>
              {r.comprometido > 0 && (
                <div>
                  <Rotulo>comprometido</Rotulo>
                  <div className="mt-1">
                    <Numero centavos={r.comprometido} tamanho="secao" tom="atencao" />
                  </div>
                  <p className="mt-1 text-[12px] text-cinza">saldo devedor das faturas deste mês</p>
                </div>
              )}
            </div>
          </section>

          <section className="casal-painel casal-painel-6">
            <Rotulo>gastos por categoria</Rotulo>
            {vazio ? (
              <div className="mt-4">
                <Vazio
                  frase="Nenhum movimento neste mês."
                  acao={
                    <div className="flex flex-col items-center gap-2">
                      <Link
                        href="/lancar?tipo=gasto"
                        className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
                      >
                        Novo gasto
                      </Link>
                      <Link
                        href="/lancar?tipo=receita"
                        className="flex min-h-[44px] items-center rounded-controle border border-nevoa px-4 font-texto text-[14px] font-semibold text-grafite"
                      >
                        Nova receita
                      </Link>
                    </div>
                  }
                />
              </div>
            ) : r.fatias.length === 0 ? (
              <div className="mt-4">
                <Vazio
                  frase={
                    modoResumo
                      ? "No modo resumo não há detalhe por categoria."
                      : "Nenhum gasto categorizado neste mês."
                  }
                />
              </div>
            ) : (
              <div className="mt-4">
                <Rosca fatias={r.fatias} competencia={competencia} />
              </div>
            )}
          </section>

          <section className="casal-painel casal-painel-12">
            <Rotulo>últimos 6 meses</Rotulo>
            <div className="mt-4">
              <CurvaMeses pontos={r.curva} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
