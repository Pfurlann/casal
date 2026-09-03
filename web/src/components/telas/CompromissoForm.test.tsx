import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompromissoForm } from "./CompromissoForm";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empurrar }) }));

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CONTA = {
  id: "a1",
  carteiraID: "w1",
  nome: "Corrente",
  tipo: "corrente" as const,
  saldoInicial: 100_000,
  arquivada: false,
};

const COMPROMISSO = {
  id: "c1",
  carteiraID: "w1",
  nome: "Conta de luz",
  valor: 18_090,
  venceEm: "2026-09-12",
  categoriaID: "00000000-0000-0000-0000-000000000005",
  transacaoID: "t1",
  status: "a_pagar" as const,
};

function montar(extra: Record<string, unknown> = {}, id?: string) {
  empurrar.mockClear();
  loja.valor = {
    carteira: { id: "w1", nome: "Nosso" },
    compromissos: extra.compromissos ?? [],
    categorias: [],
    contas: [CONTA],
    contasTodas: [CONTA],
    cartoes: [],
    cartoesTodos: [],
    metas: [],
    usuarioID: "u1",
    salvarCompromisso: vi.fn().mockResolvedValue(undefined),
    apagarCompromisso: vi.fn().mockResolvedValue(undefined),
    liquidarCompromisso: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <CompromissoForm id={id} />
    </ProvedorAviso>,
  );
}

describe("CompromissoForm", () => {
  it("cadastra o compromisso com valor e vencimento, sem pedir origem", async () => {
    const salvar = vi.fn().mockResolvedValue(undefined);
    montar({ salvarCompromisso: salvar });
    await userEvent.type(screen.getByLabelText("Nome"), "Conta de luz");
    await userEvent.click(screen.getByRole("button", { name: "1" }));
    await userEvent.click(screen.getByRole("button", { name: "8" }));
    await userEvent.click(screen.getByRole("button", { name: "0" }));
    await userEvent.click(screen.getByRole("button", { name: "9" }));
    await userEvent.click(screen.getByRole("button", { name: "0" }));
    expect(screen.queryByLabelText("Forma de pagamento")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Conta de luz",
        valor: 18_090,
        status: "a_pagar",
        carteiraID: "w1",
      }),
    );
  });

  it("na liquidação só pede a origem e não o valor", async () => {
    const liquidar = vi.fn().mockResolvedValue(undefined);
    montar({ compromissos: [COMPROMISSO], liquidarCompromisso: liquidar }, COMPROMISSO.id);
    expect(screen.getByRole("heading", { name: "liquidar" })).toBeInTheDocument();
    expect(screen.getByText("Conta de luz")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    expect(screen.getByText(/não pede de novo/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `conta:${CONTA.id}`);
    await userEvent.click(screen.getByRole("button", { name: /Liquidar/ }));
    expect(liquidar).toHaveBeenCalledWith({
      id: "c1",
      contaID: CONTA.id,
      cartaoID: undefined,
      metaID: undefined,
    });
    expect(liquidar.mock.calls[0][0].valor).toBeUndefined();
  });
});
