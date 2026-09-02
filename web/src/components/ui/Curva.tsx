export function Curva({
  pontos,
}: {
  pontos: { rotulo: string; total: number }[];
}) {
  const maior = Math.max(...pontos.map((p) => p.total), 0);
  return (
    <div className="flex h-[56px] items-end gap-2">
      {pontos.map((p, i) => {
        const preenchida = maior > 0 && p.total > 0;
        return (
          <div key={`${p.rotulo}-${i}`} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-3 flex-1 items-end justify-center">
              <div
                data-barra
                className={`w-full ${preenchida ? "bg-grafite" : "bg-nevoa"}`}
                style={{ height: preenchida ? `${(p.total / maior) * 100}%` : "2px" }}
              />
            </div>
            <span className="font-numero text-[12px] tabular-nums text-grafite">
              {p.rotulo}
            </span>
          </div>
        );
      })}
    </div>
  );
}
