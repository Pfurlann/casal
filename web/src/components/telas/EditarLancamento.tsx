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
  const { transacoes, cartoes, editar, apagar } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const tx = transacoes.find((t) => t.id === id);

  const [entrada] = useState(() => EntradaValor.deCentavos(tx?.valor ?? 0));
  const [, tick] = useState(0);
  const [categoriaID, setCategoriaID] = useState(tx?.categoriaID ?? DESPESAS[0].id);
  const [descricao, setDescricao] = useState(tx?.descricao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

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
    <div className="flex h-full min-h-0 flex-col">
      <Cabecalho titulo="editar lançamento" voltarPara="/mes" />
      <div
        className="px-4 pt-6 text-center"
        role="status"
        aria-live="polite"
        aria-label="Valor do gasto"
      >
        <Numero
          centavos={valorLivre ? entrada.centavos : tx.valor}
          tamanho="heroi"
          subordinaCentavos
        />
      </div>
      {grupo && (
        <p className="px-4 pt-2 text-center text-[12px] text-cinza">
          Parcela {tx.parcelaN} de {tx.parcelaTotal}. O valor das parcelas não muda uma a uma.
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2 px-4">
        {DESPESAS.map((c) => (
          <Etiqueta
            key={c.id}
            ativa={categoriaID === c.id}
            aoClicar={() => setCategoriaID(c.id)}
          >
            <IconeCategoria nome={c.icone} size={14} />
            {c.nome}
          </Etiqueta>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <Campo label="Onde foi o gasto" value={descricao} onChange={setDescricao} />
        {cartao && (
          <div className="mt-4">
            <Rotulo>pago com</Rotulo>
            <p className="mt-1 text-[14px] text-grafite">
              {cartao.banco} · final {cartao.ultimos4}
            </p>
          </div>
        )}
        {confirmando ? (
          <div
            role="alertdialog"
            aria-labelledby="apagar-titulo"
            className="mt-6 space-y-2"
          >
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
          <div className="mt-6">
            <Botao variante="destrutivo" onClick={() => setConfirmando(true)}>
              Apagar lançamento
            </Botao>
          </div>
        )}
      </div>
      {valorLivre ? (
        <div className="mt-auto">
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
            aoFechar={voltar}
            podeSalvar={pode}
            mostraSalvar
          />
        </div>
      ) : (
        <div className="mt-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Botao variante="primario" disabled={!pode} onClick={() => void salvar()}>
            Salvar
          </Botao>
        </div>
      )}
    </div>
  );
}
