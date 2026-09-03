import { describe, expect, it } from "vitest";
import {
  categoriaPorId,
  categoriasVisiveis,
  eCategoriaSistema,
  validarCategoria,
} from "./categorias";
import type { Categoria } from "./domain";

const PET: Categoria = {
  id: "cat-pet",
  nome: "Pet",
  icone: "outros",
  cor: "grafite",
  tipo: "despesa",
  carteiraID: "w1",
};

const MESADA: Categoria = {
  id: "cat-mesada",
  nome: "Mesada",
  icone: "salario",
  cor: "grafite",
  tipo: "receita",
  carteiraID: "w1",
};

describe("categoriasVisiveis", () => {
  it("junta padrão e custom da carteira, filtrando por tipo", () => {
    const despesas = categoriasVisiveis([PET, MESADA], "despesa");
    expect(despesas.some((c) => c.nome === "Mercado")).toBe(true);
    expect(despesas.some((c) => c.id === "cat-pet")).toBe(true);
    expect(despesas.some((c) => c.id === "cat-mesada")).toBe(false);

    const receitas = categoriasVisiveis([PET, MESADA], "receita");
    expect(receitas.some((c) => c.nome === "Salário")).toBe(true);
    expect(receitas.some((c) => c.id === "cat-mesada")).toBe(true);
    expect(receitas.some((c) => c.id === "cat-pet")).toBe(false);
  });

  it("ignora custom sem carteira (não promove seed a editável)", () => {
    const sombra: Categoria = { ...PET, carteiraID: undefined };
    expect(categoriasVisiveis([sombra], "despesa").some((c) => c.id === "cat-pet")).toBe(false);
  });
});

describe("categoriaPorId / eCategoriaSistema", () => {
  it("acha custom e padrão, e protege o id de sistema", () => {
    expect(categoriaPorId(PET.id, [PET])?.nome).toBe("Pet");
    expect(categoriaPorId("00000000-0000-0000-0000-000000000013")?.nome).toBe("Salário");
    expect(eCategoriaSistema("00000000-0000-0000-0000-000000000001")).toBe(true);
    expect(eCategoriaSistema("cat-pet")).toBe(false);
  });
});

describe("validarCategoria", () => {
  it("exige nome, ícone do set e tipo", () => {
    expect(validarCategoria({ nome: "", icone: "outros", tipo: "despesa" })).toMatch(/nome/);
    expect(validarCategoria({ nome: "Pet", icone: "dragao", tipo: "despesa" })).toMatch(/ícone/);
    expect(validarCategoria({ nome: "Pet", icone: "outros", tipo: "despesa" })).toBeNull();
    expect(validarCategoria({ nome: "Mesada", icone: "salario", tipo: "receita" })).toBeNull();
  });
});
