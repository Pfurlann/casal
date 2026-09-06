"use client";

import { useAuth } from "@/lib/auth";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { EscolhaTema } from "../ui/EscolhaTema";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";
import { Botao } from "../ui/Botao";

export function Mais() {
  const { contas, carteira, remoto, despesasFixas, categorias, compromissos } = useLoja();
  const { usuario, sair } = useAuth();
  return (
    <div>
      <Cabecalho titulo="mais" />
      <div className="px-4 pt-6 lg:mx-auto lg:max-w-[920px] lg:px-0">
        {usuario?.email && (
          <div>
            <Rotulo>conta</Rotulo>
            <p className="mt-1 text-[14px] text-grafite">{usuario.email}</p>
            <div className="mt-3">
              <Botao variante="secundario" onClick={() => void sair()}>
                Sair
              </Botao>
            </div>
          </div>
        )}
        <div className="mt-8">
          <EscolhaTema />
        </div>
        <div className="mt-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
          <div>
            <Rotulo>cadastros</Rotulo>
            <div className="mt-2">
              <LinhaLista
                titulo="Carteiras"
                subtitulo={`pessoal e conjunta · ${carteira.nome}`}
                href="/mais/carteiras"
              />
              <LinhaLista
                titulo="Contas"
                subtitulo={
                  contas.length
                    ? `corrente, poupança e dinheiro · ${contas.length}`
                    : "corrente, poupança e dinheiro"
                }
                href="/mais/contas"
              />
              <LinhaLista
                titulo="Categorias"
                subtitulo={
                  categorias?.length
                    ? `padrão e as suas · ${categorias.length} em ${carteira.nome}`
                    : `padrão e as suas · ${carteira.nome}`
                }
                href="/mais/categorias"
              />
            </div>
          </div>
          <div className="mt-8 lg:mt-0">
            <Rotulo>rotinas</Rotulo>
            <div className="mt-2">
              <LinhaLista
                titulo="Fixos"
                subtitulo={
                  despesasFixas?.length
                    ? `aluguel, salário · ${despesasFixas.length} em ${carteira.nome}`
                    : `aluguel, salário, assinaturas · ${carteira.nome}`
                }
                href="/mais/fixas"
              />
              <LinhaLista
                titulo="Compromissos"
                subtitulo={
                  compromissos?.filter((c) => c.status === "a_pagar").length
                    ? `a pagar · ${compromissos.filter((c) => c.status === "a_pagar").length} em ${carteira.nome}`
                    : `luz, boleto, prestamista · ${carteira.nome}`
                }
                href="/mais/compromissos"
              />
            </div>
          </div>
        </div>
        <p className="mt-8 text-[12px] text-cinza">
          {remoto
            ? "Dados neste dispositivo e no Supabase."
            : "Dados só neste aparelho — configure o Supabase para sincronizar."}
        </p>
      </div>
    </div>
  );
}
