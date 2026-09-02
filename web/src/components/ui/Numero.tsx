import { formatarBRL } from "@/lib/money";

const TAMANHO = {
  heroi: "text-[36px] tracking-[-0.03em]",
  secao: "text-[24px] tracking-[-0.03em]",
  corpo: "text-[14px]",
  legenda: "text-[12px]",
} as const;

const TOM = {
  normal: "text-grafite",
  atencao: "text-ambar-texto",
} as const;

/**
 * Único formatador de dinheiro da interface.
 *
 * Monoespaçada tabular não é estética: é o motivo pelo qual o valor não
 * dança quando o dígito muda e pelo qual coluna de dinheiro alinha.
 */
export function Numero({
  centavos,
  tamanho,
  tom = "normal",
  subordinaCentavos = false,
}: {
  centavos: number;
  tamanho: keyof typeof TAMANHO;
  tom?: keyof typeof TOM;
  subordinaCentavos?: boolean;
}) {
  const classe = `font-numero font-medium tabular-nums ${TAMANHO[tamanho]} ${TOM[tom]}`;
  const texto = formatarBRL(centavos);

  if (!subordinaCentavos) {
    return <span className={classe}>{texto}</span>;
  }

  const corte = texto.lastIndexOf(",");
  const inteiro = texto.slice(0, corte);
  const resto = texto.slice(corte);

  return (
    <span className={classe}>
      {inteiro}
      <span className="text-[47%] opacity-[0.42]">{resto}</span>
    </span>
  );
}
