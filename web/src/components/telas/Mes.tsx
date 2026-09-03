"use client";

import { useMemo, useState } from "react";
import { categoriaPorId } from "@/lib/categorias";
import { competenciaDe, type Transacao } from "@/lib/domain";
import { compromissosAPagar } from "@/lib/compromissos";
import { eLancamentoPago } from "@/lib/despesas-fixas";
import {
  folgaDoPeriodo,
  fraseTeto,
  gastoDaCategoria,
  metasAtivas,
  nomeDaMeta,
  progressoTeto,
} from "@/lib/metas";
import { origemDaTransacao } from "@/lib/origem";
import { carteiraMostraPagador, indicadorPagador } from "@/lib/pagador";
import {
  faturaAtualOuRascunho,
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
import { Trilha } from "../ui/Trilha";
import { Vazio } from "../ui/Vazio";
import { ModalPagar } from "./ModalPagar";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

type FiltroMes = "todos" | "pagos" | "a_pagar";

export function Mes() {
  const {
    transacoes,
    cartoes,
    contas,
    faturas,
    carteira,
    membros,
    usuarioID,
    categorias,
    despesasFixas,
    metas,
    compromissos,
    liquidarLancamento,
  } = useLoja();
  const mostraPagador = carteiraMostraPagador(carteira) && (membros?.length ?? 0) > 1;
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const competencia = competenciaDe(agora);
  const [filtro, setFiltro] = useState<FiltroMes>("todos");
  const [pagando, setPagando] = useState<Transacao | null>(null);

  const doMes = transacoes.filter((t) => {
    const d = new Date(t.data);
    return (t.tipo === "despesa" || t.tipo === "receita") && d >= inicio && d < fim;
  });
  const gastos = doMes.filter((t) => t.tipo === "despesa");
  const receitas = doMes.filter((t) => t.tipo === "receita");
  const gasto = gastos.reduce((s, t) => s + t.valor, 0);
  const receita = receitas.reduce((s, t) => s + t.valor, 0);
  const comprometido = cartoes.reduce((s, cartao) => {
    const f = faturaAtualOuRascunho(cartao, faturas, agora);
    return s + saldoDevedor(f, totalDaFatura(f, transacoes, cartao));
  }, 0);
  const tetos = metasAtivas(metas).filter((m) => m.tipo === "teto_categoria" && m.categoriaID);
  const alertasTeto = tetos
    .map((m) => {
      const gastoCat = gastoDaCategoria(transacoes, m.categoriaID ?? "", competencia);
      const p = progressoTeto(m.valorAlvo, gastoCat);
      return { meta: m, progresso: p };
    })
    .filter((x) => x.progresso.faixa === "alerta" || x.progresso.faixa === "estouro");
  const folga = folgaDoPeriodo(metas, transacoes, competencia);
  const aPagarComp = compromissosAPagar(compromissos).filter((c) => {
    const [ano, mes] = c.venceEm.split("-").map(Number);
    return (ano ?? 0) < competencia.ano || ((ano ?? 0) === competencia.ano && (mes ?? 0) <= competencia.mes);
  });

  const linhas = useMemo(() => {
    return doMes
      .slice()
      .reverse()
      .map((t) => {
        const pago = eLancamentoPago(t, transacoes, despesasFixas ?? []);
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
  }, [doMes, transacoes, despesasFixas, filtro]);

  return (
    <div>
      <Cabecalho titulo={`${MESES[agora.getMonth()]} · ${carteira.nome}`} marca folga={folga} />
      <div className="px-4 pt-8">
        <Rotulo>gasto neste mês</Rotulo>
        <div className="mt-2">
          <Numero centavos={gasto} tamanho="heroi" subordinaCentavos />
        </div>
        {receita > 0 && (
          <div className="mt-3">
            <Rotulo>receita neste mês</Rotulo>
            <div className="mt-1">
              <Numero centavos={receita} tamanho="secao" />
            </div>
          </div>
        )}
        <div className="mt-5">
          <Trilha consumido={gasto} total={gasto + comprometido} />
        </div>
        <p className="mt-2 font-numero text-[12px] tabular-nums text-cinza">
          {comprometido > 0
            ? `${gastos.length} lançamentos · faturas somam mais`
            : `${gastos.length} lançamentos`}
        </p>
        {comprometido > 0 && (
          <div className="mt-1">
            <span className="text-[12px] text-cinza">comprometido em faturas </span>
            <Numero centavos={comprometido} tamanho="legenda" tom="atencao" />
          </div>
        )}
        {alertasTeto.length > 0 && (
          <div className="mt-5">
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

      {doMes.length === 0 ? (
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
                const papel = t.tipo === "receita" ? "receita" : (cat?.nome ?? "Sem categoria");
                const partes = [
                  papel,
                  t.parcelaTotal > 1 ? `${t.parcelaN}/${t.parcelaTotal}` : null,
                  origem?.nome,
                  quem,
                ].filter(Boolean);
                return (
                  <LinhaDeslizavel
                    key={t.id}
                    desabilitado={pago}
                    acao={
                      pago || !liquidarLancamento
                        ? undefined
                        : { rotulo: "Pago", aoClicar: () => setPagando(t) }
                    }
                  >
                    <LinhaLista
                      href={`/lancamentos/${t.id}`}
                      titulo={t.descricao || cat?.nome || "Sem descrição"}
                      subtitulo={partes.join(" · ")}
                      valor={t.valor}
                      cor={origem?.cor}
                      pago={pago}
                      semBorda
                    />
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
          aoConfirmar={(origem) => liquidarLancamento({ id: pagando.id, ...origem })}
        />
      )}
    </div>
  );
}
