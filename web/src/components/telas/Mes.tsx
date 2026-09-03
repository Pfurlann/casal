"use client";

import { categoriaPorId } from "@/lib/categorias";
import { competenciaDe } from "@/lib/domain";
import { vencimentosDoMes } from "@/lib/despesas-fixas";
import {
  folgaDoPeriodo,
  fraseTeto,
  gastoDaCategoria,
  metasAtivas,
  nomeDaMeta,
  progressoTeto,
} from "@/lib/metas";
import { carteiraMostraPagador, indicadorPagador } from "@/lib/pagador";
import {
  faturaAtualOuRascunho,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Trilha } from "../ui/Trilha";
import { Vazio } from "../ui/Vazio";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function Mes() {
  const {
    transacoes,
    cartoes,
    faturas,
    carteira,
    membros,
    usuarioID,
    categorias,
    despesasFixas,
    metas,
    lancarDespesaFixa,
  } = useLoja();
  const mostraPagador = carteiraMostraPagador(carteira) && (membros?.length ?? 0) > 1;
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const competencia = competenciaDe(agora);

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
  const projetados = vencimentosDoMes(despesasFixas ?? [], transacoes, competencia).filter(
    (v) => !v.lancada,
  );
  const tetos = metasAtivas(metas).filter((m) => m.tipo === "teto_categoria" && m.categoriaID);
  const alertasTeto = tetos
    .map((m) => {
      const gasto = gastoDaCategoria(transacoes, m.categoriaID ?? "", competencia);
      const p = progressoTeto(m.valorAlvo, gasto);
      return { meta: m, progresso: p };
    })
    .filter((x) => x.progresso.faixa === "alerta" || x.progresso.faixa === "estouro");
  const folga = folgaDoPeriodo(metas, transacoes, competencia);

  async function lancarFixo(id: string) {
    if (!lancarDespesaFixa) return;
    try {
      await lancarDespesaFixa(id, competencia);
    } catch {
      /* o aviso vive em Fixos; aqui o mês só tenta lançar */
    }
  }

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

      {projetados.length > 0 && (
        <div className="mt-8 px-4">
          <Rotulo>projetado</Rotulo>
          <p className="mt-1 text-[12px] text-cinza">
            Vence ou entra neste mês. Lançar não duplica a competência.
          </p>
          <div className="mt-2">
            {projetados.map((v) => {
              const cat = categoriaPorId(v.fixa.categoriaID, categorias);
              const receitaFixa = v.fixa.tipo === "receita";
              return (
                <div
                  key={v.fixa.id}
                  className="flex min-h-[44px] items-center gap-3 border-b border-nevoa py-3"
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[14px] text-grafite">{v.fixa.nome}</span>
                    <span className="block truncate text-[12px] text-cinza">
                      {receitaFixa ? "receita" : "gasto"} · dia {Number(v.venceEm.slice(-2))}
                      {cat ? ` · ${cat.nome}` : ""}
                    </span>
                  </span>
                  <Numero centavos={v.fixa.valor} tamanho="corpo" />
                  <button
                    type="button"
                    onClick={() => void lancarFixo(v.fixa.id)}
                    className="shrink-0 text-[14px] font-semibold text-grafite"
                  >
                    Lançar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {doMes.length === 0 ? (
        projetados.length === 0 ? (
          <Vazio frase="Nenhum gasto este mês. Toque em + para registrar o primeiro." />
        ) : null
      ) : (
        <div className="mt-8 px-4">
          <Rotulo>hoje</Rotulo>
          <div className="mt-2">
            {doMes
              .slice()
              .reverse()
              .map((t) => {
                const cat = categoriaPorId(t.categoriaID, categorias);
                const quem =
                  mostraPagador ? indicadorPagador(t.pagadorID, membros ?? [], usuarioID) : null;
                const papel = t.tipo === "receita" ? "receita" : (cat?.nome ?? "Sem categoria");
                const base =
                  t.parcelaTotal > 1
                    ? `${papel} · ${t.parcelaN}/${t.parcelaTotal}`
                    : t.tipo === "receita"
                      ? `${papel}${cat ? ` · ${cat.nome}` : ""}`
                      : papel;
                return (
                  <LinhaLista
                    key={t.id}
                    href={`/lancamentos/${t.id}`}
                    titulo={t.descricao || cat?.nome || "Sem descrição"}
                    subtitulo={quem ? `${base} · ${quem}` : base}
                    valor={t.valor}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
