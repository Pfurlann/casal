import type { Pessoa } from "./domain";

export type ItemHistorico = {
  descricao: string;
  conta: string;
  portadorId?: string;
  pessoa?: Pessoa;
  data: string;
};

export type Sugestao = { conta?: string; portadorId?: string; pessoa?: Pessoa };

/** Palavras com menos de 3 letras ("de", "da") ou só números não identificam nada. */
function palavras(texto: string): Set<string> {
  return new Set(
    texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3 && !/^\d+$/.test(p)),
  );
}

/**
 * Sugere conta, portador e pessoa a partir do lançamento mais recente que compartilha
 * ao menos uma palavra com a descrição digitada (M15). Sem correspondência: `{}`.
 */
export function sugerir(descricao: string, historico: ItemHistorico[]): Sugestao {
  const alvo = palavras(descricao);
  if (alvo.size === 0) return {};

  let melhor: ItemHistorico | undefined;
  for (const item of historico) {
    const comum = [...palavras(item.descricao)].some((p) => alvo.has(p));
    if (comum && (!melhor || item.data > melhor.data)) melhor = item;
  }
  if (!melhor) return {};

  const s: Sugestao = { conta: melhor.conta };
  if (melhor.portadorId) s.portadorId = melhor.portadorId;
  if (melhor.pessoa) s.pessoa = melhor.pessoa;
  return s;
}
