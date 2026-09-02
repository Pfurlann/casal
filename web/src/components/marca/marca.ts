/**
 * Geometria do símbolo do casal — o diafragma.
 *
 * Três desenhos, um gesto. Escalar um só colapsa a curva: em tamanho
 * pequeno o curso horizontal encurta, a curva aprofunda e o traço
 * engrossa em proporção.
 *
 * A profundidade da curva é o dado. Reta é o alarme.
 */

export type Faixa = "grande" | "medio" | "pequeno";
export type CorMarca = "grafite" | "ambar" | "ambar-texto";

/** Curva mais funda possível: usado como padrão enquanto Metas não existe. */
export const Y_FUNDO_LARGO = 46;

/** Reta exata. Reservada ao estouro. */
export const Y_RETA = 22;

/** Piso de curva enquanto ainda há folga, para a reta significar só estouro. */
const Y_PISO = 25;

const FOLGA_CHEIA = 0.4;
const FOLGA_LIMITE = 0.15;

function limitar(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function yFundo(folga: number | undefined): number {
  if (folga === undefined) return Y_FUNDO_LARGO;
  if (folga <= 0) return Y_RETA;
  const t = limitar(folga / FOLGA_CHEIA, 0, 1);
  return Y_PISO + (Y_FUNDO_LARGO - Y_PISO) * t;
}

export function corDaMarca(folga: number | undefined): CorMarca {
  if (folga === undefined) return "grafite";
  if (folga <= 0) return "ambar-texto";
  if (folga < FOLGA_LIMITE) return "ambar";
  return "grafite";
}

export function faixaDe(tamanho: number): Faixa {
  if (tamanho >= 32) return "grande";
  if (tamanho >= 20) return "medio";
  return "pequeno";
}

const DESENHOS: Record<
  Faixa,
  { x0: number; x1: number; c0: number; c1: number; base: number; traco: number }
> = {
  grande: { x0: 8, x1: 56, c0: 20, c1: 22, base: 22, traco: 7 },
  medio: { x0: 7, x1: 57, c0: 18, c1: 20, base: 21, traco: 9.5 },
  pequeno: { x0: 6, x1: 58, c0: 16, c1: 18, base: 20, traco: 13 },
};

/** Curva simétrica, pontas na horizontal: cede e volta, nunca cai. */
export function caminhoMarca(
  tamanho: number,
  y: number,
): { d: string; traco: number } {
  const { x0, x1, c0, c1, base, traco } = DESENHOS[faixaDe(tamanho)];
  const e0 = 64 - c0;
  const e1 = 64 - c1;
  const d =
    `M${x0} ${base} ` +
    `C${c0} ${base} ${c1} ${y} 32 ${y} ` +
    `C${e1} ${y} ${e0} ${base} ${x1} ${base}`;
  return { d, traco };
}
