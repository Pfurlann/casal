import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ACCEPT_ARQUIVO_OFX } from "@/lib/ofx";
import { FIXTURE_FATURA_OFX, FIXTURE_NANQUIM_OFX, FIXTURE_PARCELA_OFX } from "@/lib/ofx-fixture";
import { ImportarOfx } from "./ImportarOfx";
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

const CARTAO = {
  id: "k1",
  carteiraID: "c1",
  apelido: "Roxinho",
  banco: "Nubank",
  ultimos4: "1234",
  bandeira: "mastercard" as const,
  cor: "grafite",
  limite: 500000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

const PET = {
  id: "cat-pet",
  nome: "Pet",
  icone: "outros",
  cor: "grafite",
  tipo: "despesa" as const,
  carteiraID: "c1",
};

function montar(extra: Record<string, unknown> = {}) {
  importar.fn.mockReset();
  importar.fn.mockResolvedValue({ importados: 3, repetidos: 0 });
  empurrar.mockClear();
  loja.valor = {
    carteira: { id: "c1", nome: "Nosso" },
    cartoes: [CARTAO],
    categorias: [PET],
    transacoes: extra.transacoes ?? [],
    importarOfx: importar.fn,
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <ImportarOfx cartaoId="k1" />
    </ProvedorAviso>,
  );
}

async function enviarFixture() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([FIXTURE_FATURA_OFX], "fatura.ofx", { type: "application/x-ofx" });
  await userEvent.upload(input, file);
  await screen.findByRole("button", { name: /Lançar \d+ gasto/ });
}

describe("ImportarOfx", () => {
  it("abre o picker sem filtrar .ofx e sem câmera", () => {
    montar();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe(ACCEPT_ARQUIVO_OFX);
    expect(input.hasAttribute("accept")).toBe(false);
    expect(input.hasAttribute("capture")).toBe(false);
    expect(input.closest("label")?.className).toMatch(/min-h-\[44px\]/);
  });

  it("aceita OFX sem extensão e recusa foto", async () => {
    montar();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(
      input,
      new File([FIXTURE_FATURA_OFX], "documento", { type: "application/octet-stream" }),
    );
    expect(await screen.findByText("IFOOD *PIZZA NAPOLI")).toBeInTheDocument();
    await userEvent.upload(
      input,
      new File(["JFIF"], "IMG_001.JPG", { type: "image/jpeg" }),
    );
    expect(await screen.findByText(/não parece um arquivo OFX/)).toBeInTheDocument();
  });

  it("lista os gastos da fixture com categoria sugerida", async () => {
    montar();
    await enviarFixture();
    expect(screen.getByText("IFOOD *PIZZA NAPOLI")).toBeInTheDocument();
    expect(screen.getByText("POSTO SHELL CENTRO")).toBeInTheDocument();
    expect(screen.getByText("LOJA GENERICA XYZ")).toBeInTheDocument();
    expect(screen.getByText("PAGAMENTO RECEBIDO")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Lançar IFOOD *PIZZA NAPOLI" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lançar PAGAMENTO RECEBIDO" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /Lançar 3 gastos/ })).toBeEnabled();
  });

  it("mostra compras CREDIT do cartão BR e deixa ajuste/pagamento desmarcados", async () => {
    montar();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(
      input,
      new File([FIXTURE_NANQUIM_OFX], "nanquim.ofx", { type: "application/x-ofx" }),
    );
    expect(await screen.findByText("BARBEARIADOKEL VIN")).toBeInTheDocument();
    expect(screen.getByText("AGENOR LOGISTICA")).toBeInTheDocument();
    expect(screen.getByText("AJUSTE CRED PARC S JUROS")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Lançar BARBEARIADOKEL VIN" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lançar AJUSTE CRED PARC S JUROS" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lançar PAGAMENTO RECEBIDO" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /Lançar 4 gastos/ })).toBeEnabled();
  });

  it("salva as categorias escolhidas na carteira atual", async () => {
    montar();
    await enviarFixture();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Categoria de LOJA GENERICA XYZ" }),
      "Pet",
    );
    await userEvent.click(screen.getByRole("button", { name: /Lançar 3 gastos/ }));
    expect(importar.fn).toHaveBeenCalledTimes(1);
    const arg = importar.fn.mock.calls[0]?.[0] as {
      cartaoID: string;
      linhas: { descricao: string; categoriaID: string; valor: number }[];
    };
    expect(arg.cartaoID).toBe("k1");
    expect(arg.linhas).toHaveLength(3);
    expect(arg.linhas.map((l) => [l.descricao, l.categoriaID, l.valor])).toEqual([
      ["IFOOD *PIZZA NAPOLI", "00000000-0000-0000-0000-000000000002", 4590],
      ["POSTO SHELL CENTRO", "00000000-0000-0000-0000-000000000003", 12000],
      ["LOJA GENERICA XYZ", "cat-pet", 3250],
    ]);
    expect(empurrar).toHaveBeenCalledWith("/cartoes/k1");
  });

  it("não relança linha já importada pelo FITID", async () => {
    montar({
      transacoes: [
        {
          id: "ja",
          hashDedup: "ofx|k1|FIT-IFOOD-1",
        },
      ],
    });
    await enviarFixture();
    expect(screen.getByText(/1 já na fatura/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lançar 2 gastos/ })).toBeEnabled();
  });

  it("mostra parcela 3/12 e lança o grupo com a categoria escolhida", async () => {
    montar();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(
      input,
      new File([FIXTURE_PARCELA_OFX], "parcela.ofx", { type: "application/x-ofx" }),
    );
    expect(await screen.findByText(/parcela 3\/12 · lança 10 restantes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lançar 10 gastos/ })).toBeEnabled();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Categoria de MAGAZINE LUIZA/ }),
      "Pet",
    );
    await userEvent.click(screen.getByRole("button", { name: /Lançar 10 gastos/ }));
    const arg = importar.fn.mock.calls[0]?.[0] as {
      linhas: { categoriaID: string; parcelaN: number; parcelaTotal: number }[];
    };
    expect(arg.linhas).toHaveLength(1);
    expect(arg.linhas[0]).toMatchObject({
      categoriaID: "cat-pet",
      parcelaN: 3,
      parcelaTotal: 12,
    });
  });
});
