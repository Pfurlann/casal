"use client";

import { useMemo, useState } from "react";
import { validarLiquidacao } from "@/lib/compromissos";
import { opcoesContaComReserva, parseOrigemPago } from "@/lib/metas";
import { formatarBRL } from "@/lib/money";
import { origensDoPagador } from "@/lib/visibilidade";
import { useLoja } from "@/lib/store";
import { Botao } from "../ui/Botao";
import { Folha } from "../ui/Folha";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";

export function ModalPagar({
  descricao,
  valor,
  contaID,
  cartaoID,
  somenteContas,
  aoFechar,
  aoConfirmar,
}: {
  descricao: string;
  valor: number;
  contaID?: string;
  cartaoID?: string;
  somenteContas?: boolean;
  aoFechar: () => void;
  aoConfirmar: (p: { contaID?: string; cartaoID?: string; metaID?: string }) => Promise<void>;
}) {
  const { contas, contasTodas, cartoes, cartoesTodos, carteira, metas, usuarioID } = useLoja();
  const contasPagador = useMemo(
    () => origensDoPagador(contasTodas ?? contas, carteira, usuarioID, usuarioID),
    [contasTodas, contas, carteira, usuarioID],
  );
  const cartoesPagador = useMemo(
    () => origensDoPagador(cartoesTodos ?? cartoes, carteira, usuarioID, usuarioID),
    [cartoesTodos, cartoes, carteira, usuarioID],
  );
  const opcoesConta = useMemo(
    () => opcoesContaComReserva(contasPagador, metas),
    [contasPagador, metas],
  );
  const inicial = somenteContas
    ? (contaID ? `conta:${contaID}` : "")
    : cartaoID
      ? `cartao:${cartaoID}`
      : contaID
        ? `conta:${contaID}`
        : "";
  const [pagoCom, setPagoCom] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const origem = parseOrigemPago(pagoCom);
  const erro = validarLiquidacao(origem);
  const pode = !erro && !salvando;

  async function confirmar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await aoConfirmar(origem);
      aoFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha aoFechar={aoFechar} rotulo="Marcar pago">
      <div className="px-4 pt-5 pb-4">
        <p className="text-[16px] font-semibold text-grafite">{descricao}</p>
        <p className="mt-1 text-[12px] text-cinza">O valor já está no lançamento.</p>
        <div className="mt-3">
          <Numero centavos={valor} tamanho="secao" />
        </div>
        <div className="mt-4">
          <Rotulo>pago com</Rotulo>
          <select
            value={pagoCom}
            aria-label="Forma de pagamento"
            onChange={(e) => setPagoCom(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
          >
            <option value="">{somenteContas ? "Escolha a conta" : "Escolha conta ou cartão"}</option>
            {opcoesConta.length > 0 && (
              <optgroup label="Contas">
                {opcoesConta.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </optgroup>
            )}
            {!somenteContas && cartoesPagador.length > 0 && (
              <optgroup label="Cartões">
                {cartoesPagador.map((c) => (
                  <option key={c.id} value={`cartao:${c.id}`}>
                    {c.banco} · final {c.ultimos4}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="mt-2 text-[12px] text-cinza">
            Contas e cartões com visibilidade pessoal, conjunta ou ambas.
          </p>
        </div>
        <div className="mt-6 space-y-2">
          <Botao variante="primario" onClick={() => void confirmar()} disabled={!pode}>
            Marcar pago {formatarBRL(valor)}
          </Botao>
          <Botao variante="secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
        </div>
      </div>
    </Folha>
  );
}
