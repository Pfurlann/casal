"use client";

import Link from "next/link";
import { CATEGORIAS } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { IconeCategoria } from "../Icones";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";
import { Vazio } from "../ui/Vazio";

export function Categorias() {
  const { categorias, carteira } = useLoja();
  const custom = categorias ?? [];
  const padraoDespesa = CATEGORIAS.filter((c) => c.tipo === "despesa");
  const padraoReceita = CATEGORIAS.filter((c) => c.tipo === "receita");
  const customDespesa = custom.filter((c) => c.tipo === "despesa");
  const customReceita = custom.filter((c) => c.tipo === "receita");

  return (
    <div>
      <Cabecalho
        titulo="categorias"
        voltarPara="/mais"
        acao={
          <Link
            href="/mais/categorias/nova"
            aria-label="Adicionar categoria"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <p className="text-[12px] text-cinza">
          Padrão do app e as suas em {carteira.nome}. Só as suas podem ser apagadas.
        </p>

        <div className="mt-6">
          <Rotulo>suas · gasto</Rotulo>
          {customDespesa.length === 0 ? (
            <Vazio
              frase="Nenhuma categoria de gasto nesta carteira."
              acao={
                <Link
                  href="/mais/categorias/nova"
                  className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
                >
                  Criar categoria
                </Link>
              }
            />
          ) : (
            <div className="mt-2">
              {customDespesa.map((c) => (
                <LinhaLista
                  key={c.id}
                  icone={<IconeCategoria nome={c.icone} size={16} />}
                  titulo={c.nome}
                  subtitulo="gasto · sua"
                  href={`/mais/categorias/${c.id}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Rotulo>suas · receita</Rotulo>
          {customReceita.length === 0 ? (
            <p className="mt-2 text-[14px] text-cinza">Nenhuma categoria de receita nesta carteira.</p>
          ) : (
            <div className="mt-2">
              {customReceita.map((c) => (
                <LinhaLista
                  key={c.id}
                  icone={<IconeCategoria nome={c.icone} size={16} />}
                  titulo={c.nome}
                  subtitulo="receita · sua"
                  href={`/mais/categorias/${c.id}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Rotulo>padrão · gasto</Rotulo>
          <div className="mt-2">
            {padraoDespesa.map((c) => (
              <LinhaLista
                key={c.id}
                icone={<IconeCategoria nome={c.icone} size={16} />}
                titulo={c.nome}
                subtitulo="do sistema"
              />
            ))}
          </div>
        </div>

        <div className="mt-8 pb-8">
          <Rotulo>padrão · receita</Rotulo>
          <div className="mt-2">
            {padraoReceita.map((c) => (
              <LinhaLista
                key={c.id}
                icone={<IconeCategoria nome={c.icone} size={16} />}
                titulo={c.nome}
                subtitulo="do sistema"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
