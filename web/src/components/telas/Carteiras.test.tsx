import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Carteiras, formatarCodigoConvite } from "./Carteiras";
import { ProvedorAviso } from "../ui/Aviso";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
const auth = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});
vi.mock("@/lib/auth", async (original) => {
  const real = await original<typeof import("@/lib/auth")>();
  return { ...real, useAuth: () => auth.valor };
});

const CONJUNTA = {
  id: "w1",
  nome: "Nosso",
  cor: "#000000",
  rotulo: "compartilhada",
  visibilidade: "aberta",
};

function montar(extra: Record<string, unknown> = {}) {
  auth.valor = { usuario: { id: "u1", email: "eu@casa.br" } };
  loja.valor = {
    carteira: CONJUNTA,
    carteiras: [{ ...CONJUNTA, membrosN: 2 }],
    membros: [
      { userId: "u1", email: "eu@casa.br", papel: "dono" },
      { userId: "u2", email: "voce@casa.br", papel: "membro" },
    ],
    convite: null,
    remoto: true,
    criarConvite: vi.fn().mockResolvedValue(null),
    aceitarConvite: vi.fn().mockResolvedValue(null),
    selecionarCarteira: vi.fn(),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <Carteiras />
    </ProvedorAviso>,
  );
}

describe("formatarCodigoConvite", () => {
  it("agrupa em três mais três", () => {
    expect(formatarCodigoConvite("abcdef")).toBe("ABC-DEF");
  });

  it("devolve o que recebeu quando não tem seis caracteres", () => {
    expect(formatarCodigoConvite("abc")).toBe("ABC");
  });
});

describe("Carteiras", () => {
  it("lista quem está na carteira, marcando você", () => {
    montar();
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByText("voce@casa.br")).toBeInTheDocument();
  });

  it("oferece gerar convite para o dono de carteira conjunta", () => {
    montar();
    expect(screen.getByRole("button", { name: /Gerar convite/ })).toBeEnabled();
  });

  it("mostra o código com prazo quando já existe convite", () => {
    montar({ convite: { codigo: "ABCDEF", expiraEm: "2026-09-30T00:00:00.000Z" } });
    expect(screen.getByText("ABC-DEF")).toBeInTheDocument();
  });

  it("não oferece convite em carteira pessoal", () => {
    const pessoal = { ...CONJUNTA, rotulo: "pessoal", visibilidade: "fechada" };
    montar({ carteira: pessoal, carteiras: [{ ...pessoal, membrosN: 1 }] });
    expect(screen.queryByRole("button", { name: /Gerar convite/ })).toBeNull();
    expect(screen.getByText(/não aceita convite/)).toBeInTheDocument();
  });

  it("avisa a falha ao aceitar código, em vez de engolir", async () => {
    montar({ aceitarConvite: vi.fn().mockResolvedValue("Código inválido ou já usado.") });
    await userEvent.type(screen.getByLabelText(/código/i), "ABCDEF");
    await userEvent.click(screen.getByRole("button", { name: /Entrar na carteira/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Código inválido/);
  });
});
