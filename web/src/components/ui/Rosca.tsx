"use client";

import Link from "next/link";
import { useState } from "react";
import { percentualInteiro } from "@/lib/diagnostico";
import { hrefDoMes, type Competencia } from "@/lib/domain";
import type { FatiaRelatorio } from "@/lib/relatorios";
import { Numero } from "./Numero";

const RAIO = 36;
const CIRC = 2 * Math.PI * RAIO;
const OPACIDADES = [1, 0.72, 0.5, 0.34, 0.22, 0.12] as const;

/**
 * Rosca de gastos. Quase monocromática: uma só tinta (grafite) em opacidades.
 * Hover fatia ↔ legenda; valor no centro; clique → /mes da competência.
 * /mes não filtra por categoria via query — só ?c= competência.
 */
export function Rosca({
  fatias,
  competencia,
}: {
  fatias: readonly FatiaRelatorio[];
  competencia: Competencia;
}) {
  const [destaque, setDestaque] = useState<number | null>(null);
  const total = fatias.reduce((s, f) => s + f.total, 0);
  const hrefMes = hrefDoMes(competencia);
  let acumulado = 0;

  const centro = destaque !== null ? fatias[destaque] : null;

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-8">
      <div className="relative shrink-0">
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
              const ativa = destaque === null || destaque === i;
              const opBase = OPACIDADES[i] ?? 0.12;
              return (
                <a
                  key={`${f.categoriaID}-${f.nome}-${i}`}
                  href={hrefMes}
                  aria-label={`${f.nome}: ver mês`}
                  onMouseEnter={() => setDestaque(i)}
                  onMouseLeave={() => setDestaque(null)}
                  onFocus={() => setDestaque(i)}
                  onBlur={() => setDestaque(null)}
                >
                  <circle
                    data-fatia
                    data-fatia-i={i}
                    cx="48"
                    cy="48"
                    r={RAIO}
                    fill="none"
                    stroke="var(--grafite)"
                    strokeWidth={destaque === i ? 16 : 14}
                    strokeLinecap="butt"
                    strokeDasharray={`${comprimento} ${CIRC - comprimento}`}
                    strokeDashoffset={CIRC / 4 - offset}
                    strokeOpacity={ativa ? opBase : opBase * 0.28}
                    className="cursor-pointer transition-[stroke-opacity,stroke-width] duration-150"
                    style={{ pointerEvents: comprimento > 0 ? "stroke" : "none" }}
                  />
                </a>
              );
            })}
        </svg>
        <div
          data-centro
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center"
        >
          {centro ? (
            <>
              <span className="max-w-[4.75rem] truncate text-[10px] leading-tight text-cinza">
                {centro.nome}
              </span>
              <Numero centavos={centro.total} tamanho="legenda" />
            </>
          ) : (
            <>
              <span className="text-[10px] leading-tight text-cinza">total</span>
              <Numero centavos={total} tamanho="legenda" />
            </>
          )}
        </div>
      </div>
      <ul className="w-full min-w-0">
        {fatias.map((f, i) => {
          const ativa = destaque === i;
          return (
            <li key={`${f.categoriaID}-${f.nome}-legenda`}>
              <Link
                href={hrefMes}
                data-legenda
                data-legenda-i={i}
                aria-label={`${f.nome}: ver mês`}
                onMouseEnter={() => setDestaque(i)}
                onMouseLeave={() => setDestaque(null)}
                onFocus={() => setDestaque(i)}
                onBlur={() => setDestaque(null)}
                className={
                  "casal-toque flex w-full min-h-[44px] items-center justify-between gap-3 border-b border-nevoa py-2 text-left last:border-b-0 lg:min-h-[36px] " +
                  (ativa ? "bg-nevoa/60" : "bg-transparent")
                }
              >
                <span className="flex min-w-0 items-center gap-2 truncate text-[14px] text-grafite">
                  <span
                    aria-hidden
                    data-swatch
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] bg-grafite"
                    style={{ opacity: OPACIDADES[i] ?? 0.12 }}
                  />
                  <span className="min-w-0 truncate">
                    {f.nome}
                    <span className="ml-2 font-numero text-[12px] tabular-nums text-cinza">
                      {percentualInteiro(f.total, total)}%
                    </span>
                  </span>
                </span>
                <Numero centavos={f.total} tamanho="corpo" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
