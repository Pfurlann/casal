import { percentualInteiro } from "@/lib/diagnostico";
import type { FatiaRelatorio } from "@/lib/relatorios";
import { Numero } from "./Numero";

const RAIO = 36;
const CIRC = 2 * Math.PI * RAIO;
const OPACIDADES = [1, 0.72, 0.5, 0.34, 0.22, 0.12] as const;

/**
 * Rosca de gastos. Quase monocromática: uma só tinta (grafite) em opacidades.
 * Sem bloco colorido por categoria.
 */
export function Rosca({
  fatias,
}: {
  fatias: FatiaRelatorio[];
}) {
  const total = fatias.reduce((s, f) => s + f.total, 0);
  let acumulado = 0;

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-8">
      <svg
        viewBox="0 0 96 96"
        width={160}
        height={160}
        role="img"
        aria-label="Gastos por categoria"
        className="shrink-0"
      >
        <circle
          cx="48"
          cy="48"
          r={RAIO}
          fill="none"
          stroke="var(--nevoa)"
          strokeWidth="14"
        />
        {total > 0 &&
          fatias.map((f, i) => {
            const comprimento = (f.total / total) * CIRC;
            const offset = acumulado;
            acumulado += comprimento;
            return (
              <circle
                key={`${f.categoriaID}-${f.nome}-${i}`}
                data-fatia
                cx="48"
                cy="48"
                r={RAIO}
                fill="none"
                stroke="var(--grafite)"
                strokeWidth="14"
                strokeLinecap="butt"
                strokeDasharray={`${comprimento} ${CIRC - comprimento}`}
                strokeDashoffset={CIRC / 4 - offset}
                strokeOpacity={OPACIDADES[i] ?? 0.12}
              />
            );
          })}
      </svg>
      <ul className="w-full min-w-0">
        {fatias.map((f) => (
          <li
            key={`${f.categoriaID}-${f.nome}-legenda`}
            className="flex min-h-[44px] items-center justify-between gap-3 border-b border-nevoa py-2 last:border-b-0 lg:min-h-[36px]"
          >
            <span className="min-w-0 truncate text-[14px] text-grafite">
              {f.nome}
              <span className="ml-2 font-numero text-[12px] tabular-nums text-cinza">
                {percentualInteiro(f.total, total)}%
              </span>
            </span>
            <Numero centavos={f.total} tamanho="corpo" />
          </li>
        ))}
      </ul>
    </div>
  );
}
