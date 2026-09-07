import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const aqui = dirname(fileURLToPath(import.meta.url));
const tokens = readFileSync(join(aqui, "tokens.css"), "utf8");
const globals = readFileSync(join(aqui, "../app/globals.css"), "utf8");

describe("toque — tokens e reduced-motion", () => {
  it("define press curto sem bounce", () => {
    expect(tokens).toMatch(/--press-ms:\s*16\dms/);
    expect(tokens).toMatch(/--press-scale:\s*0\.98/);
    expect(tokens).toMatch(/--press-opacidade:/);
  });

  it("o shell wide usa o painel, não um telefone no meio", () => {
    expect(globals).toContain(".casal-shell");
    expect(globals).toContain(".casal-principal");
    expect(globals).toMatch(/max-width:\s*1600px/);
    // 560 só abaixo de lg — não vaza como coluna fantasma no desktop
    expect(globals).toMatch(/@media \(max-width:\s*1023px\)/);
    expect(globals).toContain(".casal-paineis");
    expect(globals).toContain(".casal-painel");
    expect(globals).toContain(".casal-linha-mes");
    expect(globals).toContain(".casal-resumo-mes");
  });

  it("define classes de polish: spinner, esqueleto, folha, vazio", () => {
    expect(globals).toContain(".casal-spinner");
    expect(globals).toContain(".casal-esqueleto");
    expect(globals).toContain(".casal-folha-fundo");
    expect(globals).toContain(".casal-folha-caixa");
    expect(globals).toContain(".casal-vazio");
  });

  it("desliga o scale quando pede menos movimento", () => {
    expect(globals).toContain(".casal-toque");
    expect(globals).toContain("prefers-reduced-motion");
    expect(globals).toContain("transform: none");
  });
});
