import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Entrar } from "./Entrar";

const entrar = vi.fn().mockResolvedValue(null);
const criarConta = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/auth", async (original) => {
  const real = await original<typeof import("@/lib/auth")>();
  return { ...real, useAuth: () => ({ entrar, criarConta }) };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

describe("Entrar", () => {
  it("mostra a assinatura da marca", () => {
    render(<Entrar />);
    expect(screen.getByRole("img", { name: "casal" })).toBeInTheDocument();
  });

  it("bloqueia envio com e-mail sem arroba", async () => {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu");
    await userEvent.type(screen.getByLabelText("Senha"), "seissseis");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("bloqueia envio com senha curta", async () => {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "12345");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("entra com credencial válida", async () => {
    entrar.mockClear();
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(entrar).toHaveBeenCalledWith("eu@casa.br", "123456");
  });

  it("alterna para criar conta e chama o outro caminho", async () => {
    criarConta.mockClear();
    render(<Entrar />);
    await userEvent.click(screen.getByRole("button", { name: /Não tem conta/ }));
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(criarConta).toHaveBeenCalledWith("eu@casa.br", "123456");
  });

  it("mostra a falha devolvida pela autenticação", async () => {
    entrar.mockResolvedValueOnce("E-mail ou senha incorretos.");
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
  });
});
