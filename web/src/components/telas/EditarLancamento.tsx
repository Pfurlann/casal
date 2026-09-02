"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIAS } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { ehGrupoParcela } from "@/lib/transacoes";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { Botao } from "../ui/Botao";
import { useAviso } from "../ui/Aviso";
import { IconeCategoria } from "../Icones";

const DESPESAS = CATEGORIAS.filter((c) => c.tipo === "despesa");

export function EditarLancamento({ id }: { id: string }) {
  const loja = useLoja();
  const { transacoes, cartoes, editar, apagar } = loja;
  const contas = loja.contas ?? [];
  const { avisar } = useAviso();
  const router = useRouter();
  const tx = transacoes.find((t) => t.id === id);

  const [entrada] = useState(() => EntradaValor.deCentavos(tx?.valor ?? 0));
  const [, tick] = useState(0);
  const [categoriaID, setCategoriaID] = useState(tx?.categoriaID ?? DESPESAS[0].id);
  const [descricao, setDescricao] = useState(tx?.descricao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [teclado, setTeclado] = useState(false);

  const voltar = () => {
    if (window.history.length > 1) router.back();
    else router.push("/mes");
  };

  if (!tx) {
    return (
      <div>
        <Cabecalho titulo="editar lançamento" voltarPara="/mes" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este lançamento não existe mais.</p>
      </div>
    );
  }

  const grupo = ehGrupoParcela(tx);
  const valorLivre = tx.parcelaTotal === 1;
  const cartao = cartoes.find((c) => c.id === tx.cartaoID);
  const conta = contas.find((c) => c.id === tx.contaID);
  const origem = cartao
    ? `${cartao.banco} · final ${cartao.ultimos4}`
    : conta
      ? conta.nome
      : "Dinheiro, Pix ou débito";
  const pode = (!valorLivre || entrada.podeSalvar) && !salvando;

  const salvar = async () => {
    if (!pode) return;
    setSalvando(true);
    try {
      await editar({
        id: tx.id,
        descricao,
        categoriaID,
        valor: valorLivre ? entrada.centavos : undefined,
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
          voltarPara="/mes"
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
          <Rotulo>categoria</Rotulo>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {DESPESAS.map((c) => (
              <Etiqueta
                key={c.id}
                ativa={categoriaID === c.id}
                aoClicar={() => setCategoriaID(c.id)}
                className="shrink-0"
              >
                <IconeCategoria nome={c.icone} size={14} />
                {c.nome}
              </Etiqueta>
            ))}
          </div>
        </div>

        <div className="mt-4 pb-2">
          <Rotulo>pago com</Rotulo>
          <p className="mt-1 text-[14px] text-grafite">{origem}</p>
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
