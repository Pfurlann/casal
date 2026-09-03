import { describe, expect, it } from "vitest";
import { traduzirErroAuth } from "./login-erros";

describe("traduzirErroAuth", () => {
  it("traduz falha de rede", () => {
    expect(traduzirErroAuth("Failed to fetch")).toBe(
      "Sem conexão com o servidor. Confira a internet e tente de novo.",
    );
  });

  it("traduz login inválido", () => {
    expect(traduzirErroAuth("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });

  it("explica passkey desligada pelo código da API", () => {
    expect(traduzirErroAuth("Passkeys are disabled", "passkey_disabled")).toMatch(
      /Passkeys não estão ligadas neste projeto/i,
    );
  });

  it("explica passkey desligada pela mensagem crua", () => {
    expect(traduzirErroAuth("404: Passkeys are disabled")).toMatch(/Authentication → Passkeys/);
  });

  it("não engole erro desconhecido de WebAuthn", () => {
    expect(traduzirErroAuth("webauthn_verification_failed")).toBe("webauthn_verification_failed");
  });

  it("pede para abrir o domínio certo", () => {
    expect(traduzirErroAuth("The relying party ID is not valid for this origin")).toMatch(
      /casal-liard\.vercel\.app/,
    );
  });
});
