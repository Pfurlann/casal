import Link from "next/link";
import { Numero } from "./Numero";
import { BolinhaCor } from "./SeletorCor";

function Conteudo({
  icone,
  titulo,
  subtitulo,
  valor,
  tom,
  cor,
  pago,
}: {
  icone?: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  valor?: number;
  tom: "normal" | "atencao";
  cor?: string;
  pago?: boolean;
}) {
  return (
    <>
      {cor && <BolinhaCor cor={cor} />}
      {icone && <span className="shrink-0 text-cinza">{icone}</span>}
      <span className="min-w-0 flex-1 text-left">
        <span
          className={`block truncate text-[14px] ${
            tom === "atencao" ? "text-ambar-texto" : "text-grafite"
          }`}
        >
          {titulo}
        </span>
        {subtitulo && (
          <span className="block truncate text-[12px] text-cinza">{subtitulo}</span>
        )}
      </span>
      {pago && (
        <span aria-label="pago" className="shrink-0 text-[14px] text-pago">
          ✓
        </span>
      )}
      {valor !== undefined && <Numero centavos={valor} tamanho="corpo" tom={tom} />}
    </>
  );
}

/** Uma linha de lista. Substitui as seis variantes espalhadas hoje. */
export function LinhaLista({
  icone,
  titulo,
  subtitulo,
  valor,
  tom = "normal",
  href,
  aoClicar,
  cor,
  pago,
  semBorda,
}: {
  icone?: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  valor?: number;
  tom?: "normal" | "atencao";
  href?: string;
  aoClicar?: () => void;
  cor?: string;
  pago?: boolean;
  semBorda?: boolean;
}) {
  const classe =
    `casal-linha-lista casal-toque flex min-h-[44px] w-full items-center gap-3 py-3 text-left lg:min-h-[36px] lg:py-2 ${
      semBorda ? "" : "border-b border-nevoa"
    }`;
  const filhos = (
    <Conteudo
      icone={icone}
      titulo={titulo}
      subtitulo={subtitulo}
      valor={valor}
      tom={tom}
      cor={cor}
      pago={pago}
    />
  );

  if (href) {
    return (
      <Link href={href} className={classe}>
        {filhos}
      </Link>
    );
  }
  if (aoClicar) {
    return (
      <button type="button" onClick={aoClicar} className={classe}>
        {filhos}
      </button>
    );
  }
  return <div className={classe}>{filhos}</div>;
}
