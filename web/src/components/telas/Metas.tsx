"use client";

import Link from "next/link";
import { categoriaPorId } from "@/lib/categorias";
import { competenciaDe } from "@/lib/domain";
import {
  economiaDoMes,
  fraseEconomia,
  fraseTeto,
  gastoDaCategoria,
  metasAtivas,
  nomeDaMeta,
  progressoTeto,
} from "@/lib/metas";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";
import { Trilha } from "../ui/Trilha";
import { Vazio } from "../ui/Vazio";

export function Metas() {
  const { metas, transacoes, categorias, carteira } = useLoja();
  const competencia = competenciaDe(new Date());
  const ativas = metasAtivas(metas);
  const tetos = ativas.filter((m) => m.tipo === "teto_categoria");
  const economias = ativas.filter((m) => m.tipo === "economia_mensal");
  const economiaMes = economiaDoMes(transacoes ?? [], competencia);

  return (
    <div>
      <Cabecalho
        titulo="metas"
        acao={
          <Link
            href="/metas/nova"
            aria-label="Adicionar meta"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <p className="text-[12px] text-cinza">
          Tetos e economia de {carteira.nome} neste mês. O teto aparece na hora de lançar.
        </p>

        {ativas.length === 0 ? (
          <Vazio
            frase="Nenhum teto nesta carteira. O limite aparece na hora de gastar."
            acao={
              <Link
                href="/metas/nova"
                className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
              >
                Criar teto
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
                <Rotulo>economia</Rotulo>
                <p className="mt-1 text-[12px] text-cinza">
                  Receitas menos despesas. Sem cofre e sem transferência.
                </p>
                <div className="mt-2">
                  {economias.map((m) => {
                    const bateu = economiaMes >= m.valorAlvo;
                    return (
                      <div key={m.id}>
                        <LinhaLista
                          titulo={nomeDaMeta(m, categorias)}
                          subtitulo={fraseEconomia(economiaMes, m.valorAlvo)}
                          valor={bateu ? economiaMes : m.valorAlvo - economiaMes}
                          tom={bateu ? "normal" : "atencao"}
                          href={`/metas/${m.id}`}
                        />
                        <div className="pb-3">
                          <Trilha
                            consumido={Math.min(Math.max(economiaMes, 0), m.valorAlvo)}
                            total={m.valorAlvo}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
