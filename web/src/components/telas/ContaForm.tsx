"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CORES_CARTAO, ROTULO_TIPO_CONTA, type Conta, type TipoConta, type VisibilidadeOrigem } from "@/lib/domain";
import { COR_ORIGEM_PADRAO } from "@/lib/origem";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { eDonoDaOrigem, visibilidadePadraoDaCarteira } from "@/lib/visibilidade";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { SeletorCor } from "../ui/SeletorCor";
import { SeletorVisibilidade } from "../ui/SeletorVisibilidade";
import { Teclado } from "../ui/Teclado";

const TIPOS: TipoConta[] = ["corrente", "poupanca", "dinheiro"];

export function ContaForm({ id }: { id?: string }) {
  const { contas, contasTodas, carteira, salvarConta, apagarConta, usuarioID } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = (contasTodas ?? contas).find((c) => c.id === id);
  const podeApagar = Boolean(existente && eDonoDaOrigem(existente, usuarioID));

  const [nome, setNome] = useState(existente?.nome ?? "");
  const [tipo, setTipo] = useState<TipoConta>(existente?.tipo ?? "corrente");
  const [cor, setCor] = useState(existente?.cor ?? CORES_CARTAO[0] ?? COR_ORIGEM_PADRAO);
  const [visibilidade, setVisibilidade] = useState<VisibilidadeOrigem>(
    existente?.visibilidade ?? visibilidadePadraoDaCarteira(carteira),
  );
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.saldoInicial ?? 0));
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const pode = nome.trim().length > 0 && !salvando;
  const voltar = () => router.push("/mais/contas");

  function montar(): Conta {
    return {
      id: existente?.id ?? crypto.randomUUID(),
      carteiraID: existente?.carteiraID ?? carteira.id,
      nome: nome.trim() || existente?.nome || "",
      tipo,
      saldoInicial: entrada.centavos,
      arquivada: false,
      donoID: existente?.donoID ?? usuarioID,
      visibilidade,
      cor,
    };
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarConta(montar());
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar a conta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!existente || !podeApagar) return;
    setSalvando(true);
    try {
      await apagarConta(existente.id);
      voltar();
    } catch {
      avisar("erro", "Não deu para apagar a conta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo={existente ? "editar conta" : "nova conta"}
        voltarPara="/mais/contas"
        acao={
          podeApagar && !confirmando ? (
            <button
              type="button"
              aria-label="Apagar conta"
              onClick={() => setConfirmando(true)}
              className="flex min-h-[44px] items-center text-[14px] font-semibold text-ambar-texto"
            >
              Apagar
            </button>
          ) : undefined
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder="Nubank, Itaú, Carteira…"
        />

        <div className="mt-4">
          <Rotulo>tipo</Rotulo>
          <div className="mt-2 flex gap-2">
            {TIPOS.map((t) => (
              <Etiqueta key={t} ativa={tipo === t} aoClicar={() => setTipo(t)}>
                {ROTULO_TIPO_CONTA[t]}
              </Etiqueta>
            ))}
          </div>
        </div>

        <SeletorCor valor={cor} onChange={setCor} />

        <SeletorVisibilidade valor={visibilidade} onChange={setVisibilidade} />

        <div className="mt-6">
          <Rotulo>saldo inicial</Rotulo>
          <div className="mt-2 flex gap-2">
            <Etiqueta
              ativa={!entrada.negativo}
              aoClicar={() => {
                if (entrada.negativo) entrada.alternarSinal();
                tick((n) => n + 1);
              }}
            >
              Crédito
            </Etiqueta>
            <Etiqueta
              ativa={entrada.negativo}
              aoClicar={() => {
                if (!entrada.negativo) entrada.alternarSinal();
                tick((n) => n + 1);
              }}
            >
              Estou devendo
            </Etiqueta>
          </div>
          <div
            className="mt-2"
            role="status"
            aria-live="polite"
            aria-label="Saldo inicial"
          >
            <Numero centavos={entrada.centavos} tamanho="secao" />
          </div>
        </div>

        {existente && (
          <div className="mt-8">
            <Link
              href={`/mais/contas/${existente.id}/importar-ofx`}
              className="flex min-h-[44px] items-center justify-center rounded-controle border border-nevoa font-texto text-[14px] font-semibold text-grafite"
            >
              Importar OFX
            </Link>
          </div>
        )}
      </div>
      {confirmando ? (
        <div className="border-t border-nevoa px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div role="alertdialog" aria-labelledby="apagar-conta-titulo" className="space-y-2">
            <p id="apagar-conta-titulo" className="text-[14px] text-grafite">
              Apagar conta? Lançamentos antigos ficam.
            </p>
            <Botao variante="destrutivo" disabled={salvando} onClick={() => void apagar()}>
              {salvando ? "Apagando…" : "Apagar"}
            </Botao>
            <Botao variante="secundario" onClick={() => setConfirmando(false)} disabled={salvando}>
              Cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <Teclado
          aoDigitar={(d) => {
            entrada.digitar(d);
            tick((n) => n + 1);
          }}
          aoApagar={() => {
            entrada.apagar();
            tick((n) => n + 1);
          }}
          aoAlternarSinal={() => {
            entrada.alternarSinal();
            tick((n) => n + 1);
          }}
          aoSalvar={salvar}
          aoFechar={voltar}
          podeSalvar={pode}
          mostraSalvar
        />
      )}
    </div>
  );
}
