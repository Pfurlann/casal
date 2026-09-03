import Link from "next/link";
import { Marca } from "../marca/marca-viva";
import { IconeVoltar } from "../Icones";

export function Cabecalho({
  titulo,
  voltarPara,
  aoVoltar,
  acao,
  marca = false,
  folga,
}: {
  titulo: string;
  voltarPara?: string;
  /** Fecha folha/histórico sem soft-nav que deixa @folha aberta no mobile. */
  aoVoltar?: () => void;
  acao?: React.ReactNode;
  marca?: boolean;
  folga?: number;
}) {
  return (
    <div className="flex min-h-[44px] items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))]">
      {aoVoltar ? (
        <button
          type="button"
          onClick={aoVoltar}
          aria-label="Voltar"
          className="casal-toque flex min-h-[44px] min-w-[44px] items-center text-grafite"
        >
          <IconeVoltar size={20} />
        </button>
      ) : (
        voltarPara && (
          <Link
            href={voltarPara}
            aria-label="Voltar"
            className="casal-toque flex min-h-[44px] min-w-[44px] items-center text-grafite"
          >
            <IconeVoltar size={20} />
          </Link>
        )
      )}
      <h1 className="min-w-0 flex-1 truncate font-texto text-[17px] font-semibold tracking-[-0.02em] text-grafite">
        {titulo}
      </h1>
      {marca && <Marca tamanho={26} folga={folga} />}
      {acao}
    </div>
  );
}
