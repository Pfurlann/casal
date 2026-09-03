import { describe, expect, it } from "vitest";
import { traduzirErroAuth } from "./auth";

describe("traduzirErroAuth", () => {
  it("traduz falha de rede", () => {
    expect(traduzirErroAuth("Failed to fetch")).toBe(
      "Sem conexão com o servidor. Confira a internet e tente de novo.",
    );
  });

  it("traduz login inválido", () => {
    expect(traduzirErroAuth("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });

  it("não deixa passkey desligada em silêncio", () => {
    expect(traduzirErroAuth("passkey_disabled")).toMatch(/e-mail e senha/i);
  });
});
