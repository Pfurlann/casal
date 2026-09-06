import { describe, expect, it } from "vitest";
import { tipoLancarDaQuery } from "./lancarTipo";

describe("tipoLancarDaQuery", () => {
  it("mapeia gasto/despesa/receita e ignora lixo", () => {
    expect(tipoLancarDaQuery("gasto")).toBe("despesa");
    expect(tipoLancarDaQuery("despesa")).toBe("despesa");
    expect(tipoLancarDaQuery("receita")).toBe("receita");
    expect(tipoLancarDaQuery(undefined)).toBeUndefined();
    expect(tipoLancarDaQuery("x")).toBeUndefined();
  });
});
