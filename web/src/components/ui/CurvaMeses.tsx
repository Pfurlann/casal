const ALTURA_MAXIMA = 40;

/**
 * Curva sóbria de 6 meses: gasto (grafite) e receita (âmbar).
 * Meses zerados usam névoa. Sem arco-íris.
 */
export function CurvaMeses({
  pontos,
}: {
  pontos: { rotulo: string; gasto: number; receita: number }[];
}) {
  const maior = Math.max(...pontos.flatMap((p) => [p.gasto, p.receita]), 0);

  return (
    <div>
      <div className="flex items-end gap-2" role="img" aria-label="Gasto e receita nos últimos meses">
        {pontos.map((p, i) => {
          const hGasto =
            maior > 0 && p.gasto > 0 ? Math.max((p.gasto / maior) * ALTURA_MAXIMA, 2) : 2;
          const hReceita =
            maior > 0 && p.receita > 0 ? Math.max((p.receita / maior) * ALTURA_MAXIMA, 2) : 2;
          return (
            <div key={`${p.rotulo}-${i}`} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-10 items-end gap-0.5">
                <div
                  data-barra
                  data-serie="gasto"
                  className="w-1.5"
                  style={{
                    height: `${hGasto}px`,
                    backgroundColor:
                      maior > 0 && p.gasto > 0 ? "var(--grafite)" : "var(--nevoa)",
                  }}
                />
                <div
                  data-barra
                  data-serie="receita"
                  className="w-1.5"
                  style={{
                    height: `${hReceita}px`,
                    backgroundColor:
                      maior > 0 && p.receita > 0 ? "var(--ambar)" : "var(--nevoa)",
                  }}
                />
              </div>
              <span className="font-numero text-[12px] tabular-nums text-grafite">
                {p.rotulo}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cinza">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 bg-grafite" />
          gasto
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 bg-ambar" />
          receita
        </span>
      </p>
    </div>
  );
}
