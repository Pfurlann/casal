"use client";

import Link from "next/link";
import { categoriaPorId } from "@/lib/categorias";
import { compromissosAPagar } from "@/lib/compromissos";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";
import { Vazio } from "../ui/Vazio";

function rotuloVence(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function Compromissos() {
  const { compromissos, categorias, carteira } = useLoja();
  const lista = compromissos ?? [];
  const aPagar = compromissosAPagar(lista);
  const liquidados = lista
    .filter((c) => c.status === "liquidado")
    .sort((a, b) => b.venceEm.localeCompare(a.venceEm));

  return (
    <div>
      <Cabecalho
        titulo="compromissos"
        voltarPara="/mais"
        acao={
          <Link
            href="/mais/compromissos/novo"
            aria-label="Adicionar compromisso"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <p className="text-[12px] text-cinza">
          Conta a pagar de {carteira.nome} — luz, boleto, prestamista. Já nasce o lançamento.
          Liquidar é só escolher com o que pagar. Fixos continuam sendo o que se repete.
        </p>
        {lista.length === 0 ? (
          <Vazio
            frase="Nenhum compromisso nesta carteira."
            acao={
              <Link
                href="/mais/compromissos/novo"
                className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
              >
                Cadastrar compromisso
              </Link>
            }
          />
        ) : (
          <>
            <div className="mt-6">
              <Rotulo>a pagar</Rotulo>
              <div className="mt-2">
                {aPagar.length === 0 ? (
                  <p className="py-3 text-[14px] text-cinza">Nada em aberto.</p>
                ) : (
                  aPagar.map((c) => {
                    const cat = categoriaPorId(c.categoriaID, categorias);
                    return (
                      <LinhaLista
                        key={c.id}
                        titulo={c.nome}
                        subtitulo={`vence ${rotuloVence(c.venceEm)}${cat ? ` · ${cat.nome}` : ""}`}
                        valor={c.valor}
                        tom="atencao"
                        href={`/mais/compromissos/${c.id}`}
                      />
                    );
                  })
                )}
              </div>
            </div>
            {liquidados.length > 0 && (
              <div className="mt-8">
                <Rotulo>liquidados</Rotulo>
                <div className="mt-2">
                  {liquidados.map((c) => {
                    const cat = categoriaPorId(c.categoriaID, categorias);
                    return (
                      <LinhaLista
                        key={c.id}
                        titulo={c.nome}
                        subtitulo={`pago · ${rotuloVence(c.venceEm)}${cat ? ` · ${cat.nome}` : ""}`}
                        valor={c.valor}
                        href={`/mais/compromissos/${c.id}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
