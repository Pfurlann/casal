"use client";

import { CATEGORIAS } from "@/lib/domain";
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
  const { transacoes, cartoes, faturas, carteira } = useLoja();
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const doMes = transacoes.filter((t) => {
    const d = new Date(t.data);
    return t.tipo === "despesa" && d >= inicio && d < fim;
  });
  const gasto = doMes.reduce((s, t) => s + t.valor, 0);
  const comprometido = cartoes.reduce((s, cartao) => {
    const f = faturaAtualOuRascunho(cartao, faturas, agora);
    return s + saldoDevedor(f, totalDaFatura(f, transacoes, cartao));
  }, 0);

  return (
    <div>
      <Cabecalho titulo={`${MESES[agora.getMonth()]} · ${carteira.nome}`} marca />
      <div className="px-4 pt-8">
        <Rotulo>gasto neste mês</Rotulo>
        <div className="mt-2">
          <Numero centavos={gasto} tamanho="heroi" subordinaCentavos />
        </div>
        <div className="mt-5">
          <Trilha consumido={gasto} total={gasto + comprometido} />
        </div>
        <p className="mt-2 font-numero text-[12px] tabular-nums text-cinza">
          {comprometido > 0
            ? `${doMes.length} lançamentos · faturas somam mais`
            : `${doMes.length} lançamentos`}
        </p>
        {comprometido > 0 && (
          <div className="mt-1">
            <span className="text-[12px] text-cinza">comprometido em faturas </span>
            <Numero centavos={comprometido} tamanho="legenda" tom="atencao" />
          </div>
        )}
      </div>

      {doMes.length === 0 ? (
        <Vazio frase="Nenhum gasto este mês. Toque em + para registrar o primeiro." />
      ) : (
        <div className="mt-8 px-4">
          <Rotulo>hoje</Rotulo>
          <div className="mt-2">
            {doMes
              .slice()
              .reverse()
              .map((t) => {
                const cat = CATEGORIAS.find((c) => c.id === t.categoriaID);
                return (
                  <LinhaLista
                    key={t.id}
                    titulo={t.descricao || cat?.nome || "Sem descrição"}
                    subtitulo={cat?.nome ?? "Sem categoria"}
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
