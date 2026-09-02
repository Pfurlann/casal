/** Contraste WCAG 2.1. Entrada em hexadecimal de 3 ou 6 dígitos. */

function canal(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const bruto = hex.replace("#", "");
  const cheio =
    bruto.length === 3
      ? bruto
          .split("")
          .map((c) => c + c)
          .join("")
      : bruto;
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) {
    throw new Error(`hexadecimal inválido: ${hex}`);
  }
  const r = canal(parseInt(cheio.slice(0, 2), 16));
  const g = canal(parseInt(cheio.slice(2, 4), 16));
  const b = canal(parseInt(cheio.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);
  return (claro + 0.05) / (escuro + 0.05);
}
