"use client";

import Link from "next/link";
import { useLoja } from "@/lib/store";
import { Marca } from "../marca/marca-viva";
import { IconeVoltar } from "../Icones";

export function Cabecalho({
  titulo,
  voltarPara,
  aoVoltar,
  acao,
  marca = false,
  folga,
  chipCarteira = true,
}: {
  titulo: string;
  voltarPara?: string;
  /** Fecha folha/histórico sem soft-nav que deixa @folha aberta no mobile. */
  aoVoltar?: () => void;
  acao?: React.ReactNode;
  marca?: boolean;
  folga?: number;
  /** Chip da carteira no header mobile. No desktop a carteira fica no trilho. */
  chipCarteira?: boolean;
}) {
  const { carteira } = useLoja();
  const nomeCarteira = carteira?.nome;

  return (
    <div className="flex min-h-[44px] items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] lg:min-h-[52px] lg:gap-4 lg:px-0 lg:pt-0">
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
      <h1 className="min-w-0 flex-1 truncate font-texto text-[17px] font-semibold leading-none tracking-[-0.02em] text-grafite lg:text-[22px] lg:tracking-[-0.03em]">
        {titulo}
      </h1>
      {chipCarteira && nomeCarteira ? (
        <Link
          href="/mais/carteiras"
          aria-label={`Carteira ${nomeCarteira}`}
          className="casal-toque inline-flex max-w-[40%] shrink-0 items-center truncate rounded-etiqueta border border-nevoa px-2.5 py-1 text-[12px] font-semibold text-grafite lg:hidden"
        >
          {nomeCarteira}
        </Link>
      ) : null}
      {(marca || acao) && (
        <div className="flex shrink-0 items-center gap-1">
          {marca && <Marca tamanho={26} folga={folga} />}
          {acao}
        </div>
      )}
    </div>
  );
}
