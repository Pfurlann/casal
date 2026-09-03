"use client";

import { useAuth } from "@/lib/auth";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { EscolhaTema } from "../ui/EscolhaTema";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";
import { Botao } from "../ui/Botao";

export function Mais() {
  const { contas, carteira, remoto, despesasFixas, categorias } = useLoja();
  const { usuario, sair } = useAuth();
  return (
    <div>
      <Cabecalho titulo="mais" />
      <div className="px-4 pt-6">
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
        <div className="mt-8">
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
          <LinhaLista
            titulo="Fixos"
            subtitulo={
              despesasFixas?.length
                ? `aluguel, salário · ${despesasFixas.length} em ${carteira.nome}`
                : `aluguel, salário, assinaturas · ${carteira.nome}`
            }
            href="/mais/fixas"
          />
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
