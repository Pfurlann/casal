"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categoriaPorId } from "@/lib/categorias";
import { avancando, competenciaDaConsulta, hrefDoMes, rotuloDaCompetencia, type Transacao } from "@/lib/domain";
import { compromissosAPagar } from "@/lib/compromissos";
import {
  competenciaDoHashFatura,
  eCompraNoCartao,
  eLancamentoDeFatura,
  eLancamentoPago,
  hashDedupFatura,
  lancamentoDoTotalDaFatura,
} from "@/lib/faturas";
import {
  folgaDoPeriodo,
  fraseTeto,
  gastoDaCategoria,
  metasAtivas,
  nomeDaMeta,
  progressoTeto,
  transacoesDoMes,
} from "@/lib/metas";
import { origemDaTransacao } from "@/lib/origem";
import { carteiraMostraPagador, indicadorPagador } from "@/lib/pagador";
import {
  faturaDaCompetencia,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Etiqueta } from "../ui/Etiqueta";
import { LinhaDeslizavel } from "../ui/LinhaDeslizavel";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { BolinhaCor } from "../ui/SeletorCor";
import { Trilha } from "../ui/Trilha";
import { Vazio } from "../ui/Vazio";
import { ModalPagar } from "./ModalPagar";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

type FiltroMes = "todos" | "pagos" | "a_pagar";

export function Mes({ competenciaRota }: { competenciaRota?: string } = {}) {
  const {
    transacoes,
    cartoes,
    contas,
    faturas,
    carteira,
    membros,
    usuarioID,
    categorias,
    metas,
    compromissos,
    liquidarLancamento,
  } = useLoja();
  const mostraPagador = carteiraMostraPagador(carteira) && (membros?.length ?? 0) > 1;
  const competencia = competenciaDaConsulta(competenciaRota);
  const [filtro, setFiltro] = useState<FiltroMes>("todos");
  const [pagando, setPagando] = useState<Transacao | null>(null);

  const doMes = transacoesDoMes(transacoes, competencia, cartoes);
  const totaisFatura = cartoes
    .map((cartao) => {
      const f = faturaDaCompetencia(cartao, faturas, competencia);
      return lancamentoDoTotalDaFatura(
        cartao,
        f,
        transacoes,
        transacoes.find((t) => t.hashDedup === hashDedupFatura(cartao.id, { ano: f.ano, mes: f.mes })),
      );
    })
    .filter((t): t is Transacao => t != null && t.valor > 0);
  const hashesMes = new Set(doMes.map((t) => t.hashDedup));
  const listaMes = [
    ...doMes,
    ...totaisFatura.filter((t) => !hashesMes.has(t.hashDedup)),
  ];
  const gastos = doMes.filter((t) => t.tipo === "despesa" && !eLancamentoDeFatura(t));
  const receitas = doMes.filter((t) => t.tipo === "receita");
  const gasto = gastos.reduce((s, t) => s + t.valor, 0);
  const receita = receitas.reduce((s, t) => s + t.valor, 0);
  const comprometido = cartoes.reduce((s, cartao) => {
    const f = faturaDaCompetencia(cartao, faturas, competencia);
    return s + saldoDevedor(f, totalDaFatura(f, transacoes, cartao));
  }, 0);
  const tetos = metasAtivas(metas).filter((m) => m.tipo === "teto_categoria" && m.categoriaID);
  const alertasTeto = tetos
    .map((m) => {
      const gastoCat = gastoDaCategoria(transacoes, m.categoriaID ?? "", competencia, cartoes);
      const p = progressoTeto(m.valorAlvo, gastoCat);
      return { meta: m, progresso: p };
    })
    .filter((x) => x.progresso.faixa === "alerta" || x.progresso.faixa === "estouro");
  const folga = folgaDoPeriodo(metas, transacoes, competencia, cartoes);
  const aPagarComp = compromissosAPagar(compromissos).filter((c) => {
    const [ano, mes] = c.venceEm.split("-").map(Number);
    return (ano ?? 0) < competencia.ano || ((ano ?? 0) === competencia.ano && (mes ?? 0) <= competencia.mes);
  });

  const linhas = useMemo(() => {
    return listaMes
      .slice()
      .reverse()
      .map((t) => {
        const pago = eLancamentoPago(t, faturas);
        return { t, pago };
      })
      .filter(({ pago }) => {
        switch (filtro) {
          case "todos":
            return true;
          case "pagos":
            return pago;
          case "a_pagar":
            return !pago;
          default: {
            const _nunca: never = filtro;
            return _nunca;
          }
        }
      });
  }, [listaMes, faturas, filtro]);

  return (
    <div>
      <Cabecalho
        titulo={`${MESES[competencia.mes - 1]} · ${carteira.nome}`}
        marca
        folga={folga}
        acao={
          <div className="flex items-center">
            <Link
              href={hrefDoMes(avancando(competencia, -1))}
              aria-label="Mês anterior"
              className="casal-toque flex min-h-[44px] min-w-[44px] items-center justify-center text-[22px] text-grafite"
            >
              ‹
            </Link>
            <Link
              href={hrefDoMes(avancando(competencia, 1))}
              aria-label="Próximo mês"
              className="casal-toque flex min-h-[44px] min-w-[44px] items-center justify-center text-[22px] text-grafite"
            >
              ›
            </Link>
          </div>
        }
      />
      <div className="casal-resumo-mes px-4 pt-8">
        <div>
          <Rotulo>gasto neste mês</Rotulo>
          <div className="mt-2">
            <Numero centavos={gasto} tamanho="heroi" subordinaCentavos />
          </div>
          <div className="mt-5">
            <Trilha consumido={gasto} total={gasto + comprometido} />
          </div>
          <p className="mt-2 font-numero text-[12px] tabular-nums text-cinza">
            {gastos.length} lançamentos
          </p>
        </div>
        <div>
          {receita > 0 && (
            <div>
              <Rotulo>receita neste mês</Rotulo>
              <div className="mt-1">
                <Numero centavos={receita} tamanho="secao" />
              </div>
            </div>
          )}
          {comprometido > 0 && (
            <div className={receita > 0 ? "mt-5" : undefined}>
              <Rotulo>comprometido em faturas</Rotulo>
              <div className="mt-1">
                <Numero centavos={comprometido} tamanho="secao" tom="atencao" />
              </div>
              <p className="mt-1 text-[12px] text-cinza">faturas somam mais que o gasto do mês</p>
            </div>
          )}
          {alertasTeto.length > 0 && (
            <div className={receita > 0 || comprometido > 0 ? "mt-5" : undefined}>
              <Rotulo>tetos</Rotulo>
              <div className="mt-2">
                {alertasTeto.map(({ meta, progresso }) => {
                  const cat = categoriaPorId(meta.categoriaID, categorias);
                  return (
                    <p key={meta.id} className="py-1 text-[12px] text-ambar-texto">
                      {fraseTeto(progresso, cat?.nome ?? nomeDaMeta(meta, categorias))}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {aPagarComp.length > 0 && (
        <div className="mt-8 px-4">
          <Rotulo>compromissos</Rotulo>
          <p className="mt-1 text-[12px] text-cinza">
            Já lançados. Na lista do mês, deslize para marcar pago.
          </p>
          <div className="mt-2">
            {aPagarComp.map((c) => (
              <LinhaLista
                key={c.id}
                titulo={c.nome}
                subtitulo={`vence ${c.venceEm.split("-").reverse().join("/")}`}
                valor={c.valor}
                tom="atencao"
                href={`/mais/compromissos/${c.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {listaMes.length === 0 ? (
        aPagarComp.length === 0 ? (
          <Vazio frase="Nenhum gasto este mês. Toque em + para registrar o primeiro." />
        ) : null
      ) : (
        <div className="mt-8 px-4">
          <Rotulo>lançamentos</Rotulo>
          <div className="mt-2 flex gap-2" role="group" aria-label="Filtro dos lançamentos">
            <Etiqueta ativa={filtro === "todos"} aoClicar={() => setFiltro("todos")}>
              Todos
            </Etiqueta>
            <Etiqueta ativa={filtro === "pagos"} aoClicar={() => setFiltro("pagos")}>
              Pagos
            </Etiqueta>
            <Etiqueta ativa={filtro === "a_pagar"} aoClicar={() => setFiltro("a_pagar")}>
              A pagar
            </Etiqueta>
          </div>
          <div className="casal-tabela-cabeca mt-4" role="row">
            <span>descrição</span>
            <span>categoria</span>
            <span>origem</span>
            <span>valor</span>
            <span>estado</span>
          </div>
          <div className="mt-2">
            {linhas.length === 0 ? (
              <p className="py-4 text-[14px] text-cinza">
                {filtro === "pagos" ? "Nenhum pago neste mês." : "Nada a pagar neste mês."}
              </p>
            ) : (
              linhas.map(({ t, pago }) => {
                const cat = categoriaPorId(t.categoriaID, categorias);
                const quem =
                  mostraPagador ? indicadorPagador(t.pagadorID, membros ?? [], usuarioID) : null;
                const origem = origemDaTransacao(t, contas, cartoes);
                const compraCartao = eCompraNoCartao(t);
                const papel = eLancamentoDeFatura(t)
                  ? "fatura"
                  : t.tipo === "receita" ? "receita" : (cat?.nome ?? "Sem categoria");
                const parcela = t.parcelaTotal > 1 ? `${t.parcelaN}/${t.parcelaTotal}` : null;
                const partes = [papel, parcela, origem?.nome, quem].filter(Boolean);
                const titulo = t.descricao || cat?.nome || "Sem descrição";
                return (
                  <LinhaDeslizavel
                    key={t.id}
                    desabilitado={pago || compraCartao}
                    acao={
                      pago || compraCartao || !liquidarLancamento
                        ? undefined
                        : { rotulo: "Pago", aoClicar: () => setPagando(t) }
                    }
                  >
                    <Link
                      href={
                        eLancamentoDeFatura(t) && t.cartaoID
                          ? `/cartoes/${t.cartaoID}/faturas/${rotuloDaCompetencia(
                              competenciaDoHashFatura(t.hashDedup)?.competencia ?? competencia,
                            )}/pagar`
                          : `/lancamentos/${t.id}`
                      }
                      className="casal-toque casal-linha-mes"
                    >
                      <span className="casal-linha-mes-desc">
                        <span className="block truncate text-[14px] text-grafite">{titulo}</span>
                        <span className="casal-linha-mes-sub">{partes.join(" · ")}</span>
                      </span>
                      <span className="casal-linha-mes-cat">
                        {papel}
                        {parcela ? ` · ${parcela}` : ""}
                      </span>
                      <span className="casal-linha-mes-origem">
                        {origem?.cor && <BolinhaCor cor={origem.cor} />}
                        <span className="truncate">
                          {[origem?.nome, quem].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="casal-linha-mes-valor">
                        <Numero centavos={t.valor} tamanho="corpo" />
                      </span>
                      <span className="casal-linha-mes-estado">
                        {pago ? (
                          <span aria-label="pago" className="text-[14px] text-pago">
                            ✓
                          </span>
                        ) : (
                          <span className="casal-linha-mes-estado-texto">a pagar</span>
                        )}
                      </span>
                    </Link>
                  </LinhaDeslizavel>
                );
              })
            )}
          </div>
        </div>
      )}

      {pagando && liquidarLancamento && (
        <ModalPagar
          descricao={pagando.descricao}
          valor={pagando.valor}
          contaID={pagando.contaID}
          cartaoID={pagando.cartaoID}
          aoFechar={() => setPagando(null)}
          somenteContas={eLancamentoDeFatura(pagando)}
          aoConfirmar={(origem) => liquidarLancamento({ id: pagando.id, ...origem })}
        />
      )}
    </div>
  );
}
