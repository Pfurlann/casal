import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { competenciaDe, dataDeLocalISO, dataLocalISO, hrefDoMes, transacoesDoLancamento } from "@/lib/domain";
import { Lancar } from "./Lancar";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
const substituir = vi.fn();
const voltarHist = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar, replace: substituir, back: voltarHist }),
}));

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
  bandeira: "mastercard" as const,
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
  cartoesTodos?: (typeof CARTAO & { donoID?: string; visibilidade?: string })[];
  contas?: typeof CONTA[];
  contasTodas?: (typeof CONTA & { donoID?: string; visibilidade?: string })[];
  carteira?: Record<string, unknown>;
  membros?: typeof MEMBROS;
  usuarioID?: string;
  categorias?: typeof PET[];
  salvarCategoria?: (c: unknown) => Promise<void>;
  metas?: Record<string, unknown>[];
  transacoes?: Record<string, unknown>[];
  comoFolha?: boolean;
}) {
  empurrar.mockClear();
  substituir.mockClear();
  voltarHist.mockClear();
  loja.valor = {
    carteira: opts?.carteira ?? { id: "c1", nome: "Nosso" },
    cartoes: opts?.cartoes ?? [],
    cartoesTodos: opts?.cartoesTodos ?? opts?.cartoes ?? [],
    contas: opts?.contas ?? [CONTA],
    contasTodas: opts?.contasTodas ?? opts?.contas ?? [CONTA],
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
      <Lancar comoFolha={opts?.comoFolha} />
    </ProvedorAviso>,
  );
}

async function informarDescricao(texto = "Padaria") {
  const campo =
    screen.queryByLabelText("Onde foi o gasto") ?? screen.getByLabelText("De onde veio");
  await userEvent.type(campo, texto);
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
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await informarDescricao();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("não habilita Salvar sem descrição, mesmo com valor e origem", async () => {
    montar();
    expect(screen.getByLabelText("Onde foi o gasto")).toBeInTheDocument();
    await userEvent.keyboard("1000");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByText("Diz onde foi o gasto.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Onde foi o gasto"), "   ");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("grava o lançamento na conta padrão com a categoria escolhida", async () => {
    lancar.fn.mockClear();
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await informarDescricao("Almoço");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 1000,
        categoriaID: "00000000-0000-0000-0000-000000000002",
        descricao: "Almoço",
        contaID: CONTA.id,
        cartaoID: undefined,
        parcelas: 1,
        tipo: "despesa",
        data: dataDeLocalISO(dataLocalISO()),
      }),
    );
    expect(substituir).toHaveBeenCalledWith(hrefDoMes(competenciaDe(dataDeLocalISO(dataLocalISO()))));
    expect(voltarHist).not.toHaveBeenCalled();
    expect(empurrar).not.toHaveBeenCalled();
  });

  it("na folha mobile, fecha com back e depois vai ao mês certo", async () => {
    lancar.fn.mockClear();
    montar({ comoFolha: true });
    await userEvent.keyboard("1000");
    await informarDescricao("Almoço");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalled();
    expect(voltarHist).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(substituir).toHaveBeenCalledWith(
        hrefDoMes(competenciaDe(dataDeLocalISO(dataLocalISO()))),
      );
    });
    expect(voltarHist.mock.invocationCallOrder[0]).toBeLessThan(
      substituir.mock.invocationCallOrder[0]!,
    );
    expect(empurrar).not.toHaveBeenCalled();
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
    await informarDescricao();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({ data: dataDeLocalISO("2026-08-15"), descricao: "Padaria" }),
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
    await informarDescricao("Salário");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 850000,
        tipo: "receita",
        descricao: "Salário",
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
    await informarDescricao();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText(/Não deu para salvar/)).toBeInTheDocument();
    expect(substituir).not.toHaveBeenCalled();
    expect(voltarHist).not.toHaveBeenCalled();
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
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await informarDescricao("Farmácia");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("pede a descrição na tela principal, sem enterrar em mais opções", async () => {
    montar({ cartoes: [CARTAO] });
    expect(screen.getByLabelText("Onde foi o gasto")).toBeInTheDocument();
    expect(screen.getByLabelText("Forma de pagamento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mais opções" })).toBeNull();
    expect(screen.getByRole("heading", { name: "novo gasto" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Receita" }));
    expect(screen.getByLabelText("De onde veio")).toBeInTheDocument();
    expect(screen.queryByLabelText("Onde foi o gasto")).toBeNull();
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
    await informarDescricao("Sofá");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 300000,
        descricao: "Sofá",
        cartaoID: CARTAO.id,
        contaID: undefined,
        parcelas: 12,
        tipo: "despesa",
      }),
    );
  });

  it("no cartão 3x grava a mesma descrição para o grupo", async () => {
    lancar.fn.mockClear();
    montar({ cartoes: [CARTAO] });
    await userEvent.keyboard("9000");
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), `cartao:${CARTAO.id}`);
    await userEvent.selectOptions(screen.getByLabelText("Parcelas"), "3");
    await informarDescricao("Sofá");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const payload = lancar.fn.mock.calls[0]?.[0] as {
      valor: number;
      descricao: string;
      data: Date;
      parcelas: number;
    };
    expect(payload).toMatchObject({ descricao: "Sofá", cartaoID: CARTAO.id, parcelas: 3 });
    const txs = transacoesDoLancamento({
      valor: payload.valor,
      descricao: payload.descricao,
      data: payload.data,
      cartao: CARTAO,
      parcelas: payload.parcelas,
      carteiraID: "c1",
    });
    expect(txs).toHaveLength(3);
    expect(txs.every((t) => t.descricao === "Sofá")).toBe(true);
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
    await informarDescricao();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(expect.objectContaining({ pagadorID: "u1" }));
  });

  it("lista só contas e cartões de quem pagou; nunca a pessoal do parceiro", async () => {
    montar({
      carteira: { id: "c1", nome: "Nosso", visibilidade: "aberta", rotulo: "compartilhada" },
      membros: MEMBROS,
      usuarioID: "u1",
      contas: [],
      cartoes: [],
      contasTodas: [
        { ...CONTA, id: "a-eu", nome: "Nubank Pedro", donoID: "u1", visibilidade: "conjunta" },
        { ...CONTA, id: "a-ela", nome: "Nubank Ana", donoID: "u2", visibilidade: "conjunta" },
        { ...CONTA, id: "a-ela-p", nome: "Caixa Ana", donoID: "u2", visibilidade: "pessoal" },
      ],
      cartoesTodos: [
        { ...CARTAO, id: "k-eu", ultimos4: "1111", donoID: "u1", visibilidade: "ambas" },
        { ...CARTAO, id: "k-ela-p", ultimos4: "9999", donoID: "u2", visibilidade: "pessoal" },
      ],
    });
    const select = screen.getByLabelText("Forma de pagamento");
    expect(select).toHaveTextContent("Nubank Pedro");
    expect(select).toHaveTextContent("final 1111");
    expect(select).not.toHaveTextContent("Nubank Ana");
    expect(select).not.toHaveTextContent("Caixa Ana");
    expect(select).not.toHaveTextContent("9999");

    await userEvent.selectOptions(screen.getByLabelText("Quem pagou"), "u2");
    expect(screen.getByLabelText("Forma de pagamento")).toHaveTextContent("Nubank Ana");
    expect(screen.getByLabelText("Forma de pagamento")).not.toHaveTextContent("Caixa Ana");
    expect(screen.getByLabelText("Forma de pagamento")).not.toHaveTextContent("9999");
    expect(screen.getByLabelText("Forma de pagamento")).not.toHaveTextContent("Nubank Pedro");
  });

  it("se o pagador não tem origem na conjunta, volta para as do logado", async () => {
    montar({
      carteira: { id: "c1", nome: "Nosso", visibilidade: "aberta", rotulo: "compartilhada" },
      membros: MEMBROS,
      usuarioID: "u1",
      contas: [],
      contasTodas: [
        { ...CONTA, id: "a-eu", nome: "PagBank", donoID: "u1", visibilidade: "conjunta" },
        { ...CONTA, id: "a-ela-p", nome: "Caixa Ana", donoID: "u2", visibilidade: "pessoal" },
      ],
    });
    await userEvent.selectOptions(screen.getByLabelText("Quem pagou"), "u2");
    expect(screen.getByLabelText("Forma de pagamento")).toHaveTextContent("PagBank");
    expect(screen.getByLabelText("Forma de pagamento")).not.toHaveTextContent("Caixa Ana");
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
    await informarDescricao();
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
    await informarDescricao("Ração");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({ categoriaID: "cat-pet", tipo: "despesa", valor: 1000, descricao: "Ração" }),
    );
  });

  it("no pago com, conta com reserva mostra o envelope", () => {
    montar({
      metas: [
        {
          id: "v1",
          carteiraID: "c1",
          tipo: "objetivo",
          nome: "Viagem",
          valorAlvo: 200_000,
          periodo: "longo_prazo",
          ativa: true,
          contaID: CONTA.id,
          alocado: 80_000,
        },
      ],
      contas: [{ ...CONTA, saldoInicial: 300_000 }],
    });
    const select = screen.getByLabelText("Forma de pagamento");
    expect(select).toHaveTextContent("Corrente · livre R$ 2.200,00");
    expect(select).toHaveTextContent("Corrente · R$ 800,00 na Viagem");
  });

  it("gastar da reserva passa a meta no lançamento", async () => {
    lancar.fn.mockClear();
    montar({
      metas: [
        {
          id: "v1",
          carteiraID: "c1",
          tipo: "objetivo",
          nome: "Viagem",
          valorAlvo: 200_000,
          periodo: "longo_prazo",
          ativa: true,
          contaID: CONTA.id,
          alocado: 80_000,
        },
      ],
      contas: [{ ...CONTA, saldoInicial: 300_000 }],
    });
    await userEvent.selectOptions(
      screen.getByLabelText("Forma de pagamento"),
      `reserva:${CONTA.id}:v1`,
    );
    await userEvent.keyboard("1000");
    await informarDescricao("Passagem");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({ contaID: CONTA.id, metaID: "v1", valor: 1000, descricao: "Passagem" }),
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
