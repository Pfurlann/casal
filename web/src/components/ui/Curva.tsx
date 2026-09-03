const ALTURA_MAXIMA = 40;

export function Curva({
  pontos,
}: {
  pontos: { rotulo: string; total: number }[];
}) {
  const maior = Math.max(...pontos.map((p) => p.total), 0);
  return (
    <div className="flex items-end gap-2">
      {pontos.map((p, i) => {
        const preenchida = maior > 0 && p.total > 0;
        const altura = preenchida ? Math.max((p.total / maior) * ALTURA_MAXIMA, 2) : 2;
        return (
          <div key={`${p.rotulo}-${i}`} className="flex flex-1 flex-col items-center gap-1">
            <div
              data-barra
              className="w-3"
              style={{
                height: `${altura}px`,
                backgroundColor: preenchida ? "var(--grafite)" : "var(--nevoa)",
              }}
            />
            <span className="font-numero text-[12px] tabular-nums text-grafite">
              {p.rotulo}
            </span>
          </div>
        );
      })}
    </div>
  );
}
