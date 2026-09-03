import { CORES_CARTAO } from "@/lib/domain";
import { corValida } from "@/lib/origem";
import { Rotulo } from "./Rotulo";

export function SeletorCor({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (cor: string) => void;
}) {
  const atual = corValida(valor);
  return (
    <div className="mt-5">
      <Rotulo>cor</Rotulo>
      <div className="mt-2 flex gap-2" role="group" aria-label="Cor">
        {CORES_CARTAO.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Cor ${hex}`}
            aria-pressed={atual === hex}
            onClick={() => onChange(hex)}
            className={`h-7 w-7 rounded-amostra border ${
              atual === hex ? "border-grafite" : "border-nevoa"
            }`}
            style={{ background: hex }}
          />
        ))}
      </div>
    </div>
  );
}

export function BolinhaCor({
  cor,
  className = "",
}: {
  cor?: string;
  className?: string;
}) {
  return (
    <span
      data-cor-origem
      aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ background: corValida(cor) }}
    />
  );
}
