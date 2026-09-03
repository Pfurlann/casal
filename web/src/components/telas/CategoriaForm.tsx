"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { COR_CATEGORIA_CUSTOM, ICONES_CATEGORIA, eCategoriaSistema, validarCategoria } from "@/lib/categorias";
import type { Categoria } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { IconeCategoria } from "../Icones";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Rotulo } from "../ui/Rotulo";

export function CategoriaForm({ id }: { id?: string }) {
  const { categorias, carteira, salvarCategoria, apagarCategoria } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = (categorias ?? []).find((c) => c.id === id);

  const [nome, setNome] = useState(existente?.nome ?? "");
  const [tipo, setTipo] = useState<"despesa" | "receita">(existente?.tipo ?? "despesa");
  const [icone, setIcone] = useState(existente?.icone ?? "outros");
  const [salvando, setSalvando] = useState(false);

  const erro = validarCategoria({ nome, icone, tipo });
  const pode = !erro && !salvando;
  const voltar = () => router.push("/mais/categorias");

  if (id && !existente) {
    return (
      <div>
        <Cabecalho titulo="editar categoria" voltarPara="/mais/categorias" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Esta categoria não existe mais.</p>
      </div>
    );
  }

  if (existente && eCategoriaSistema(existente.id)) {
    return (
      <div>
        <Cabecalho titulo="categoria" voltarPara="/mais/categorias" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Categorias padrão do sistema não se editam.</p>
      </div>
    );
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      const cat: Categoria = {
        id: existente?.id ?? crypto.randomUUID(),
        nome: nome.trim(),
        icone,
        cor: COR_CATEGORIA_CUSTOM,
        tipo,
        carteiraID: carteira.id,
      };
      await salvarCategoria(cat);
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar a categoria. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!existente) return;
    setSalvando(true);
    try {
      await apagarCategoria(existente.id);
      voltar();
    } catch {
      avisar("erro", "Não deu para apagar a categoria. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo={existente ? "editar categoria" : "nova categoria"}
        voltarPara="/mais/categorias"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <p className="pt-2 text-[12px] text-cinza">em {carteira.nome}</p>
        <Campo label="Nome" value={nome} onChange={setNome} placeholder="Pet, mesada, academia…" />

        <div className="mt-4">
          <Rotulo>tipo</Rotulo>
          <div className="mt-2 flex gap-2" role="group" aria-label="Tipo da categoria">
            <Etiqueta ativa={tipo === "despesa"} aoClicar={() => setTipo("despesa")}>
              Gasto
            </Etiqueta>
            <Etiqueta ativa={tipo === "receita"} aoClicar={() => setTipo("receita")}>
              Receita
            </Etiqueta>
          </div>
        </div>

        <div className="mt-4">
          <Rotulo>ícone</Rotulo>
          <div className="mt-2 flex flex-wrap gap-2">
            {ICONES_CATEGORIA.map((nomeIcone) => (
              <Etiqueta
                key={nomeIcone}
                ativa={icone === nomeIcone}
                aoClicar={() => setIcone(nomeIcone)}
              >
                <IconeCategoria nome={nomeIcone} size={16} />
                <span className="sr-only">{nomeIcone}</span>
              </Etiqueta>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Botao variante="primario" onClick={() => void salvar()} disabled={!pode}>
            Salvar
          </Botao>
        </div>

        {existente && (
          <div className="mt-4">
            <Botao variante="destrutivo" onClick={() => void apagar()} disabled={salvando}>
              Apagar categoria
            </Botao>
          </div>
        )}
      </div>
    </div>
  );
}
