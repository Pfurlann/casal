"use client";

import Link from "next/link";
import { categoriaPorId } from "@/lib/categorias";
import { competenciaDe } from "@/lib/domain";
import {
  alocadoDe,
  economiaDoMes,
  fraseEconomia,
  fraseReserva,
  fraseTeto,
  gastoDaCategoria,
  metasAtivas,
  nomeDaMeta,
  progressoReserva,
  progressoTeto,
} from "@/lib/metas";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";
import { Trilha } from "../ui/Trilha";
import { Vazio } from "../ui/Vazio";

export function Metas() {
  const { metas, transacoes, categorias, contas, carteira } = useLoja();
  const competencia = competenciaDe(new Date());
  const ativas = metasAtivas(metas);
  const tetos = ativas.filter((m) => m.tipo === "teto_categoria");
  const economias = ativas.filter((m) => m.tipo === "economia_mensal");
  const objetivos = ativas.filter((m) => m.tipo === "objetivo");
  const economiaMes = economiaDoMes(transacoes ?? [], competencia);

  function linhaEconomia(m: typeof ativas[number]) {
    const nome = nomeDaMeta(m, categorias);
    const conta = contas?.find((c) => c.id === m.contaID);
    const temEnvelope = Boolean(m.contaID);
    const alocado = alocadoDe(m);
    const p = temEnvelope
      ? progressoReserva(m.valorAlvo, alocado)
      : progressoTeto(m.valorAlvo, Math.max(economiaMes, 0));
    const sub = temEnvelope
      ? `${fraseReserva(alocado, m.valorAlvo, nome)}${conta ? ` · ${conta.nome}` : ""}`
      : fraseEconomia(economiaMes, m.valorAlvo);
    const bateu = temEnvelope ? alocado >= m.valorAlvo : economiaMes >= m.valorAlvo;
    return (
      <div key={m.id}>
        <LinhaLista
          titulo={nome}
          subtitulo={sub}
          valor={bateu ? (temEnvelope ? alocado : economiaMes) : m.valorAlvo - (temEnvelope ? alocado : economiaMes)}
          tom={bateu ? "normal" : "atencao"}
          href={`/metas/${m.id}`}
        />
        <div className="pb-3">
          <Trilha
            consumido={Math.min(Math.max(temEnvelope ? alocado : economiaMes, 0), m.valorAlvo)}
            total={m.valorAlvo}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Cabecalho
        titulo="metas"
        acao={
          <Link
            href="/metas/nova"
            aria-label="Adicionar meta"
            className="casal-toque flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <p className="text-[12px] text-cinza">
          Tetos e economia de {carteira.nome}. Reserve na conta sem transferência. Gastar da
          reserva desconta a meta.
        </p>

        {ativas.length === 0 ? (
          <Vazio
            frase="Nenhuma meta nesta carteira. Teto, economia do mês ou objetivo de longo prazo."
            acao={
              <Link
                href="/metas/nova"
                className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
              >
                Criar meta
              </Link>
            }
          />
        ) : (
          <>
            {tetos.length > 0 && (
              <div className="mt-6">
                <Rotulo>tetos</Rotulo>
                <div className="mt-2">
                  {tetos.map((m) => {
                    const cat = categoriaPorId(m.categoriaID, categorias);
                    const gasto = gastoDaCategoria(transacoes ?? [], m.categoriaID ?? "", competencia);
                    const p = progressoTeto(m.valorAlvo, gasto);
                    return (
                      <div key={m.id}>
                        <LinhaLista
                          titulo={nomeDaMeta(m, categorias)}
                          subtitulo={fraseTeto(p, cat?.nome ?? nomeDaMeta(m, categorias))}
                          valor={p.resto > 0 ? p.resto : p.gasto - p.alvo}
                          tom={p.faixa === "folga" ? "normal" : "atencao"}
                          href={`/metas/${m.id}`}
                        />
                        <div className="pb-3">
                          <Trilha consumido={p.gasto} total={p.alvo} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {economias.length > 0 && (
              <div className="mt-8">
                <Rotulo>economia do mês</Rotulo>
                <p className="mt-1 text-[12px] text-cinza">
                  Competência deste mês. Com reserva, o alvo é o envelope.
                </p>
                <div className="mt-2">{economias.map(linhaEconomia)}</div>
              </div>
            )}

            {objetivos.length > 0 && (
              <div className="mt-8">
                <Rotulo>longo prazo</Rotulo>
                <p className="mt-1 text-[12px] text-cinza">
                  Alvo com data opcional. Reserve na conta até completar ou marque concluída.
                </p>
                <div className="mt-2">{objetivos.map(linhaEconomia)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
