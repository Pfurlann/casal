import { Marca } from "../marca/marca-viva";

export function Vazio({
  frase,
  acao,
}: {
  frase: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <Marca tamanho={48} />
      <p className="max-w-[280px] text-[14px] text-cinza">{frase}</p>
      {acao}
    </div>
  );
}
