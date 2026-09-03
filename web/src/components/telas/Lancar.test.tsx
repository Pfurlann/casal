import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dataDeLocalISO, dataLocalISO } from "@/lib/domain";
import { Lancar } from "./Lancar";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empurrar, back: vi.fn() }) }));

const lancar = vi.hoisted(() => ({ fn: vi.fn() }));
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
  ultimos4: "4417",
  bandeira: "mastercard",
  cor: "grafite",
  limite: 500000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

const CONTA = {
  id: "a1",
  carteiraID: "c1",
  nome: "Corrente",
  tipo: "corrente" as const,
  saldoInicial: 0,
  arquivada: false,
};

const MEMBROS = [
  { userId: "u1", email: "eu@casa.br", papel: "dono" as const },
  { userId: "u2", email: "ana@casa.br", papel: "membro" as const },
];

const PET = {
  id: "cat-pet",
  nome: "Pet",
  icone: "outros",
  cor: "grafite",
  tipo: "despesa" as const,
  carteiraID: "c1",
};

function montar(opts?: {
  cartoes?: typeof CARTAO[];
  contas?: typeof CONTA[];
  carteira?: Record<string, unknown>;
  membros?: typeof MEMBROS;
  usuarioID?: string;
  categorias?: typeof PET[];
  salvarCategoria?: (c: unknown) => Promise<void>;
  metas?: Record<string, unknown>[];
  transacoes?: Record<string, unknown>[];
}) {
  empurrar.mockClear();
  loja.valor = {
    carteira: opts?.carteira ?? { id: "c1", nome: "Nosso" },
    cartoes: opts?.cartoes ?? [],
    contas: opts?.contas ?? [CONTA],
    membros: opts?.membros ?? [],
    usuarioID: opts?.usuarioID,
    categorias: opts?.categorias ?? [],
    salvarCategoria: opts?.salvarCategoria ?? vi.fn().mockResolvedValue(undefined),
    metas: opts?.metas ?? [],
    transacoes: opts?.transacoes ?? [],
    lancar: lancar.fn,
  };
  return render(
    <ProvedorAviso>
      <Lancar />
    </ProvedorAviso>,
  );
}

describe("Lancar", () => {
  it("mostra a carteira atual em que o gasto entra", () => {
    montar();
    expect(screen.getByText("em Nosso")).toBeInTheDocument();
  });

  it("começa em zero e não deixa salvar", () => {
    montar();
    expect(screen.getByText(/R\$ 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("monta o valor pelo teclado físico e habilita o salvar", async () => {
    montar();
    await userEvent.keyboard("21490");
    expect(screen.getByText(/214/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("grava o lançamento na conta padrão com a categoria escolhida", async () => {
    lancar.fn.mockClear();
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 1000,
        categoriaID: "00000000-0000-0000-0000-000000000002",
        contaID: CONTA.id,
        cartaoID: undefined,
        parcelas: 1,
        tipo: "despesa",
        data: dataDeLocalISO(dataLocalISO()),
      }),
    );
  });

  it("mostra forma de pagamento e data de hoje sem abrir mais opções", () => {
    montar();
    expect(screen.getByLabelText("Forma de pagamento")).toBeInTheDocument();
    expect(screen.getByLabelText("Data do lançamento")).toHaveValue(dataLocalISO());
    expect(screen.getByRole("button", { name: "Gasto" })).toHaveAttribute("aria-pressed", "true");
  });

  it("passa a data editada para o lançamento", async () => {
    lancar.fn.mockClear();
    montar();
    fireEvent.change(screen.getByLabelText("Data do lançamento"), {
      target: { value: "2026-08-15" },
    });
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({ data: dataDeLocalISO("2026-08-15") }),
    );
  });

  it("lança receita na conta, com categoria de receita e sem cartão", async () => {
    lancar.fn.mockClear();
    montar({ cartoes: [CARTAO] });
    await userEvent.click(screen.getByRole("button", { name: "Receita" }));
    expect(screen.getByRole("heading", { name: "nova receita" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salário/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restaurante/ })).toBeNull();
    expect(screen.getByLabelText("Conta que recebe")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /final 4417/ })).toBeNull();
    await userEvent.keyboard("850000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 850000,
        tipo: "receita",
        categoriaID: "00000000-0000-0000-0000-000000000013",
        contaID: CONTA.id,
        cartaoID: undefined,
        parcelas: 1,
        data: dataDeLocalISO(dataLocalISO()),
      }),
    );
  });

  it("não mostra linha de teto sem meta para a categoria", async () => {
    montar();
    await userEvent.keyboard("1000");
    expect(screen.queryByText(/teto/i)).toBeNull();
    expect(screen.queryByText(/sobram/i)).toBeNull();
  });

  it("mostra o que sobra no teto da categoria escolhida", async () => {
    montar({
      metas: [
        {
          id: "m1",
          carteiraID: "c1",
          tipo: "teto_categoria",
          nome: "Restaurante",
          valorAlvo: 50_000,
          categoriaID: "00000000-0000-0000-0000-000000000002",
          periodo: "mensal",
          ativa: true,
        },
      ],
      transacoes: [
        {
          id: "t1",
          carteiraID: "c1",
          tipo: "despesa",
          valor: 16_000,
          data: new Date().toISOString(),
          categoriaID: "00000000-0000-0000-0000-000000000002",
          descricao: "almoço",
          hashDedup: "",
          parcelaN: 1,
          parcelaTotal: 1,
        },
      ],
    });
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await userEvent.keyboard("1000");
    expect(screen.getByText("Sobram R$ 330,00 no teto de Restaurante.")).toBeInTheDocument();
  });

  it("avisa quando a gravação falha, em vez de fechar em silêncio", async () => {
    lancar.fn.mockRejectedValueOnce(new Error("rede"));
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText(/Não deu para salvar/)).toBeInTheDocument();
    expect(empurrar).not.toHaveBeenCalled();
  });

  it("sem contas nem cartões, pede cadastro e não deixa salvar", async () => {
    montar({ contas: [], cartoes: [] });
    await userEvent.keyboard("1000");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Cadastrar conta" })).toHaveAttribute(
      "href",
      "/mais/contas/novo",
    );
    expect(screen.queryByLabelText("Forma de pagamento")).toBeNull();
  });

  it("sem contas, ainda deixa escolher um cartão na tela principal", async () => {
    montar({ contas: [], cartoes: [CARTAO] });
    await userEvent.keyboard("1000");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Cadastrar conta" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `cartao:${CARTAO.id}`);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("abre mais opções no lugar do teclado, só com a descrição", async () => {
    montar({ cartoes: [CARTAO] });
    await userEvent.keyboard("10000");
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByRole("heading", { name: "mais opções" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    expect(screen.getByLabelText("Onde foi o gasto")).toBeInTheDocument();
    expect(screen.queryByLabelText("Forma de pagamento")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Pronto" }));
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "novo gasto" })).toBeInTheDocument();
  });

  it("escolhe cartão e parcelas na tela principal, sem abrir mais opções", async () => {
    montar({ cartoes: [CARTAO] });
    await userEvent.keyboard("10000");
    expect(screen.getByLabelText("Forma de pagamento")).toBeInTheDocument();
    expect(screen.queryByLabelText("Parcelas")).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `cartao:${CARTAO.id}`);
    expect(screen.getByLabelText("Parcelas")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "24x" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Parcelas"), "3");
    expect(screen.getByText(/3x de R\$ 33,34, primeira parcela maior se houver sobra/)).toBeInTheDocument();
  });

  it("grava o lançamento no cartão com o número de parcelas, sem conta", async () => {
    lancar.fn.mockClear();
    montar({ cartoes: [CARTAO] });
    await userEvent.keyboard("300000");
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `cartao:${CARTAO.id}`);
    await userEvent.selectOptions(screen.getByLabelText("Parcelas"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 300000,
        cartaoID: CARTAO.id,
        contaID: undefined,
        parcelas: 12,
        tipo: "despesa",
      }),
    );
  });

  it("na conjunta, quem pagou começa no usuário logado", async () => {
    lancar.fn.mockClear();
    montar({
      carteira: { id: "c1", nome: "Nosso", visibilidade: "aberta", rotulo: "compartilhada" },
      membros: MEMBROS,
      usuarioID: "u1",
    });
    expect(screen.getByLabelText("Quem pagou")).toHaveValue("u1");
    expect(screen.getByRole("option", { name: "Você" })).toBeInTheDocument();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(expect.objectContaining({ pagadorID: "u1" }));
  });

  it("troca o pagador para o parceiro", async () => {
    lancar.fn.mockClear();
    montar({
      carteira: { id: "c1", nome: "Nosso", visibilidade: "aberta", rotulo: "compartilhada" },
      membros: MEMBROS,
      usuarioID: "u1",
    });
    await userEvent.selectOptions(screen.getByLabelText("Quem pagou"), "u2");
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(expect.objectContaining({ pagadorID: "u2" }));
  });

  it("na pessoal, omite quem pagou", () => {
    montar({
      carteira: { id: "c1", nome: "Meu", visibilidade: "fechada", rotulo: "pessoal" },
      membros: [MEMBROS[0]],
      usuarioID: "u1",
    });
    expect(screen.queryByLabelText("Quem pagou")).toBeNull();
  });

  it("mostra categoria custom da carteira e grava com o id dela", async () => {
    lancar.fn.mockClear();
    montar({ categorias: [PET] });
    expect(screen.getByRole("button", { name: /Pet/ })).toBeInTheDocument();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: /Pet/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({ categoriaID: "cat-pet", tipo: "despesa", valor: 1000 }),
    );
  });

  it("mostra o + para criar categoria além das sugeridas", () => {
    montar();
    expect(screen.getByRole("button", { name: "Nova categoria" })).toBeInTheDocument();
  });

  it("cria categoria na folha, mostra o chip e deixa selecionada", async () => {
    const salvarCategoria = vi.fn().mockResolvedValue(undefined);
    montar({ salvarCategoria });
    await userEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    const dialog = screen.getByRole("dialog", { name: "Nova categoria" });
    expect(dialog).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Nome"), "Pet");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));
    expect(salvarCategoria).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Pet", tipo: "despesa", carteiraID: "c1" }),
    );
    const chip = await screen.findByRole("button", { name: /Pet/ });
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });
});
