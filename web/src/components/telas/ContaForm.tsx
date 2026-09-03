"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CORES_CARTAO, ROTULO_TIPO_CONTA, type Conta, type TipoConta, type VisibilidadeOrigem } from "@/lib/domain";
import { COR_ORIGEM_PADRAO } from "@/lib/origem";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { visibilidadePadraoDaCarteira } from "@/lib/visibilidade";
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
  const { contas, contasTodas, carteira, salvarConta, usuarioID } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = (contasTodas ?? contas).find((c) => c.id === id);

  const [nome, setNome] = useState(existente?.nome ?? "");
  const [tipo, setTipo] = useState<TipoConta>(existente?.tipo ?? "corrente");
  const [cor, setCor] = useState(existente?.cor ?? CORES_CARTAO[0] ?? COR_ORIGEM_PADRAO);
  const [visibilidade, setVisibilidade] = useState<VisibilidadeOrigem>(
    existente?.visibilidade ?? visibilidadePadraoDaCarteira(carteira),
  );
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.saldoInicial ?? 0));
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const pode = nome.trim().length > 0 && !salvando;
  const voltar = () => router.push("/mais/contas");

  function montar(arquivada: boolean): Conta {
    return {
      id: existente?.id ?? crypto.randomUUID(),
      carteiraID: existente?.carteiraID ?? carteira.id,
      nome: nome.trim() || existente?.nome || "",
      tipo,
      saldoInicial: entrada.centavos,
      arquivada,
      donoID: existente?.donoID ?? usuarioID,
      visibilidade,
      cor,
    };
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarConta(montar(false));
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar a conta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!existente) return;
    setSalvando(true);
    try {
      await salvarConta(montar(true));
      voltar();
    } catch {
      avisar("erro", "Não deu para arquivar a conta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo={existente ? "editar conta" : "nova conta"}
        voltarPara="/mais/contas"
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
            <Botao variante="destrutivo" onClick={arquivar} disabled={salvando}>
              Arquivar conta
            </Botao>
          </div>
        )}
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
        aoAlternarSinal={() => {
          entrada.alternarSinal();
          tick((n) => n + 1);
        }}
        aoSalvar={salvar}
        aoFechar={voltar}
        podeSalvar={pode}
        mostraSalvar
      />
    </div>
  );
}
