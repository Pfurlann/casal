import { CATEGORIAS, type Categoria } from "./domain";

export const ICONES_CATEGORIA = [
  "mercado",
  "restaurante",
  "combustivel",
  "transporte",
  "moradia",
  "saude",
  "educacao",
  "lazer",
  "assinaturas",
  "vestuario",
  "presentes",
  "outros",
  "salario",
  "reembolso",
] as const;

export type NomeIconeCategoria = (typeof ICONES_CATEGORIA)[number];

/** Token, nunca hex — a cor literal mora só em tokens.css. */
export const COR_CATEGORIA_CUSTOM = "grafite";

export function eCategoriaSistema(id: string): boolean {
  return CATEGORIAS.some((c) => c.id === id);
}

function eCategoriaCustom(c: Categoria | null | undefined): c is Categoria {
  if (!c?.id || !c.carteiraID) return false;
  return !eCategoriaSistema(c.id);
}

export function categoriasVisiveis(
  custom: Array<Categoria | null | undefined> | undefined,
  tipo?: "despesa" | "receita",
): Categoria[] {
  const extras = (custom ?? []).filter(eCategoriaCustom);
  const lista = [...CATEGORIAS, ...extras];
  return tipo ? lista.filter((c) => c.tipo === tipo) : lista;
}

export function categoriaPorId(
  id: string | undefined,
  custom?: Array<Categoria | null | undefined>,
): Categoria | undefined {
  if (!id) return undefined;
  return (custom ?? []).find((c) => c?.id === id) ?? CATEGORIAS.find((c) => c.id === id);
}

export function validarCategoria(p: {
  nome: string;
  icone: string;
  tipo: "despesa" | "receita";
}): string | null {
  if (!p.nome.trim()) return "Dê um nome para a categoria.";
  if (!(ICONES_CATEGORIA as readonly string[]).includes(p.icone)) return "Escolha um ícone.";
  switch (p.tipo) {
    case "despesa":
    case "receita":
      return null;
    default: {
      const _nunca: never = p.tipo;
      return `tipo inválido: ${_nunca}`;
    }
  }
}
