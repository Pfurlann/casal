import type { VisibilidadeOrigem } from "./domain";

export type CarteiraVisibilidade = {
  id?: string;
  visibilidade?: string;
  rotulo?: string;
};

export type OrigemVisibilidade = {
  visibilidade?: VisibilidadeOrigem | string;
  donoID?: string;
  carteiraID?: string;
};

export const VISIBILIDADES_ORIGEM: VisibilidadeOrigem[] = ["pessoal", "conjunta", "ambas"];

export const ROTULO_VISIBILIDADE_ORIGEM: Record<VisibilidadeOrigem, string> = {
  pessoal: "Pessoal",
  conjunta: "Conjunta",
  ambas: "Ambas",
};

/** Carteira fechada ou rotulada pessoal — o pote é só de quem criou. */
export function carteiraEhPessoal(carteira?: CarteiraVisibilidade | null): boolean {
  if (!carteira) return false;
  return carteira.visibilidade === "fechada" || carteira.rotulo === "pessoal";
}

export function visibilidadePadraoDaCarteira(
  carteira?: CarteiraVisibilidade | null,
): VisibilidadeOrigem {
  return carteiraEhPessoal(carteira) ? "pessoal" : "conjunta";
}

export function normalizarVisibilidadeOrigem(
  valor?: string | null,
): VisibilidadeOrigem | undefined {
  if (valor === "pessoal" || valor === "conjunta" || valor === "ambas") return valor;
  return undefined;
}

export function visibilidadeCombinaComCarteira(
  vis: VisibilidadeOrigem,
  carteira?: CarteiraVisibilidade | null,
): boolean {
  const pessoal = carteiraEhPessoal(carteira);
  switch (vis) {
    case "pessoal":
      return pessoal;
    case "conjunta":
      return !pessoal;
    case "ambas":
      return true;
    default: {
      const _nunca: never = vis;
      throw new Error(`visibilidade não tratada: ${_nunca}`);
    }
  }
}

/**
 * Conta/cartão visível nesta carteira para aquele dono.
 * Pessoal: pessoal|ambas do dono. Conjunta: conjunta|ambas do dono — nunca a pessoal do parceiro.
 * Sem visibilidade (legado): só na carteira em que foi cadastrado.
 */
export function origemVisivelNaCarteira(
  origem: OrigemVisibilidade,
  carteira: CarteiraVisibilidade | null | undefined,
  donoAlvo?: string,
): boolean {
  if (donoAlvo && origem.donoID && origem.donoID !== donoAlvo) return false;
  const vis = normalizarVisibilidadeOrigem(origem.visibilidade);
  if (!vis) {
    return !origem.carteiraID || !carteira?.id || origem.carteiraID === carteira.id;
  }
  return visibilidadeCombinaComCarteira(vis, carteira);
}

export function filtrarOrigensDaCarteira<T extends OrigemVisibilidade>(
  origens: T[],
  carteira: CarteiraVisibilidade | null | undefined,
  donoAlvo?: string,
): T[] {
  return origens.filter((o) => origemVisivelNaCarteira(o, carteira, donoAlvo));
}

/** Sem dono (legado) ou sem usuário logado: quem vê pode apagar. Senão, só o dono. */
export function eDonoDaOrigem(origem: { donoID?: string }, usuarioID?: string): boolean {
  if (!origem.donoID || !usuarioID) return true;
  return origem.donoID === usuarioID;
}

/** Tira o cartão das listas e das faturas ativas. Não mexe em lançamentos. */
export function cartoesAposApagar<
  T extends OrigemVisibilidade & { id: string },
  F extends { cartaoID: string },
>(
  cartoes: T[],
  faturas: F[],
  carteira: CarteiraVisibilidade | null | undefined,
  id: string,
  usuarioID?: string,
): { cartoesTodos: T[]; cartoes: T[]; faturas: F[] } {
  const cartoesTodos = cartoes.filter((c) => c.id !== id);
  const visiveis = filtrarOrigensDaCarteira(cartoesTodos, carteira, usuarioID);
  const ids = new Set(visiveis.map((c) => c.id));
  return {
    cartoesTodos,
    cartoes: visiveis,
    faturas: faturas.filter((f) => ids.has(f.cartaoID)),
  };
}

/**
 * No lançar: origens de quem pagou. Se essa pessoa não tiver nenhuma visível,
 * volta para as do usuário logado — nunca mistura cartão pessoal do parceiro.
 */
export function origensDoPagador<T extends OrigemVisibilidade>(
  origens: T[],
  carteira: CarteiraVisibilidade | null | undefined,
  pagadorID?: string,
  usuarioID?: string,
): T[] {
  const alvo = pagadorID || usuarioID;
  const doAlvo = filtrarOrigensDaCarteira(origens, carteira, alvo);
  if (doAlvo.length > 0) return doAlvo;
  if (usuarioID && alvo && alvo !== usuarioID) {
    return filtrarOrigensDaCarteira(origens, carteira, usuarioID);
  }
  return doAlvo;
}
