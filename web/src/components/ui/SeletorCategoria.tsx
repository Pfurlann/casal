"use client";

import { useState } from "react";
import {
  COR_CATEGORIA_CUSTOM,
  ICONES_CATEGORIA,
  categoriasVisiveis,
  validarCategoria,
} from "@/lib/categorias";
import type { Categoria } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { IconeCategoria } from "../Icones";
import { useAviso } from "./Aviso";
import { Botao } from "./Botao";
import { Campo } from "./Campo";
import { Etiqueta } from "./Etiqueta";
import { Folha } from "./Folha";
import { Rotulo } from "./Rotulo";

function FolhaNovaCategoria({
  tipo,
  aoFechar,
  aoCriar,
}: {
  tipo: "despesa" | "receita";
  aoFechar: () => void;
  aoCriar: (c: Categoria) => Promise<void>;
}) {
  const { carteira } = useLoja();
  const { avisar } = useAviso();
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState(tipo === "receita" ? "salario" : "outros");
  const [salvando, setSalvando] = useState(false);
  const erro = validarCategoria({ nome, icone, tipo });
  const pode = !erro && !salvando;

  async function criar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await aoCriar({
        id: crypto.randomUUID(),
        nome: nome.trim(),
        icone,
        cor: COR_CATEGORIA_CUSTOM,
        tipo,
        carteiraID: carteira.id,
      });
    } catch {
      avisar("erro", "Não deu para criar a categoria. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha aoFechar={aoFechar} rotulo="Nova categoria">
      <div className="px-4 pb-6 pt-4">
        <p className="text-[12px] text-cinza">
          {tipo === "receita" ? "receita" : "gasto"} · em {carteira.nome}
        </p>
        <Campo label="Nome" value={nome} onChange={setNome} placeholder="Pet, mesada, academia…" />
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
        <div className="mt-6">
          <Botao variante="primario" onClick={() => void criar()} disabled={!pode}>
            Criar categoria
          </Botao>
        </div>
      </div>
    </Folha>
  );
}

export function SeletorCategoria({
  tipo,
  custom,
  valor,
  onChange,
}: {
  tipo: "despesa" | "receita";
  custom?: Categoria[];
  valor: string;
  onChange: (id: string) => void;
}) {
  const { salvarCategoria } = useLoja();
  const [criadas, setCriadas] = useState<Categoria[]>([]);
  const [aberto, setAberto] = useState(false);
  const lista = categoriasVisiveis([...(custom ?? []), ...criadas], tipo);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex gap-2 pb-1" role="group" aria-label="Categorias">
            {lista.map((c) => (
              <Etiqueta
                key={c.id}
                ativa={valor === c.id}
                aoClicar={() => onChange(c.id)}
                className="shrink-0"
              >
                <IconeCategoria nome={c.icone} size={14} />
                {c.nome}
              </Etiqueta>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Nova categoria"
          onClick={() => setAberto(true)}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-etiqueta border border-nevoa text-[20px] text-grafite"
        >
          +
        </button>
      </div>
      {aberto && (
        <FolhaNovaCategoria
          tipo={tipo}
          aoFechar={() => setAberto(false)}
          aoCriar={async (cat) => {
            await salvarCategoria(cat);
            setCriadas((xs) => [...xs, cat]);
            onChange(cat.id);
            setAberto(false);
          }}
        />
      )}
    </>
  );
}
