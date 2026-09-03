"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import type { Meta, TipoMeta } from "@/lib/domain";
import { validarMeta } from "@/lib/metas";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { IconeCategoria } from "../Icones";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";

export function MetaForm({ id }: { id?: string }) {
  const { metas, categorias, carteira, salvarMeta, apagarMeta } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = (metas ?? []).find((m) => m.id === id);
  const tipoInicial: TipoMeta = existente?.tipo === "economia_mensal" ? "economia_mensal" : "teto_categoria";
  const cats = categoriasVisiveis(categorias, "despesa");

  const [tipo, setTipo] = useState<TipoMeta>(tipoInicial);
  const [nome, setNome] = useState(existente?.nome ?? "");
  const [categoriaID, setCategoriaID] = useState(existente?.categoriaID ?? cats[0]?.id ?? "");
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.valorAlvo ?? 0));
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const ehTeto = tipo === "teto_categoria";
  const erro = validarMeta({
    tipo,
    nome,
    valorAlvo: entrada.centavos,
    categoriaID: ehTeto ? categoriaID : undefined,
    outras: metas ?? [],
    id: existente?.id,
  });
  const pode = !erro && !salvando;
  const voltar = () => router.push("/metas");
  const titulo = existente
    ? ehTeto
      ? "editar teto"
      : "editar economia"
    : ehTeto
      ? "novo teto"
      : "nova economia";

  function escolherTipo(proximo: TipoMeta) {
    if (proximo === tipo) return;
    switch (proximo) {
      case "teto_categoria":
      case "economia_mensal":
        setTipo(proximo);
        return;
      case "objetivo":
        return;
      default: {
        const _nunca: never = proximo;
        throw new Error(`tipo não tratado: ${_nunca}`);
      }
    }
  }

  function montar(): Meta {
    const cat = cats.find((c) => c.id === categoriaID);
    const nomeTeto = nome.trim() || cat?.nome || "Teto";
    const nomeEco = nome.trim() || "Economia do mês";
    return {
      id: existente?.id ?? crypto.randomUUID(),
      carteiraID: carteira.id,
      tipo,
      nome: ehTeto ? nomeTeto : nomeEco,
      valorAlvo: entrada.centavos,
      categoriaID: ehTeto ? categoriaID : undefined,
      periodo: "mensal",
      ativa: true,
    };
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarMeta(montar());
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar a meta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!existente) return;
    setSalvando(true);
    try {
      await apagarMeta(existente.id);
      voltar();
    } catch {
      avisar("erro", "Não deu para apagar a meta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (id && !existente) {
    return (
      <div>
        <Cabecalho titulo="editar meta" voltarPara="/metas" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Esta meta não existe mais.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho titulo={titulo} voltarPara="/metas" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="pt-2 text-[12px] text-cinza">em {carteira.nome} · todo mês</p>
        <div className="mt-4" role="group" aria-label="Tipo da meta">
          <Etiqueta ativa={ehTeto} aoClicar={() => escolherTipo("teto_categoria")}>
            Teto
          </Etiqueta>
          <span className="inline-block w-2" />
          <Etiqueta ativa={!ehTeto} aoClicar={() => escolherTipo("economia_mensal")}>
            Economia
          </Etiqueta>
        </div>

        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder={ehTeto ? "Mercado, restaurante…" : "Economia do mês"}
        />

        <div
          className="mt-6"
          role="status"
          aria-live="polite"
          aria-label={ehTeto ? "Valor do teto" : "Valor da economia"}
        >
          <Rotulo>valor</Rotulo>
          <div className="mt-2">
            <Numero centavos={entrada.centavos} tamanho="secao" />
          </div>
        </div>

        {ehTeto && (
          <div className="mt-4">
            <Rotulo>categoria</Rotulo>
            <div className="mt-2 flex flex-wrap gap-2">
              {cats.map((c) => (
                <Etiqueta
                  key={c.id}
                  ativa={categoriaID === c.id}
                  aoClicar={() => setCategoriaID(c.id)}
                >
                  <IconeCategoria nome={c.icone} size={14} />
                  {c.nome}
                </Etiqueta>
              ))}
            </div>
          </div>
        )}

        {!ehTeto && (
          <p className="mt-4 text-[12px] text-cinza">
            Receitas menos despesas do mês contra este valor. Sem cofre e sem transferência.
          </p>
        )}

        {existente && (
          <div className="mt-8">
            <Botao variante="destrutivo" onClick={() => void apagar()} disabled={salvando}>
              Apagar meta
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
        aoSalvar={salvar}
        aoFechar={voltar}
        podeSalvar={pode}
        mostraSalvar
      />
    </div>
  );
}
