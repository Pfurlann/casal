export type CarteiraPagador = {
  visibilidade?: string;
  rotulo?: string;
};

export type MembroPagador = {
  userId: string;
  email?: string;
};

/** Conjunta (aberta / compartilhada) mostra o campo; pessoal omite. */
export function carteiraMostraPagador(carteira?: CarteiraPagador | null): boolean {
  if (!carteira) return false;
  return carteira.visibilidade === "aberta" || carteira.rotulo === "compartilhada";
}

/** Quem está logado, senão o valor informado. */
export function pagadorPadrao(informado?: string, usuarioID?: string): string | undefined {
  return informado || usuarioID || undefined;
}

export function rotuloPagador(membro: MembroPagador, usuarioID?: string): string {
  if (usuarioID && membro.userId === usuarioID) return "Você";
  const email = membro.email?.trim();
  return email || "Parceiro";
}

export function iniciaisPagador(membro: MembroPagador): string {
  const local = membro.email?.split("@")[0]?.trim() ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return local.toUpperCase();
  return "P";
}

/** Indicador discreto no mês. Null quando o pagador não está gravado. */
export function indicadorPagador(
  pagadorID: string | undefined,
  membros: MembroPagador[],
  usuarioID?: string,
): string | null {
  if (!pagadorID) return null;
  if (usuarioID && pagadorID === usuarioID) return "você";
  const membro = membros.find((m) => m.userId === pagadorID);
  if (!membro) return "parceiro";
  return iniciaisPagador(membro);
}

/** Qualquer membro da carteira edita o lançamento — não só o dono. */
export function membroPodeEditarLancamento(
  membros: { userId: string }[],
  usuarioID?: string,
): boolean {
  if (!usuarioID) return true;
  if (membros.length === 0) return true;
  return membros.some((m) => m.userId === usuarioID);
}
