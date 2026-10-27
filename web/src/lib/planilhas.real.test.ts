import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { montarDfcl } from "./dfcl";
import { parsearMetas, parsearRealizados } from "./planilhas";

// Aceite com os dados reais. Só roda onde web/importacao/dados.json existe (nunca no git).
const arquivo = join(process.cwd(), "importacao", "dados.json");

describe.skipIf(!existsSync(arquivo))("planilhas reais", () => {
  const dados = existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, "utf8")) : null;

  it("lê todas as linhas e monta o DFCL de outubro de 2026", () => {
    const { metas, contas, avisos: avisosMetas } = parsearMetas(dados.metas, dados.config);
    const { lancs, avisos } = parsearRealizados(dados.realizados, contas);
    console.log("AVISOS METAS:\n" + avisosMetas.join("\n"));
    console.log("AVISOS REALIZADOS:\n" + avisos.join("\n"));

    expect(lancs).toHaveLength(191);
    expect(metas).toHaveLength(322);

    const r = montarDfcl({
      competencias: ["2026-10"],
      contas,
      metas,
      lancs: lancs,
      saldoInicial: 0,
    });
    const saidas = r.linhas.find((l) => l.rotulo === "2. Saídas")!;
    console.log("Saídas out/26 prev:", saidas.prev, "real:", saidas.real);
    expect(saidas.prev[0]).toBeGreaterThan(0);
  });
});
