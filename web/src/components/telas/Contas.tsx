"use client";

import Link from "next/link";
import { ROTULO_TIPO_CONTA } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { ROTULO_VISIBILIDADE_ORIGEM, visibilidadePadraoDaCarteira } from "@/lib/visibilidade";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Vazio } from "../ui/Vazio";

export function Contas() {
  const { contas, carteira } = useLoja();

  return (
    <div>
      <Cabecalho
        titulo="contas"
        voltarPara="/mais"
        acao={
          <Link
            href="/mais/contas/novo"
            aria-label="Adicionar conta"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <p className="text-[12px] text-cinza">
          O que você tem no banco — usadas ao pagar fatura.
        </p>
        {contas.length === 0 ? (
          <Vazio
            frase="Nenhuma conta cadastrada."
            acao={
              <Link
                href="/mais/contas/novo"
                className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
              >
                Adicionar conta
              </Link>
            }
          />
        ) : (
          <div className="mt-4">
            {contas.map((c) => (
              <LinhaLista
                key={c.id}
                titulo={c.nome}
                subtitulo={`${ROTULO_TIPO_CONTA[c.tipo]} · ${ROTULO_VISIBILIDADE_ORIGEM[c.visibilidade ?? visibilidadePadraoDaCarteira(carteira)]}`}
                valor={c.saldoInicial}
                href={`/mais/contas/${c.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
