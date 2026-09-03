import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHAVE_EMAIL,
  apagarEmailLembrado,
  avisoOrigemPasskey,
  biometriaDoAparelhoDisponivel,
  gravarEmailLembrado,
  guardarSenhaNoAparelho,
  lerEmailLembrado,
  rotuloBiometria,
  textoBotaoBiometria,
  validarLogin,
} from "./login-aparelho";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("validarLogin", () => {
  it("pede e-mail com arroba", () => {
    expect(validarLogin("eu", "123456")).toBe("Informe um e-mail válido.");
  });

  it("pede senha de 6 caracteres", () => {
    expect(validarLogin("eu@casa.br", "12345")).toBe("A senha precisa ter pelo menos 6 caracteres.");
  });

  it("aceita credencial mínima", () => {
    expect(validarLogin("eu@casa.br", "123456")).toBeNull();
  });
});

describe("e-mail lembrado", () => {
  it("grava, lê e apaga", () => {
    gravarEmailLembrado("  eu@casa.br ");
    expect(localStorage.getItem(CHAVE_EMAIL)).toBe("eu@casa.br");
    expect(lerEmailLembrado()).toBe("eu@casa.br");
    apagarEmailLembrado();
    expect(lerEmailLembrado()).toBe("");
  });
});

describe("avisoOrigemPasskey", () => {
  it("aceita o domínio de produção e o localhost", () => {
    expect(avisoOrigemPasskey("casal-liard.vercel.app")).toBeNull();
    expect(avisoOrigemPasskey("localhost")).toBeNull();
  });

  it("recusa preview de outro host", () => {
    expect(avisoOrigemPasskey("casal-4o9a4vi8a-pedrohcfurlan98-6470s-projects.vercel.app")).toMatch(
      /casal-liard\.vercel\.app/,
    );
  });
});

describe("rótulo da biometria", () => {
  it("usa Face ID no iPhone", () => {
    expect(rotuloBiometria("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("Face ID");
    expect(textoBotaoBiometria("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(
      "Entrar com Face ID",
    );
  });

  it("usa Windows Hello no Windows", () => {
    expect(rotuloBiometria("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows Hello");
  });
});

describe("biometriaDoAparelhoDisponivel", () => {
  it("fica falsa sem PublicKeyCredential", async () => {
    vi.stubGlobal("PublicKeyCredential", undefined);
    expect(await biometriaDoAparelhoDisponivel()).toBe(false);
  });

  it("consulta o autenticador de plataforma", async () => {
    vi.stubGlobal("PublicKeyCredential", {
      isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(true),
    });
    expect(await biometriaDoAparelhoDisponivel()).toBe(true);
  });
});

describe("guardarSenhaNoAparelho", () => {
  it("usa PasswordCredential quando o browser oferece", async () => {
    const store = vi.fn().mockResolvedValue(undefined);
    class FakePasswordCredential {
      id: string;
      password: string;
      constructor(d: { id: string; password: string }) {
        this.id = d.id;
        this.password = d.password;
      }
    }
    vi.stubGlobal("PasswordCredential", FakePasswordCredential);
    vi.stubGlobal("navigator", { ...navigator, credentials: { store } });
    await guardarSenhaNoAparelho("eu@casa.br", "segredo");
    expect(store).toHaveBeenCalledTimes(1);
    expect(store.mock.calls[0][0]).toMatchObject({ id: "eu@casa.br", password: "segredo" });
  });
});
