"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Competencia } from "@/lib/domain";
import { ROTULO_TIPO_CONTA } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import {
  faturaDaCompetencia,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { useAviso } from "../ui/Aviso";

export function PagarFatura({
  cartaoId,
  competencia,
}: {
  cartaoId: string;
  competencia: Competencia;
}) {
  const { cartoes, contas, faturas, transacoes, pagarFatura } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const cartao = cartoes.find((c) => c.id === cartaoId);
  const fatura = cartao ? faturaDaCompetencia(cartao, faturas, competencia) : null;
  const total = cartao && fatura ? totalDaFatura(fatura, transacoes, cartao) : 0;
  const saldo = fatura ? saldoDevedor(fatura, total) : 0;
  const [contaID, setContaID] = useState(contas[0]?.id ?? "");
  const [entrada] = useState(() => EntradaValor.deCentavos(saldo));
  const [, tick] = useState(0);
  const [pagando, setPagando] = useState(false);

  if (!cartao || !fatura) {
    return (
      <div>
        <Cabecalho titulo="pagar fatura" voltarPara="/cartoes" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este cartão não existe mais.</p>
      </div>
    );
  }

  const voltar = () => router.push(`/cartoes/${cartao.id}`);
  const pode = entrada.podeSalvar && contaID.length > 0 && !pagando;

  async function pagar() {
    if (!pode) return;
    setPagando(true);
    try {
      await pagarFatura({ cartao: cartao!, fatura: fatura!, valor: entrada.centavos, contaID });
      voltar();
    } catch {
      avisar("erro", "Não deu para registrar o pagamento. Tente de novo.");
    } finally {
      setPagando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho titulo="pagar fatura" voltarPara={`/cartoes/${cartao.id}`} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6">
        <Rotulo>saldo devedor</Rotulo>
        <div className="mt-2">
          <Numero centavos={saldo} tamanho="secao" />
        </div>
        <div className="mt-8 text-center">
          <Numero centavos={entrada.centavos} tamanho="heroi" subordinaCentavos />
        </div>

        {contas.length === 0 ? (
          <div className="mt-8">
            <p className="text-[14px] text-cinza">
              Cadastre uma conta para escolher de onde sai o pagamento.
            </p>
            <Link
              href="/mais/contas/novo"
              className="mt-3 flex min-h-[44px] items-center text-[14px] font-semibold text-grafite"
            >
              Cadastrar conta
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <Rotulo>sai de</Rotulo>
            <select
              value={contaID}
              onChange={(e) => setContaID(e.target.value)}
              aria-label="Conta de saída"
              className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
            >
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} · {ROTULO_TIPO_CONTA[c.tipo]}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="mt-6 text-[12px] text-cinza">
          O pagamento entra como transferência, não como gasto novo — a compra já foi
          contada quando aconteceu.
        </p>
      </div>
      <Teclado
        aoDigitar={(d) => {
          entrada.digitar(d);
          tick((n) => n + 1);
        }}
        aoApagar={() => {
          entrada.apagar();
          tick((n) => n + 1);
        }}
        aoSalvar={pagar}
        aoFechar={voltar}
        podeSalvar={pode}
        mostraSalvar
      />
    </div>
  );
}
