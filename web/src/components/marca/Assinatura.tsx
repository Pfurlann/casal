import { Marca } from "./marca-viva";

/**
 * Assinatura da marca.
 *
 * `base` é a principal: palavra em cima, linha embaixo cedendo. Toda
 * medida deriva da largura da palavra, conforme a seção 6 da spec.
 * `horizontal` é a secundária, para cabeçalho estreito.
 */
export function Assinatura({
  variante,
  largura,
}: {
  variante: "base" | "horizontal";
  largura: number;
}) {
  if (variante === "horizontal") {
    const alturaSimbolo = largura * 0.34;
    return (
      <span
        role="img"
        aria-label="casal"
        className="inline-flex items-center text-grafite"
        style={{ gap: alturaSimbolo * 0.35 }}
      >
        {/* O nome acessível é o da assinatura inteira; o símbolo interno
            sai da árvore de acessibilidade para não anunciar imagem sem nome. */}
        <span aria-hidden>
          <Marca tamanho={alturaSimbolo} titulo="" />
        </span>
        <span
          aria-hidden
          className="font-texto font-medium lowercase leading-none"
          style={{ fontSize: largura * 0.23, letterSpacing: "0.22em" }}
        >
          casal
        </span>
      </span>
    );
  }

  const alturaLinha = largura * 0.2;
  const traco = largura / 29;
  const respiro = largura * 0.13;

  return (
    <span
      role="img"
      aria-label="casal"
      className="inline-flex flex-col items-center text-grafite"
    >
      <span
        aria-hidden
        className="font-texto font-medium lowercase leading-none"
        style={{
          fontSize: largura * 0.23,
          letterSpacing: "0.22em",
          paddingLeft: "0.22em",
          marginBottom: respiro,
        }}
      >
        casal
      </span>
      <svg
        width={largura}
        height={alturaLinha}
        viewBox="0 0 132 26"
        aria-hidden
        style={{ display: "block" }}
      >
        <path
          d="M2 4 C26 4 30 21 66 21 C102 21 106 4 130 4"
          fill="none"
          stroke="currentColor"
          strokeWidth={(traco * 132) / largura}
          strokeLinecap="butt"
        />
      </svg>
    </span>
  );
}
