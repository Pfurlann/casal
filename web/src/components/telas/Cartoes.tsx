"use client";

import Link from "next/link";
import { competenciaDe, horizonte, rotuloCurto, avancando } from "@/lib/domain";
import {
  faturaAtualOuRascunho,
  faturaDaCompetencia,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { formatarBRL } from "@/lib/money";
import { ROTULO_VISIBILIDADE_ORIGEM } from "@/lib/visibilidade";
import { Cabecalho } from "../ui/Cabecalho";
import { Curva } from "../ui/Curva";
import { LinhaLista } from "../ui/LinhaLista";
import { BolinhaCor } from "../ui/SeletorCor";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Vazio } from "../ui/Vazio";

export function Cartoes() {
  const { cartoes, transacoes, faturas } = useLoja();
  const agora = new Date();
  const c0 = competenciaDe(agora);

  const itens = cartoes.map((cartao) => {
    const atual = faturaAtualOuRascunho(cartao, faturas, agora);
    const total = totalDaFatura(atual, transacoes, cartao);
    const prox = faturaDaCompetencia(cartao, faturas, avancando(c0, 1));
    return {
      cartao,
      total,
      aPagar: saldoDevedor(atual, total),
      proxima: totalDaFatura(prox, transacoes, cartao),
      fecha: atual.fechaEm.slice(8),
      vence: atual.venceEm.slice(8),
      curva: horizonte(6, c0, transacoes, cartao),
    };
  });

  const totalMes = itens.reduce((s, t) => s + t.aPagar, 0);
  const pontos = [0, 1, 2, 3, 4, 5].map((i) => ({
    rotulo: rotuloCurto(avancando(c0, i)),
    total: itens.reduce((s, t) => s + (t.curva[i]?.total ?? 0), 0),
  }));

  if (cartoes.length === 0) {
    return (
      <div>
        <Cabecalho titulo="cartões" />
        <Vazio
          frase="Nenhum cartão. Cadastre um para acompanhar faturas e parcelas."
          acao={
            <Link
              href="/cartoes/novo"
              className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
            >
              Adicionar cartão
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Cabecalho
        titulo="cartões"
        acao={
          <Link
            href="/cartoes/novo"
            aria-label="Adicionar cartão"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="casal-grade px-4 pt-8">
        <div>
          <Rotulo>a pagar este mês</Rotulo>
          <div className="mt-2">
            <Numero centavos={totalMes} tamanho="heroi" subordinaCentavos />
          </div>
        </div>
        <div>
          <Rotulo>próximas faturas · todos os cartões</Rotulo>
          <div className="mt-3">
            <Curva pontos={pontos} />
          </div>
        </div>
      </div>
      <div className="mt-8 px-4">
        {itens.map((t) => (
          <LinhaLista
            key={t.cartao.id}
            icone={<BolinhaCor cor={t.cartao.cor} />}
            titulo={`${t.cartao.banco} · ${t.cartao.apelido}`}
            subtitulo={`${t.cartao.visibilidade ? `${ROTULO_VISIBILIDADE_ORIGEM[t.cartao.visibilidade]} · ` : ""}fecha ${t.fecha} · vence ${t.vence} · próx. ${formatarBRL(t.proxima)}`}
            valor={t.total}
            href={`/cartoes/${t.cartao.id}`}
          />
        ))}
      </div>
    </div>
  );
}
