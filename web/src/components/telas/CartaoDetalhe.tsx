"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  avancando,
  competenciaDaCompra,
  competenciaDe,
  rotuloCurto,
  rotuloDaCompetencia,
  type ProgramaPontos,
} from "@/lib/domain";
import {
  equivalenteEmCentavos,
  formatarMetricaPontos,
  formatarSaldoPontos,
  programaVisivel,
} from "@/lib/pontos";
import {
  faturaAtualOuRascunho,
  faturaDaCompetencia,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { eDonoDaOrigem } from "@/lib/visibilidade";
import { Cabecalho } from "../ui/Cabecalho";
import { Botao } from "../ui/Botao";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { useAviso } from "../ui/Aviso";

type Aba = "atual" | "proxima" | "futuras";

function BlocoPontos({ programa }: { programa?: ProgramaPontos }) {
  const p = programaVisivel(programa);
  if (!p) return null;
  const reais = equivalenteEmCentavos(p);
  return (
    <div className="mt-4" aria-label="Programa de pontos">
      <Rotulo>pontos</Rotulo>
      <p className="mt-1 font-texto text-[16px] text-grafite">
        {p.nome} · {formatarSaldoPontos(p.saldo)} pts
      </p>
      <p className="mt-1 text-[12px] text-cinza">
        {formatarMetricaPontos(p)}
        {reais != null && (
          <>
            {" · ≈ "}
            <Numero centavos={reais} tamanho="legenda" />
          </>
        )}
      </p>
      <p className="mt-1 text-[12px] text-cinza">Saldo informado por você</p>
    </div>
  );
}

export function CartaoDetalhe({ id }: { id: string }) {
  const { cartoes, transacoes, faturas, apagarCartao, usuarioID } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("atual");
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const cartao = cartoes.find((c) => c.id === id);
  const podeApagar = Boolean(cartao && eDonoDaOrigem(cartao, usuarioID));

  if (!cartao) {
    return (
      <div>
        <Cabecalho titulo="cartão" voltarPara="/cartoes" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este cartão não existe mais.</p>
      </div>
    );
  }

  const agora = new Date();
  const c0 = competenciaDe(agora);
  const atual = faturaAtualOuRascunho(cartao, faturas, agora);
  const prox = faturaDaCompetencia(cartao, faturas, avancando(c0, 1));
  const fatura = aba === "proxima" ? prox : atual;
  const total = totalDaFatura(fatura, transacoes, cartao);

  const lancamentos = transacoes
    .filter((t) => t.tipo === "despesa" && t.cartaoID === cartao.id)
    .filter((t) => {
      const x = competenciaDaCompra(new Date(t.data), cartao);
      return x.ano === fatura.ano && x.mes === fatura.mes;
    });

  async function apagar() {
    if (!cartao || !podeApagar) return;
    setApagando(true);
    try {
      await apagarCartao(cartao.id);
      router.push("/cartoes");
    } catch {
      avisar("erro", "Não deu para apagar o cartão. Tente de novo.");
    } finally {
      setApagando(false);
    }
  }

  return (
    <div>
      <Cabecalho
        titulo={cartao.apelido}
        voltarPara="/cartoes"
        acao={
          <div className="flex items-center gap-3">
            {podeApagar && !confirmando && (
              <button
                type="button"
                aria-label="Apagar cartão"
                onClick={() => setConfirmando(true)}
                className="flex min-h-[44px] items-center text-[14px] font-semibold text-ambar-texto"
              >
                Apagar
              </button>
            )}
            <Link
              href={`/cartoes/${cartao.id}/editar`}
              className="flex min-h-[44px] items-center text-[14px] text-grafite"
            >
              Editar
            </Link>
          </div>
        }
      />
      <div className="px-4 pt-6">
        <Rotulo>{cartao.banco} · final {cartao.ultimos4}</Rotulo>
        <BlocoPontos programa={cartao.programa} />
        <div className="mt-4 flex gap-2">
          {(["atual", "proxima", "futuras"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              aria-pressed={aba === a}
              className={`min-h-[44px] flex-1 rounded-controle text-[12px] ${
                aba === a ? "bg-grafite text-ar" : "border border-nevoa text-grafite"
              }`}
            >
              {a === "atual" ? "Atual" : a === "proxima" ? "Próxima" : "Futuras"}
            </button>
          ))}
        </div>

        {aba !== "futuras" ? (
          <>
            <div className="mt-8">
              <Rotulo>
                fecha {fatura.fechaEm.split("-").reverse().join("/")} · vence{" "}
                {fatura.venceEm.split("-").reverse().join("/")}
              </Rotulo>
              <div className="mt-2">
                <Numero centavos={total} tamanho="heroi" subordinaCentavos />
              </div>
            </div>
            {fatura.status !== "paga" && total > 0 && (
              <Link
                href={`/cartoes/${cartao.id}/faturas/${rotuloDaCompetencia(fatura)}/pagar`}
                className="mt-5 flex min-h-[44px] items-center justify-center rounded-controle bg-grafite font-texto text-[14px] font-semibold text-ar"
              >
                Pagar
              </Link>
            )}
            <Link
              href={`/cartoes/${cartao.id}/importar-ofx`}
              className={`${fatura.status !== "paga" && total > 0 ? "mt-3" : "mt-5"} flex min-h-[44px] items-center justify-center rounded-controle border border-nevoa font-texto text-[14px] font-semibold text-grafite`}
            >
              Importar OFX
            </Link>
            <div className="mt-8">
              {lancamentos.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-cinza">
                  Nenhum lançamento nesta fatura
                </p>
              ) : (
                lancamentos.map((t) => (
                  <LinhaLista
                    key={t.id}
                    href={`/lancamentos/${t.id}`}
                    titulo={t.descricao || "Sem descrição"}
                    subtitulo={
                      t.parcelaTotal > 1 ? `parcela ${t.parcelaN} de ${t.parcelaTotal}` : undefined
                    }
                    valor={t.valor}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="mt-8">
            {[2, 3, 4, 5].map((i) => {
              const c = avancando(c0, i);
              const f = faturaDaCompetencia(cartao, faturas, c);
              return (
                <LinhaLista
                  key={rotuloDaCompetencia(c)}
                  titulo={`${rotuloCurto(c)} ${c.ano}`}
                  valor={totalDaFatura(f, transacoes, cartao)}
                />
              );
            })}
          </div>
        )}
        {confirmando && (
          <div
            role="alertdialog"
            aria-labelledby="apagar-cartao-titulo"
            className="mt-8 space-y-2"
          >
            <p id="apagar-cartao-titulo" className="text-[14px] text-grafite">
              Apagar cartão? Lançamentos antigos ficam.
            </p>
            <Botao variante="destrutivo" disabled={apagando} onClick={() => void apagar()}>
              Apagar
            </Botao>
            <Botao variante="secundario" onClick={() => setConfirmando(false)} disabled={apagando}>
              Cancelar
            </Botao>
          </div>
        )}
      </div>
    </div>
  );
}
