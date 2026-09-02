import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditarLancamento } from "./EditarLancamento";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
const voltar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar, back: voltar }),
}));

const editar = vi.hoisted(() => ({ fn: vi.fn() }));
const apagar = vi.hoisted(() => ({ fn: vi.fn() }));
const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const AVISTA = {
  id: "t1",
  carteiraID: "c1",
  tipo: "despesa",
  valor: 21490,
  data: new Date().toISOString(),
  categoriaID: "00000000-0000-0000-0000-000000000001",
  descricao: "Mercado",
  hashDedup: "",
  parcelaN: 1,
  parcelaTotal: 1,
  cartaoID: undefined as string | undefined,
};

const PARCELA = {
  ...AVISTA,
  id: "p2",
  valor: 3333,
  descricao: "Sofá",
  cartaoID: "k1",
  grupoParcela: "g1",
  parcelaN: 2,
  parcelaTotal: 3,
};

const CARTAO = {
  id: "k1",
  banco: "Nubank",
  ultimos4: "1234",
};

function montar(tx = AVISTA) {
  empurrar.mockClear();
  voltar.mockClear();
  editar.fn.mockClear();
  apagar.fn.mockClear();
  loja.valor = {
    transacoes: [tx],
    cartoes: tx.cartaoID ? [CARTAO] : [],
    editar: editar.fn,
    apagar: apagar.fn,
  };
  return render(
    <ProvedorAviso>
      <EditarLancamento id={tx.id} />
    </ProvedorAviso>,
  );
}

describe("EditarLancamento", () => {
  it("grava descrição, categoria e valor de um lançamento à vista", async () => {
    montar();
    await userEvent.clear(screen.getByLabelText("Onde foi o gasto"));
    await userEvent.type(screen.getByLabelText("Onde foi o gasto"), "Padaria");
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(editar.fn).toHaveBeenCalledWith({
      id: "t1",
      descricao: "Padaria",
      categoriaID: "00000000-0000-0000-0000-000000000002",
      valor: 21490,
    });
  });

  it("mostra Apagar no cabeçalho sem abrir o teclado", () => {
    montar();
    expect(screen.getByRole("button", { name: "Apagar lançamento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apagar último dígito" })).toBeNull();
  });

  it("abre o teclado só depois de tocar no valor", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Editar valor" }));
    expect(screen.getByRole("button", { name: "Apagar último dígito" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apagar lançamento" })).toBeInTheDocument();
  });

  it("em grupo, não oferece teclado e avisa que o valor não muda uma a uma", () => {
    montar(PARCELA);
    expect(screen.getByText(/valor das parcelas não muda/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar valor" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Apagar último dígito" })).toBeNull();
    expect(screen.getByText(/Nubank · final 1234/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apagar lançamento" })).toBeInTheDocument();
  });

  it("salva só descrição e categoria da parcela tocada", async () => {
    montar(PARCELA);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(editar.fn).toHaveBeenCalledWith({
      id: "p2",
      descricao: "Sofá",
      categoriaID: "00000000-0000-0000-0000-000000000001",
      valor: undefined,
    });
  });

  it("pede confirmação e apaga um lançamento à vista", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Apagar lançamento" }));
    expect(screen.getByRole("alertdialog", { name: "Apagar lançamento?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Apagar" }));
    expect(apagar.fn).toHaveBeenCalledWith({ id: "t1", grupo: false });
  });

  it("no grupo, oferece apagar só a parcela ou o parcelamento inteiro", async () => {
    montar(PARCELA);
    await userEvent.click(screen.getByRole("button", { name: "Apagar lançamento" }));
    await userEvent.click(screen.getByRole("button", { name: "Parcelamento inteiro" }));
    expect(apagar.fn).toHaveBeenCalledWith({ id: "p2", grupo: true });
  });

  it("avisa quando a gravação falha", async () => {
    montar();
    editar.fn.mockRejectedValueOnce(new Error("rede"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText(/Não deu para salvar/)).toBeInTheDocument();
  });
});
