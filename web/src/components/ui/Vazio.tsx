import { Marca } from "../marca/marca-viva";

export function Vazio({
  frase,
  acao,
}: {
  frase: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="casal-vazio flex flex-col items-center gap-5 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-nevoa">
        <Marca tamanho={40} />
      </div>
      <p className="max-w-[280px] text-[14px] leading-relaxed text-cinza">{frase}</p>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  );
}
