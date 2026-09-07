"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  avancando,
  chaveCompetencia,
  competenciaDaCompra,
  competenciaDaConsulta,
  competenciaDe,
  dataLocalISO,
  hrefDoCartao,
  rotuloCurto,
  rotuloDaCompetencia,
  type Competencia,
  type ProgramaPontos,
  type Transacao,
} from "@/lib/domain";
import {
  equivalenteEmCentavos,
  formatarMetricaPontos,
  formatarSaldoPontos,
  programaVisivel,
} from "@/lib/pontos";
import {
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

/** Mais recente primeiro — mesmo desempate estável por id. */
function porDataRecente(a: Transacao, b: Transacao): number {
  const porData = b.data.localeCompare(a.data);
  return porData !== 0 ? porData : b.id.localeCompare(a.id);
}

function mesesEntre(a: Competencia, b: Competencia): number {
  return b.ano * 12 + (b.mes - 1) - (a.ano * 12 + (a.mes - 1));
}

function etiquetaFatura(vista: Competencia, atual: Competencia): string {
  const delta = mesesEntre(atual, vista);
  if (delta === 0) return "fatura atual";
  if (delta === 1) return "próxima fatura";
  if (delta > 1) return "fatura futura";
  return "fatura anterior";
}

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

export function CartaoDetalhe({
  id,
  competenciaRota,
}: {
  id: string;
  /** Query `?c=AAAA-MM` — deep-link da fatura/competência. */
  competenciaRota?: string;
}) {
  const { cartoes, transacoes, faturas, apagarCartao, apagarLancamentos, usuarioID } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const agora = new Date();
  const atualComp = competenciaDe(agora);
  const competencia = competenciaDaConsulta(competenciaRota);
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
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

  const fatura = faturaDaCompetencia(cartao, faturas, competencia);
  const total = totalDaFatura(fatura, transacoes, cartao);
  const papel = etiquetaFatura(competencia, atualComp);

  const lancamentos = useMemo(() =>
    transacoes
      .filter((t) => t.tipo === "despesa" && t.cartaoID === cartao.id)
      .filter((t) => {
        const x = competenciaDaCompra(new Date(t.data), cartao);
        return x.ano === fatura.ano && x.mes === fatura.mes;
      })
      .slice()
      .sort(porDataRecente),
    [transacoes, cartao, fatura.ano, fatura.mes],
  );

  const todosSelecionados = lancamentos.length > 0 && lancamentos.every((t) => selecionados.has(t.id));
  const algunsSelecionados = lancamentos.some((t) => selecionados.has(t.id));
  const qtdSelecionados = lancamentos.filter((t) => selecionados.has(t.id)).length;

  function alternarTodos(marcar: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      for (const t of lancamentos) {
        if (marcar) next.add(t.id);
        else next.delete(t.id);
      }
      return next;
    });
  }

  function alternarLancamento(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function excluirSelecionados() {
    if (excluindo || qtdSelecionados === 0) return;
    setExcluindo(true);
    try {
      const idsParaExcluir = lancamentos.filter((t) => selecionados.has(t.id)).map((t) => t.id);
      await apagarLancamentos({ ids: idsParaExcluir });
      setSelecionados(new Set());
      setConfirmandoExclusao(false);
      avisar("ok", `${idsParaExcluir.length} lançamento${idsParaExcluir.length === 1 ? "" : "s"} excluído${idsParaExcluir.length === 1 ? "" : "s"}.`);
    } catch {
      avisar("erro", "Não deu para excluir. Tente de novo.");
    } finally {
      setExcluindo(false);
    }
  }

  function subtituloLancamento(t: Transacao): string {
    const data = dataLocalISO(new Date(t.data)).split("-").reverse().join("/");
    if (t.parcelaTotal > 1) return `${data} · parcela ${t.parcelaN} de ${t.parcelaTotal}`;
    return data;
  }

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
                className="casal-toque flex min-h-[44px] items-center text-[14px] font-semibold text-ambar-texto"
              >
                Apagar
              </button>
            )}
            <Link
              href={`/cartoes/${cartao.id}/editar`}
              className="casal-toque flex min-h-[44px] items-center text-[14px] text-grafite"
            >
              Editar
            </Link>
          </div>
        }
      />
      <div className="px-4 pt-6">
        <Rotulo>{cartao.banco} · final {cartao.ultimos4}</Rotulo>
        <BlocoPontos programa={cartao.programa} />

        <div className="mt-6 flex items-center justify-between gap-2">
          <Link
            href={hrefDoCartao(cartao.id, avancando(competencia, -1))}
            aria-label="Fatura anterior"
            className="casal-toque flex min-h-[44px] min-w-[44px] items-center justify-center text-[22px] text-grafite"
          >
            ‹
          </Link>
          <div className="min-w-0 flex-1 text-center" aria-live="polite">
            <p className="font-texto text-[16px] font-semibold text-grafite">
              {rotuloCurto(competencia)} {competencia.ano}
            </p>
            <p className="mt-0.5 text-[12px] text-cinza">{papel}</p>
          </div>
          <Link
            href={hrefDoCartao(cartao.id, avancando(competencia, 1))}
            aria-label="Próxima fatura"
            className="casal-toque flex min-h-[44px] min-w-[44px] items-center justify-center text-[22px] text-grafite"
          >
            ›
          </Link>
        </div>

        {chaveCompetencia(competencia) !== chaveCompetencia(atualComp) && (
          <Link
            href={hrefDoCartao(cartao.id, atualComp)}
            className="casal-toque mt-2 mx-auto flex min-h-[44px] items-center justify-center text-[13px] font-semibold text-grafite"
          >
            Voltar à fatura atual
          </Link>
        )}

        <div className="mt-6">
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
            className="casal-toque mt-5 flex min-h-[44px] items-center justify-center rounded-controle bg-grafite font-texto text-[14px] font-semibold text-ar"
          >
            Pagar
          </Link>
        )}
        <Link
          href={`/cartoes/${cartao.id}/importar-ofx`}
          className={`${fatura.status !== "paga" && total > 0 ? "mt-3" : "mt-5"} casal-toque flex min-h-[44px] items-center justify-center rounded-controle border border-nevoa font-texto text-[14px] font-semibold text-grafite`}
        >
          Importar OFX
        </Link>
        <div className="mt-8">
          {lancamentos.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-cinza">
              Nenhum lançamento nesta fatura
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-controle border border-nevoa p-3 mb-4">
                <label
                  htmlFor="cartao-selecionar-todos"
                  className="relative z-[1] flex min-h-[44px] cursor-pointer items-center gap-3 text-[14px] text-grafite"
                >
                  <input
                    id="cartao-selecionar-todos"
                    type="checkbox"
                    checked={todosSelecionados}
                    aria-label="Selecionar todos"
                    onChange={(e) => alternarTodos(e.target.checked)}
                    className="pointer-events-auto h-5 w-5 shrink-0"
                  />
                  Selecionar todos
                  {algunsSelecionados && (
                    <span className="text-[12px] text-cinza">
                      ({qtdSelecionados} de {lancamentos.length})
                    </span>
                  )}
                </label>
                {algunsSelecionados && !confirmandoExclusao && (
                  <Botao
                    variante="destrutivo"
                    onClick={() => setConfirmandoExclusao(true)}
                  >
                    Excluir {qtdSelecionados} selecionado{qtdSelecionados === 1 ? "" : "s"}
                  </Botao>
                )}
                {confirmandoExclusao && (
                  <div
                    role="alertdialog"
                    aria-labelledby="excluir-lancamentos-titulo"
                    className="space-y-2"
                  >
                    <p id="excluir-lancamentos-titulo" className="text-[14px] text-grafite">
                      Excluir {qtdSelecionados} lançamento{qtdSelecionados === 1 ? "" : "s"}? Esta ação é irreversível.
                    </p>
                    <Botao
                      variante="destrutivo"
                      disabled={excluindo}
                      carregando={excluindo}
                      onClick={() => void excluirSelecionados()}
                    >
                      Excluir
                    </Botao>
                    <Botao
                      variante="secundario"
                      onClick={() => setConfirmandoExclusao(false)}
                      disabled={excluindo}
                    >
                      Cancelar
                    </Botao>
                  </div>
                )}
              </div>
              {lancamentos.map((t) => (
                <div key={t.id} className="flex items-start gap-3 border-b border-nevoa py-3">
                  <label className="relative z-[1] flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selecionados.has(t.id)}
                      aria-label={`Selecionar ${t.descricao || "lançamento"}`}
                      onChange={() => alternarLancamento(t.id)}
                      className="pointer-events-auto h-5 w-5 shrink-0"
                    />
                  </label>
                  <Link
                    href={`/lancamentos/${t.id}`}
                    className="casal-toque flex flex-1 items-center justify-between min-h-[44px]"
                    aria-label={`${t.descricao || "Sem descrição"}, ${subtituloLancamento(t)}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-grafite">{t.descricao || "Sem descrição"}</span>
                      <span className="block text-[12px] text-cinza">{subtituloLancamento(t)}</span>
                    </span>
                    <Numero centavos={t.valor} tamanho="corpo" />
                  </Link>
                </div>
              ))}
            </>
          )}
        </div>

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
