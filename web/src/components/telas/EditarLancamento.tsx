"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import { ROTULO_TIPO_CONTA, dataDeLocalISO, dataLocalISO } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import { carteiraMostraPagador, membroPodeEditarLancamento } from "@/lib/pagador";
import { useLoja } from "@/lib/store";
import { ehGrupoParcela } from "@/lib/transacoes";
import { origensDoPagador } from "@/lib/visibilidade";
import { Cabecalho } from "../ui/Cabecalho";
import { SeletorPagador } from "../ui/SeletorPagador";
import { Campo } from "../ui/Campo";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { SeletorCategoria } from "../ui/SeletorCategoria";
import { Teclado } from "../ui/Teclado";
import { Botao } from "../ui/Botao";
import { useAviso } from "../ui/Aviso";
import { fecharFolha } from "@/lib/folha-nav";

const SELECT =
  "mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite";

export function EditarLancamento({
  id,
  aoSair,
}: {
  id: string;
  aoSair?: () => void;
}) {
  const loja = useLoja();
  const { transacoes, editar, apagar } = loja;
  const contasTodas = loja.contasTodas ?? loja.contas ?? [];
  const cartoesTodos = loja.cartoesTodos ?? loja.cartoes ?? [];
  const carteiras =
    (loja.carteiras ?? []).length > 0
      ? (loja.carteiras ?? [])
      : loja.carteira
        ? [{ ...loja.carteira, membrosN: 1, souDono: true }]
        : [];
  const { avisar } = useAviso();
  const router = useRouter();
  const tx = transacoes.find((t) => t.id === id);

  const [entrada] = useState(() => EntradaValor.deCentavos(tx?.valor ?? 0));
  const [, tick] = useState(0);
  const catsEdicao = categoriasVisiveis(
    loja.categorias,
    tx?.tipo === "receita" ? "receita" : "despesa",
  );
  const [categoriaID, setCategoriaID] = useState(tx?.categoriaID ?? catsEdicao[0]?.id ?? "");
  const [descricao, setDescricao] = useState(tx?.descricao ?? "");
  const [dataISO, setDataISO] = useState(() =>
    tx?.data ? dataLocalISO(new Date(tx.data)) : dataLocalISO(),
  );
  const [carteiraID, setCarteiraID] = useState(tx?.carteiraID ?? "");
  const [contaID, setContaID] = useState(tx?.contaID ?? "");
  const [cartaoID, setCartaoID] = useState(tx?.cartaoID ?? "");
  const [pagadorEscolhido, setPagadorEscolhido] = useState<string | undefined>(undefined);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [teclado, setTeclado] = useState(false);

  const voltar = () => {
    if (aoSair) {
      aoSair();
      return;
    }
    fecharFolha(router);
  };

  if (!tx) {
    return (
      <div>
        <Cabecalho titulo="editar lançamento" aoVoltar={voltar} />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este lançamento não existe mais.</p>
      </div>
    );
  }

  const grupo = ehGrupoParcela(tx);
  const valorLivre = tx.parcelaTotal === 1;
  const destCarteira = carteiras.find((c) => c.id === carteiraID) ?? loja.carteira;
  const pagadorID = pagadorEscolhido ?? tx.pagadorID ?? loja.usuarioID ?? "";
  const contasPorRegra = origensDoPagador(contasTodas, destCarteira, pagadorID, loja.usuarioID);
  const cartoesPorRegra = origensDoPagador(cartoesTodos, destCarteira, pagadorID, loja.usuarioID);
  const contasDest =
    contaID && !contasPorRegra.some((c) => c.id === contaID)
      ? [...contasPorRegra, ...contasTodas.filter((c) => c.id === contaID)]
      : contasPorRegra;
  const cartoesDest =
    cartaoID && !cartoesPorRegra.some((c) => c.id === cartaoID)
      ? [...cartoesPorRegra, ...cartoesTodos.filter((c) => c.id === cartaoID)]
      : cartoesPorRegra;
  const pagoCom = cartaoID ? `cartao:${cartaoID}` : contaID ? `conta:${contaID}` : "";
  const cartao = cartoesDest.find((c) => c.id === cartaoID) ?? cartoesTodos.find((c) => c.id === tx.cartaoID);
  const conta = contasDest.find((c) => c.id === contaID) ?? contasTodas.find((c) => c.id === tx.contaID);
  const origemTexto = cartao
    ? `${cartao.banco} · final ${cartao.ultimos4}`
    : conta
      ? conta.nome
      : "Dinheiro, Pix ou débito";
  const mudouCarteira = carteiraID !== tx.carteiraID;
  const temOrigem = Boolean(cartaoID || contaID);
  const destSemOrigem = mudouCarteira && contasDest.length === 0 && cartoesDest.length === 0;
  const mostraPagador = carteiraMostraPagador(destCarteira);
  const mudouPagador = pagadorID !== (tx.pagadorID ?? "");
  const podeMembro = membroPodeEditarLancamento(loja.membros ?? [], loja.usuarioID);
  const pode =
    (!valorLivre || entrada.podeSalvar) &&
    !salvando &&
    (!mudouCarteira || temOrigem) &&
    !destSemOrigem &&
    podeMembro;
  const mudouOrigem =
    mudouCarteira || cartaoID !== (tx.cartaoID ?? "") || contaID !== (tx.contaID ?? "");

  function escolherCarteira(idNovo: string) {
    setCarteiraID(idNovo);
    const dest = carteiras.find((c) => c.id === idNovo) ?? loja.carteira;
    const contas = origensDoPagador(contasTodas, dest, pagadorID, loja.usuarioID);
    const cartoes = origensDoPagador(cartoesTodos, dest, pagadorID, loja.usuarioID);
    const origemVale =
      (cartaoID && cartoes.some((c) => c.id === cartaoID)) ||
      (contaID && contas.some((c) => c.id === contaID));
    if (origemVale) return;
    if (contas[0]) {
      setContaID(contas[0].id);
      setCartaoID("");
      return;
    }
    if (cartoes[0]) {
      setCartaoID(cartoes[0].id);
      setContaID("");
      return;
    }
    setContaID("");
    setCartaoID("");
  }

  function escolherOrigem(valor: string) {
    if (valor.startsWith("cartao:")) {
      setCartaoID(valor.slice("cartao:".length));
      setContaID("");
      return;
    }
    if (valor.startsWith("conta:")) {
      setContaID(valor.slice("conta:".length));
      setCartaoID("");
      return;
    }
    setContaID("");
    setCartaoID("");
  }

  const salvar = async () => {
    if (!pode) return;
    setSalvando(true);
    try {
      await editar({
        id: tx.id,
        descricao,
        categoriaID,
        valor: valorLivre ? entrada.centavos : undefined,
        data: dataDeLocalISO(dataISO).toISOString(),
        carteiraID,
        contaID: cartaoID ? undefined : contaID || undefined,
        cartaoID: cartaoID || undefined,
        pagadorID: pagadorID || undefined,
      });
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o lançamento. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarApagar = async (grupoInteiro: boolean) => {
    setSalvando(true);
    try {
      await apagar({ id: tx.id, grupo: grupoInteiro });
      voltar();
    } catch {
      avisar("erro", "Não deu para apagar o lançamento. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 bg-ar">
        <Cabecalho
          titulo="editar lançamento"
          aoVoltar={voltar}
          acao={
            confirmando ? undefined : (
              <button
                type="button"
                aria-label="Apagar lançamento"
                onClick={() => {
                  setTeclado(false);
                  setConfirmando(true);
                }}
                className="flex min-h-[44px] items-center text-[14px] font-semibold text-ambar-texto"
              >
                Apagar
              </button>
            )
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <div
          className="text-center"
          role="status"
          aria-live="polite"
          aria-label="Valor do gasto"
        >
          {valorLivre ? (
            <button
              type="button"
              aria-expanded={teclado}
              aria-label="Editar valor"
              onClick={() => setTeclado((v) => !v)}
              className="min-h-[44px] w-full"
            >
              <Numero centavos={entrada.centavos} tamanho="heroi" subordinaCentavos />
            </button>
          ) : (
            <Numero centavos={tx.valor} tamanho="heroi" subordinaCentavos />
          )}
        </div>
        {grupo && (
          <p className="pt-2 text-center text-[12px] text-cinza">
            Parcela {tx.parcelaN} de {tx.parcelaTotal}. O valor das parcelas não muda uma a uma.
          </p>
        )}
        {valorLivre && !teclado && (
          <p className="pt-1 text-center text-[12px] text-cinza">Toque no valor para alterar</p>
        )}

        <Campo label="Onde foi o gasto" value={descricao} onChange={setDescricao} />

        <div className="mt-4">
          <Rotulo>data</Rotulo>
          <input
            type="date"
            value={dataISO}
            aria-label="Data do lançamento"
            onChange={(e) => setDataISO(e.target.value)}
            className={SELECT}
          />
          {Boolean(cartaoID) && (
            <p className="mt-2 text-[12px] text-cinza">
              Trocar a data move o lançamento de fatura — sem excluir e relançar.
            </p>
          )}
        </div>

        <div className="mt-4">
          <Rotulo>categoria</Rotulo>
          <div className="mt-2">
            <SeletorCategoria
              tipo={tx.tipo === "receita" ? "receita" : "despesa"}
              custom={loja.categorias}
              valor={categoriaID}
              onChange={setCategoriaID}
            />
          </div>
        </div>

        {carteiras.length > 0 && (
          <div className="mt-4">
            <Rotulo>carteira</Rotulo>
            <select
              value={carteiraID}
              aria-label="Carteira"
              onChange={(e) => escolherCarteira(e.target.value)}
              className={SELECT}
            >
              {carteiras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {grupo && mudouOrigem && (
              <p className="mt-2 text-[12px] text-cinza">
                O parcelamento inteiro vai junto para esta carteira.
              </p>
            )}
          </div>
        )}

        {mostraPagador && (
          <div className="mt-4">
            <Rotulo>quem pagou</Rotulo>
            <SeletorPagador
              membros={loja.membros ?? []}
              usuarioID={loja.usuarioID}
              valor={pagadorID}
              onChange={setPagadorEscolhido}
            />
            {grupo && mudouPagador && (
              <p className="mt-2 text-[12px] text-cinza">
                O parcelamento inteiro fica com esta pessoa.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 pb-2">
          <Rotulo>pago com</Rotulo>
          {contasDest.length > 0 || cartoesDest.length > 0 ? (
            <select
              value={pagoCom}
              aria-label="Forma de pagamento"
              onChange={(e) => escolherOrigem(e.target.value)}
              className={SELECT}
            >
              {!pagoCom && <option value="">Dinheiro, Pix ou débito</option>}
              {contasDest.length > 0 && (
                <optgroup label="Contas">
                  {contasDest.map((c) => (
                    <option key={c.id} value={`conta:${c.id}`}>
                      {c.nome}{ROTULO_TIPO_CONTA[c.tipo] ? ` · ${ROTULO_TIPO_CONTA[c.tipo]}` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {cartoesDest.length > 0 && (
                <optgroup label="Cartões">
                  {cartoesDest.map((c) => (
                    <option key={c.id} value={`cartao:${c.id}`}>
                      {c.banco} · final {c.ultimos4}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          ) : (
            <p className="mt-1 text-[14px] text-grafite">{origemTexto}</p>
          )}
          {destSemOrigem && (
            <p className="mt-2 text-[12px] text-cinza">
              Cadastre uma conta ou cartão nesta carteira para transferir o lançamento.
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-nevoa bg-ar px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {confirmando ? (
          <div role="alertdialog" aria-labelledby="apagar-titulo" className="space-y-2">
            <p id="apagar-titulo" className="text-[14px] text-grafite">
              Apagar lançamento?
            </p>
            {grupo ? (
              <>
                <Botao
                  variante="destrutivo"
                  disabled={salvando}
                  onClick={() => void confirmarApagar(false)}
                >
                  Só esta parcela
                </Botao>
                <Botao
                  variante="destrutivo"
                  disabled={salvando}
                  onClick={() => void confirmarApagar(true)}
                >
                  Parcelamento inteiro
                </Botao>
                <Botao variante="secundario" onClick={() => setConfirmando(false)}>
                  Cancelar
                </Botao>
              </>
            ) : (
              <>
                <Botao
                  variante="destrutivo"
                  disabled={salvando}
                  onClick={() => void confirmarApagar(false)}
                >
                  Apagar
                </Botao>
                <Botao variante="secundario" onClick={() => setConfirmando(false)}>
                  Cancelar
                </Botao>
              </>
            )}
          </div>
        ) : (
          <Botao variante="primario" disabled={!pode} onClick={() => void salvar()}>
            Salvar
          </Botao>
        )}
        {teclado && valorLivre && !confirmando && (
          <Teclado
            aoDigitar={(d) => {
              entrada.digitar(d);
              tick((n) => n + 1);
            }}
            aoApagar={() => {
              entrada.apagar();
              tick((n) => n + 1);
            }}
            aoSalvar={salvar}
            aoFechar={() => setTeclado(false)}
            podeSalvar={pode}
            mostraSalvar
          />
        )}
      </div>
    </div>
  );
}
