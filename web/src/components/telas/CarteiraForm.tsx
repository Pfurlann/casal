"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RotuloCarteira } from "@/lib/domain";
import { CORES_CARTAO, ROTULO_CARTEIRA } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Rotulo } from "../ui/Rotulo";

const ROTULOS: RotuloCarteira[] = ["pessoal", "compartilhada"];

export function CarteiraForm() {
  const { criarCarteira } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [rotulo, setRotulo] = useState<RotuloCarteira>("pessoal");
  const [cor, setCor] = useState(CORES_CARTAO[0]);
  const [criando, setCriando] = useState(false);

  const pode = nome.trim().length > 0 && !criando;

  async function criar() {
    if (!pode) return;
    setCriando(true);
    const falha = await criarCarteira({ nome: nome.trim(), rotulo, cor });
    setCriando(false);
    if (falha) avisar("erro", falha);
    else router.push("/mais/carteiras");
  }

  return (
    <div>
      <Cabecalho titulo="nova carteira" voltarPara="/mais/carteiras" />
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
          <Botao variante="primario" onClick={criar} disabled={!pode}>
            {criando ? "Criando…" : "Criar carteira"}
          </Botao>
        </div>
      </div>
    </div>
  );
}
