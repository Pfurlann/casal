import { caminhoMarca, corDaMarca, yFundo } from "./marca";

const CLASSE_COR = {
  grafite: "text-grafite",
  ambar: "text-ambar",
  "ambar-texto": "text-ambar-texto",
} as const;

/**
 * O símbolo. `folga` é a fração da sobra segura do período — omitida
 * enquanto Metas não existe, o que desenha o estado de folga larga.
 */
export function Marca({
  tamanho,
  folga,
  titulo = "casal",
}: {
  tamanho: number;
  folga?: number;
  titulo?: string;
}) {
  const y = yFundo(folga);
  const { d, traco } = caminhoMarca(tamanho, y);
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      role="img"
      className={CLASSE_COR[corDaMarca(folga)]}
    >
      <title>{titulo}</title>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={traco}
        strokeLinecap="butt"
      />
    </svg>
  );
}
