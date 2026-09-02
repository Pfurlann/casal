"use client";

import { useTema, type Tema } from "@/lib/tema";
import { Etiqueta } from "./Etiqueta";
import { Rotulo } from "./Rotulo";

const OPCOES: { valor: Tema; nome: string }[] = [
  { valor: "sistema", nome: "Sistema" },
  { valor: "claro", nome: "Claro" },
  { valor: "escuro", nome: "Escuro" },
];

export function EscolhaTema() {
  const { tema, escolher } = useTema();
  return (
    <div>
      <Rotulo>tema</Rotulo>
      <div className="mt-2 flex w-full gap-2">
        {OPCOES.map((o) => (
          <Etiqueta
            key={o.valor}
            ativa={tema === o.valor}
            aoClicar={() => escolher(o.valor)}
            className="min-w-0 flex-1"
          >
            {o.nome}
          </Etiqueta>
        ))}
      </div>
    </div>
  );
}
