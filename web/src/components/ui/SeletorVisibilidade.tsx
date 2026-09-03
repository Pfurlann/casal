import type { VisibilidadeOrigem } from "@/lib/domain";
import { ROTULO_VISIBILIDADE_ORIGEM, VISIBILIDADES_ORIGEM } from "@/lib/visibilidade";
import { Etiqueta } from "./Etiqueta";
import { Rotulo } from "./Rotulo";

function ajudaDaVisibilidade(valor: VisibilidadeOrigem): string {
  switch (valor) {
    case "pessoal":
      return "Só você vê, na sua carteira pessoal.";
    case "conjunta":
      return "Aparece na carteira conjunta — o parceiro não vê as pessoais dele no seu lugar.";
    case "ambas":
      return "Aparece na pessoal e na conjunta, sempre como a sua conta ou cartão.";
    default: {
      const _nunca: never = valor;
      throw new Error(`visibilidade não tratada: ${_nunca}`);
    }
  }
}

export function SeletorVisibilidade({
  valor,
  onChange,
}: {
  valor: VisibilidadeOrigem;
  onChange: (v: VisibilidadeOrigem) => void;
}) {
  return (
    <div className="mt-4">
      <Rotulo>visibilidade</Rotulo>
      <div className="mt-2 flex gap-2" role="group" aria-label="Visibilidade">
        {VISIBILIDADES_ORIGEM.map((v) => (
          <Etiqueta key={v} ativa={valor === v} aoClicar={() => onChange(v)}>
            {ROTULO_VISIBILIDADE_ORIGEM[v]}
          </Etiqueta>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-cinza">{ajudaDaVisibilidade(valor)}</p>
    </div>
  );
}
