import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CORES_CARTAO } from "@/lib/domain";
import { CarteiraForm } from "./CarteiraForm";
import { ProvedorAviso } from "../ui/Aviso";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
const empurrar = vi.fn();
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar }),
}));

const CARTEIRA = {
  id: "w1",
  nome: "Nosso",
  cor: CORES_CARTAO[0],
  rotulo: "compartilhada" as const,
  visibilidade: "aberta" as const,
  membrosN: 1,
  souDono: true,
};

function montar(id?: string, extra: Record<string, unknown> = {}) {
  loja.valor = {
    carteiras: [CARTEIRA],
    criarCarteira: vi.fn().mockResolvedValue(null),
    salvarCarteira: vi.fn().mockResolvedValue(null),
    apagarCarteira: vi.fn().mockResolvedValue(null),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <CarteiraForm id={id} />
    </ProvedorAviso>,
  );
}

describe("CarteiraForm", () => {
  it("cria carteira com nome, tipo e cor", async () => {
    const criarCarteira = vi.fn().mockResolvedValue(null);
    montar(undefined, { criarCarteira });
    await userEvent.type(screen.getByLabelText("Nome"), "Meu");
    await userEvent.click(screen.getByRole("button", { name: "Criar carteira" }));
    expect(criarCarteira).toHaveBeenCalledWith({
      nome: "Meu",
      rotulo: "pessoal",
      cor: CARTEIRA.cor,
      visibilidade: "fechada",
    });
  });

  it("salva nome, tipo e cor quando o dono edita", async () => {
    const salvarCarteira = vi.fn().mockResolvedValue(null);
    montar("w1", { salvarCarteira });
    const nome = screen.getByLabelText("Nome");
    await userEvent.clear(nome);
    await userEvent.type(nome, "Casa");
    await userEvent.click(screen.getByRole("button", { name: "Pessoal" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar carteira" }));
    expect(salvarCarteira).toHaveBeenCalledWith({
      id: "w1",
      nome: "Casa",
      rotulo: "pessoal",
      cor: CARTEIRA.cor,
      visibilidade: "fechada",
    });
  });

  it("pede confirmação antes de apagar", async () => {
    const apagarCarteira = vi.fn().mockResolvedValue(null);
    montar("w1", { apagarCarteira });
    await userEvent.click(screen.getByRole("button", { name: "Apagar carteira" }));
    expect(apagarCarteira).not.toHaveBeenCalled();
    expect(screen.getByText("Apagar carteira?")).toBeInTheDocument();
    expect(screen.getByText(/saem da vista/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Apagar" }));
    expect(apagarCarteira).toHaveBeenCalledWith("w1");
  });

  it("não deixa membro editar nem apagar", () => {
    montar("w1", { carteiras: [{ ...CARTEIRA, souDono: false }] });
    expect(screen.getByText(/Só quem criou a carteira/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar carteira" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Apagar carteira" })).toBeNull();
  });
});
