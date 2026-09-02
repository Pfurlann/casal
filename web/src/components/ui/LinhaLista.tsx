import Link from "next/link";
import { Numero } from "./Numero";

function Conteudo({
  icone,
  titulo,
  subtitulo,
  valor,
  tom,
}: {
  icone?: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  valor?: number;
  tom: "normal" | "atencao";
}) {
  return (
    <>
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
}: {
  icone?: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  valor?: number;
  tom?: "normal" | "atencao";
  href?: string;
  aoClicar?: () => void;
}) {
  const classe =
    "flex min-h-[44px] w-full items-center gap-3 border-b border-nevoa py-3 text-left";
  const filhos = (
    <Conteudo
      icone={icone}
      titulo={titulo}
      subtitulo={subtitulo}
      valor={valor}
      tom={tom}
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
