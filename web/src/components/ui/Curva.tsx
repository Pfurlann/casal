export function Curva({
  pontos,
}: {
  pontos: { rotulo: string; total: number }[];
}) {
  const maior = Math.max(...pontos.map((p) => p.total), 0);
  return (
    <div className="flex h-[56px] items-end gap-1.5">
      {pontos.map((p, i) => (
        <div key={`${p.rotulo}-${i}`} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              data-barra
              className="w-full bg-grafite"
              style={{ height: maior > 0 && p.total > 0 ? `${(p.total / maior) * 100}%` : "2px" }}
            />
          </div>
          <span className="font-numero text-[10px] tabular-nums text-cinza">
            {p.rotulo}
          </span>
        </div>
      ))}
    </div>
  );
}
