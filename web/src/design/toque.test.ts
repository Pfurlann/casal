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
    expect(globals).toMatch(/max-width:\s*880px/);
    expect(globals).toMatch(/max-width:\s*1280px/);
  });

  it("desliga o scale quando pede menos movimento", () => {
    expect(globals).toContain(".casal-toque");
    expect(globals).toContain("prefers-reduced-motion");
    expect(globals).toContain("transform: none");
  });
});
