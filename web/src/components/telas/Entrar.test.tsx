import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CHAVE_EMAIL } from "@/lib/login-aparelho";
import { Entrar } from "./Entrar";

const entrar = vi.fn().mockResolvedValue(null);
const criarConta = vi.fn().mockResolvedValue(null);
const entrarComPasskey = vi.fn().mockResolvedValue(null);
const registrarPasskey = vi.fn().mockResolvedValue(null);
const replace = vi.fn();

vi.mock("@/lib/auth", async (original) => {
  const real = await original<typeof import("@/lib/auth")>();
  return {
    ...real,
    useAuth: () => ({
      entrar,
      criarConta,
      entrarComPasskey,
      registrarPasskey,
      pronto: true,
      sessao: null,
      usuario: null,
    }),
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("Entrar", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-auth");
    document.documentElement.removeAttribute("data-tema");
    localStorage.clear();
    vi.unstubAllGlobals();
    entrar.mockReset().mockResolvedValue(null);
    criarConta.mockReset().mockResolvedValue(null);
    entrarComPasskey.mockReset().mockResolvedValue(null);
    registrarPasskey.mockReset().mockResolvedValue(null);
    replace.mockReset();
  });

  it("mostra a assinatura da marca", () => {
    render(<Entrar />);
    expect(screen.getByRole("img", { name: "casal" })).toBeInTheDocument();
  });

  it("no desktop o formulário usa card estreito centralizado, não painel largo", () => {
    const { container } = render(<Entrar />);
    const shell = container.firstElementChild;
    expect(shell?.className).toContain("min-h-dvh");
    expect(shell?.className).toContain("items-center");
    expect(shell?.className).toContain("justify-center");
    const painel = shell?.firstElementChild;
    expect(painel?.className).toContain("mx-auto");
    expect(painel?.className).toContain("max-w-[430px]");
    expect(painel?.className).toContain("lg:max-w-[440px]");
    expect(painel?.className).not.toContain("lg:max-w-[1120px]");
    expect(painel?.className).not.toContain("lg:my-10");
  });

  it("explica e-mail inválido ao clicar em Entrar", async () => {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu");
    await userEvent.type(screen.getByLabelText("Senha"), "seissseis");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(entrar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um e-mail válido.");
  });

  it("explica senha curta ao clicar em Entrar", async () => {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "12345");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(entrar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("A senha precisa ter pelo menos 6 caracteres.");
  });

  it("clicar em Entrar chama o login e vai ao mês", async () => {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(entrar).toHaveBeenCalledWith("eu@casa.br", "123456");
    expect(replace).toHaveBeenCalledWith("/mes");
  });

  it("alterna para criar conta e chama o outro caminho", async () => {
    render(<Entrar />);
    await userEvent.click(screen.getByRole("button", { name: /Não tem conta/ }));
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(criarConta).toHaveBeenCalledWith("eu@casa.br", "123456");
    expect(replace).toHaveBeenCalledWith("/mes");
  });

  it("mostra a falha devolvida pela autenticação", async () => {
    entrar.mockResolvedValueOnce("E-mail ou senha incorretos.");
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("mostra aviso visível se a rede ou o Supabase falhar", async () => {
    entrar.mockResolvedValueOnce("Sem conexão com o servidor. Confira a internet e tente de novo.");
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
  });

  it("não mostra biometria sem WebAuthn", () => {
    vi.stubGlobal("PublicKeyCredential", undefined);
    render(<Entrar />);
    expect(screen.queryByRole("button", { name: /Entrar com / })).toBeNull();
  });

  it("mostra o erro real se Ativar Face ID falhar", async () => {
    vi.stubGlobal("PublicKeyCredential", {
      isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(true),
    });
    registrarPasskey.mockResolvedValueOnce(
      "Passkeys não estão ligadas neste projeto. No Supabase: Authentication → Passkeys, ligue com o domínio casal-liard.vercel.app. Enquanto isso, entre com e-mail e senha.",
    );
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    const ativar = await screen.findByRole("button", { name: /Ativar / });
    await userEvent.click(ativar);
    expect(registrarPasskey).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("alert")).toHaveTextContent("Passkeys não estão ligadas neste projeto");
    expect(replace).not.toHaveBeenCalledWith("/mes");
  });

  it("mostra o botão biométrico só quando o aparelho oferece", async () => {
    vi.stubGlobal("PublicKeyCredential", {
      isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(true),
    });
    render(<Entrar />);
    const bio = await screen.findByRole("button", { name: /Entrar com / });
    expect(bio).toBeInTheDocument();
    await userEvent.click(bio);
    expect(entrarComPasskey).toHaveBeenCalledTimes(1);
  });

  it("lembra o e-mail depois de salvar o login", async () => {
    const { unmount } = render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    expect(screen.getByLabelText("Salvar login neste aparelho")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(localStorage.getItem(CHAVE_EMAIL)).toBe("eu@casa.br");
    unmount();
    render(<Entrar />);
    expect(await screen.findByLabelText("E-mail")).toHaveValue("eu@casa.br");
  });

  it("força o tema claro mesmo com escuro persistido", () => {
    localStorage.setItem("casal-tema", "escuro");
    document.documentElement.setAttribute("data-tema", "escuro");
    const { unmount } = render(<Entrar />);
    expect(document.documentElement.hasAttribute("data-auth")).toBe(true);
    expect(screen.getByRole("button", { name: "Não tem conta? Criar" })).toBeInTheDocument();
    unmount();
    expect(document.documentElement.hasAttribute("data-auth")).toBe(false);
  });
});
