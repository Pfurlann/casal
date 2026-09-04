"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RotuloCarteira, VisibilidadeCarteira } from "@/lib/domain";
import { CORES_CARTAO, ROTULO_CARTEIRA } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Rotulo } from "../ui/Rotulo";

const ROTULOS: RotuloCarteira[] = ["pessoal", "compartilhada"];

export function CarteiraForm({ id }: { id?: string }) {
  const { criarCarteira, salvarCarteira, apagarCarteira, carteiras } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = id ? carteiras.find((c) => c.id === id) : undefined;
  const editando = Boolean(id);
  const podeEditar = !editando || existente?.souDono !== false;

  const [nome, setNome] = useState(existente?.nome ?? "");
  const [rotulo, setRotulo] = useState<RotuloCarteira>(
    existente?.rotulo === "pj" ? "compartilhada" : (existente?.rotulo ?? "pessoal"),
  );
  const [visibilidade, setVisibilidade] = useState<VisibilidadeCarteira>(
    existente?.visibilidade === "resumo" ? "resumo" : "aberta",
  );
  const [cor, setCor] = useState(existente?.cor ?? CORES_CARTAO[0]);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const pode = nome.trim().length > 0 && !salvando && podeEditar;
  const titulo = editando ? "editar carteira" : "nova carteira";

  function voltar() {
    router.push("/mais/carteiras");
  }

  async function criar() {
    if (!pode) return;
    setSalvando(true);
    const falha = await criarCarteira({
      nome: nome.trim(),
      rotulo,
      cor,
      visibilidade: rotulo === "pessoal" ? "fechada" : visibilidade,
    });
    setSalvando(false);
    if (falha) avisar("erro", falha);
    else voltar();
  }

  async function salvar() {
    if (!pode || !existente) return;
    setSalvando(true);
    const falha = await salvarCarteira({
      id: existente.id,
      nome: nome.trim(),
      rotulo,
      cor,
      visibilidade: rotulo === "pessoal" ? "fechada" : visibilidade,
    });
    setSalvando(false);
    if (falha) avisar("erro", falha);
    else voltar();
  }

  async function apagar() {
    if (!existente) return;
    setSalvando(true);
    const falha = await apagarCarteira(existente.id);
    setSalvando(false);
    if (falha) avisar("erro", falha);
    else voltar();
  }

  if (editando && !existente) {
    return (
      <div>
        <Cabecalho titulo="editar carteira" voltarPara="/mais/carteiras" />
        <p className="px-4 pt-6 text-[14px] text-cinza">Carteira não encontrada.</p>
      </div>
    );
  }

  if (editando && !podeEditar) {
    return (
      <div>
        <Cabecalho titulo="editar carteira" voltarPara="/mais/carteiras" />
        <p className="px-4 pt-6 text-[14px] text-cinza">
          Só quem criou a carteira pode editar ou apagar.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Cabecalho titulo={titulo} voltarPara="/mais/carteiras" />
      <div className="px-4 pt-6">
        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder={rotulo === "pessoal" ? "Meu, Pessoal…" : "Nosso, Casal…"}
        />

        <div className="mt-4">
          <Rotulo>tipo</Rotulo>
          <div className="mt-2 flex gap-2">
            {ROTULOS.map((r) => (
              <Etiqueta key={r} ativa={rotulo === r} aoClicar={() => setRotulo(r)}>
                {ROTULO_CARTEIRA[r]}
              </Etiqueta>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-cinza">
            {rotulo === "pessoal"
              ? "Só você vê. Não aceita convite."
              : "Você convida o parceiro com um código."}
          </p>
        </div>

        {rotulo === "compartilhada" && (
          <div className="mt-4">
            <Rotulo>o parceiro vê</Rotulo>
            <div className="mt-2 flex gap-2">
              <Etiqueta ativa={visibilidade === "aberta"} aoClicar={() => setVisibilidade("aberta")}>
                tudo
              </Etiqueta>
              <Etiqueta ativa={visibilidade === "resumo"} aoClicar={() => setVisibilidade("resumo")}>
                só totais
              </Etiqueta>
            </div>
            <p className="mt-2 text-[12px] text-cinza">
              {visibilidade === "resumo"
                ? "Parceiro vê totais do mês, sem cada lançamento."
                : "Parceiro vê a mesma lista de lançamentos que você."}
            </p>
          </div>
        )}

        <div className="mt-5">
          <Rotulo>cor</Rotulo>
          <div className="mt-2 flex gap-2">
            {CORES_CARTAO.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Cor ${hex}`}
                aria-pressed={cor === hex}
                onClick={() => setCor(hex)}
                className="h-7 w-7 rounded-amostra border border-nevoa"
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          {editando ? (
            <Botao variante="primario" onClick={salvar} disabled={!pode}>
              {salvando && !confirmando ? "Salvando…" : "Salvar carteira"}
            </Botao>
          ) : (
            <Botao variante="primario" onClick={criar} disabled={!pode}>
              {salvando ? "Criando…" : "Criar carteira"}
            </Botao>
          )}
        </div>

        {existente && (
          confirmando ? (
            <div className="mt-8">
              <p className="text-[14px] font-semibold text-grafite">Apagar carteira?</p>
              <p className="mt-2 text-[12px] text-cinza">
                Lançamentos e cartões desta carteira saem da vista.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Botao variante="destrutivo" onClick={apagar} disabled={salvando}>
                  {salvando ? "Apagando…" : "Apagar"}
                </Botao>
                <Botao variante="secundario" onClick={() => setConfirmando(false)} disabled={salvando}>
                  Cancelar
                </Botao>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <Botao variante="destrutivo" onClick={() => setConfirmando(true)} disabled={salvando}>
                Apagar carteira
              </Botao>
            </div>
          )
        )}
      </div>
    </div>
  );
}
