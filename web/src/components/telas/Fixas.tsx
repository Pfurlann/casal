"use client";

import Link from "next/link";
import { competenciaDe, ROTULO_TIPO_CONTA } from "@/lib/domain";
import { categoriaPorId } from "@/lib/categorias";
import { vencimentosDoMes } from "@/lib/despesas-fixas";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Vazio } from "../ui/Vazio";

export function Fixas() {
  const {
    despesasFixas,
    transacoes,
    contas,
    cartoes,
    carteira,
    categorias,
    lancarDespesaFixa,
  } = useLoja();
  const { avisar } = useAviso();
  const competencia = competenciaDe(new Date());
  const vencimentos = vencimentosDoMes(despesasFixas ?? [], transacoes, competencia);
  const pendentes = vencimentos.filter((v) => !v.lancada).length;

  async function lancar(id: string) {
    try {
      await lancarDespesaFixa(id, competencia);
    } catch {
      avisar("erro", "Não deu para lançar este fixo. Tente de novo.");
    }
  }

  function origem(fixa: (typeof vencimentos)[number]["fixa"]) {
    if (fixa.tipo === "receita") {
      const conta = contas.find((c) => c.id === fixa.contaID);
      return conta ? `${conta.nome} · ${ROTULO_TIPO_CONTA[conta.tipo]}` : "conta";
    }
    if (fixa.cartaoID) {
      const cartao = cartoes.find((c) => c.id === fixa.cartaoID);
      return cartao ? `${cartao.banco} · final ${cartao.ultimos4}` : "cartão";
    }
    const conta = contas.find((c) => c.id === fixa.contaID);
    return conta ? `${conta.nome} · ${ROTULO_TIPO_CONTA[conta.tipo]}` : "conta";
  }

  return (
    <div>
      <Cabecalho
        titulo="fixos"
        voltarPara="/mais"
        acao={
          <Link
            href="/mais/fixas/nova"
            aria-label="Adicionar fixo"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <p className="text-[12px] text-cinza">
          Gastos e receitas de {carteira.nome} que se repetem ou já estão projetados. Lançar o
          mês não apaga o cadastro.
        </p>
        {vencimentos.length === 0 ? (
          <Vazio
            frase="Nenhum fixo nesta carteira."
            acao={
              <Link
                href="/mais/fixas/nova"
                className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
              >
                Cadastrar fixo
              </Link>
            }
          />
        ) : (
          <>
            <div className="mt-6">
              <Rotulo>neste mês</Rotulo>
              <p className="mt-1 text-[12px] text-cinza">
                {pendentes === 0
                  ? "Todos já viraram lançamento neste mês."
                  : `${pendentes} ainda sem lançamento`}
              </p>
              <div className="mt-2">
                {vencimentos.map((v) => {
                  const cat = categoriaPorId(v.fixa.categoriaID, categorias);
                  const receita = v.fixa.tipo === "receita";
                  return (
                    <div
                      key={v.fixa.id}
                      className="flex min-h-[44px] items-center gap-3 border-b border-nevoa py-3"
                    >
                      <Link
                        href={`/mais/fixas/${v.fixa.id}`}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-[14px] text-grafite">{v.fixa.nome}</span>
                        <span className="block truncate text-[12px] text-cinza">
                          {receita ? "receita" : "gasto"} · vence dia {Number(v.venceEm.slice(-2))}
                          {cat ? ` · ${cat.nome}` : ""}
                        </span>
                      </Link>
                      <Numero centavos={v.fixa.valor} tamanho="corpo" />
                      {v.lancada ? (
                        <span className="shrink-0 text-[12px] text-cinza">lançada</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void lancar(v.fixa.id)}
                          className="shrink-0 text-[14px] font-semibold text-grafite"
                        >
                          Lançar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-8">
              <Rotulo>cadastro</Rotulo>
              <div className="mt-2">
                {vencimentos.map((v) => (
                  <LinhaLista
                    key={v.fixa.id}
                    titulo={v.fixa.nome}
                    subtitulo={`${v.fixa.tipo === "receita" ? "receita" : "gasto"} · todo dia ${v.fixa.diaVencimento} · ${origem(v.fixa)}`}
                    valor={v.fixa.valor}
                    href={`/mais/fixas/${v.fixa.id}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
