import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ACCEPT_ARQUIVO_OFX } from "@/lib/ofx";
import { FIXTURE_CONTA_OFX } from "@/lib/ofx-fixture";
import { ImportarOfxConta } from "./ImportarOfxConta";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar, back: vi.fn() }),
}));

const importar = vi.hoisted(() => ({ fn: vi.fn() }));
const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CONTA = {
  id: "cta1",
  carteiraID: "c1",
  nome: "Nubank",
  tipo: "corrente" as const,
  saldoInicial: 100000,
  arquivada: false,
};

function montar(extra: Record<string, unknown> = {}) {
  importar.fn.mockReset();
  importar.fn.mockResolvedValue({ importados: 4, repetidos: 0 });
  empurrar.mockClear();
  loja.valor = {
    carteira: { id: "c1", nome: "Nosso" },
    contas: [CONTA],
    contasTodas: [CONTA],
    categorias: [],
    transacoes: extra.transacoes ?? [],
    importarOfxConta: importar.fn,
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <ImportarOfxConta contaId="cta1" />
    </ProvedorAviso>,
  );
}

async function enviarFixture() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([FIXTURE_CONTA_OFX], "extrato.ofx", { type: "application/x-ofx" });
  await userEvent.upload(input, file);
  await screen.findByRole("button", { name: /Lançar \d+ na conta/ });
}

describe("ImportarOfxConta", () => {
  it("abre o picker sem filtrar .ofx", () => {
    montar();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe(ACCEPT_ARQUIVO_OFX);
    expect(input.hasAttribute("accept")).toBe(false);
  });

  it("revisa débitos e créditos e importa liquidados na conta", async () => {
    montar();
    await enviarFixture();
    expect(screen.getAllByText(/IFOOD/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SALARIO/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/crédito/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /Lançar 4 na conta/ }));
    expect(importar.fn).toHaveBeenCalledTimes(1);
    const arg = importar.fn.mock.calls[0]?.[0] as {
      contaID: string;
      linhas: { hashDedup: string; tipo?: string }[];
    };
    expect(arg.contaID).toBe("cta1");
    expect(arg.linhas).toHaveLength(4);
    expect(arg.linhas.some((l) => l.hashDedup === "ofx|cta1|CTA-IFOOD-1")).toBe(true);
    expect(arg.linhas.some((l) => l.tipo === "credito")).toBe(true);
    expect(empurrar).toHaveBeenCalled();
  });

  it("desmarca o que já está na conta", async () => {
    montar({
      transacoes: [
        {
          id: "ja",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 8990,
          data: "2026-08-12T12:00:00.000Z",
          descricao: "IFOOD",
          contaID: "cta1",
          hashDedup: "ofx|cta1|CTA-IFOOD-1",
          status: "liquidado",
        },
      ],
    });
    await enviarFixture();
    expect(screen.getAllByText(/já na conta/).length).toBeGreaterThan(0);
    const check = screen.getByRole("checkbox", { name: /IFOOD/ });
    expect(check).toBeDisabled();
    expect(check).not.toBeChecked();
  });

  it("seleciona todos e aplica data efetiva na importação", async () => {
    montar();
    await enviarFixture();
    const todos = screen.getByRole("checkbox", { name: "Selecionar todos" });
    expect(todos).toBeChecked();
    await userEvent.click(todos);
    expect(screen.getByRole("button", { name: /Lançar 0 na conta/ })).toBeDisabled();
    await userEvent.click(todos);
    fireEvent.change(screen.getByLabelText("Data a aplicar aos selecionados"), {
      target: { value: "2026-09-15" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar data" }));
    expect(screen.getAllByText(/→ efetiva 15\/09\/2026/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /Lançar 4 na conta/ }));
    const arg = importar.fn.mock.calls[0]?.[0] as { linhas: { data: string }[] };
    expect(arg.linhas.every((l) => l.data === "2026-09-15")).toBe(true);
  });

});
