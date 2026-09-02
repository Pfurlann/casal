/** Valor em centavos. Nunca use float para somar ou gravar dinheiro. */
export type Centavos = number;

export const ZERO = 0;

export function formatarBRL(centavos: Centavos): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const reais = Math.trunc(abs / 100);
  const resto = abs % 100;
  const corpo = `${reais.toLocaleString("pt-BR")},${String(resto).padStart(2, "0")}`;
  return negativo ? `−R$ ${corpo}` : `R$ ${corpo}`;
}

/** Sobra da divisão inteira vai para a primeira parcela. */
export function dividir(centavos: Centavos, partes: number): Centavos[] {
  if (partes <= 0) return [];
  const base = Math.trunc(centavos / partes);
  const primeira = centavos - base * (partes - 1);
  return [primeira, ...Array.from({ length: partes - 1 }, () => base)];
}

export class EntradaValor {
  centavos = 0;

  digitar(d: number) {
    if (d < 0 || d > 9) return;
    const proximo = this.centavos * 10 + d;
    if (proximo > 99_999_999_99) return;
    this.centavos = proximo;
  }

  apagar() {
    this.centavos = Math.trunc(this.centavos / 10);
  }

  get podeSalvar() {
    return this.centavos > 0;
  }

  static deCentavos(centavos: number) {
    const e = new EntradaValor();
    e.centavos = Math.max(0, centavos);
    return e;
  }
}
