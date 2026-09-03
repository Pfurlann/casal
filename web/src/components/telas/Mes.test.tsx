import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mes } from "./Mes";
import { CORES_CARTAO } from "@/lib/domain";
import { hashDedupFixa } from "@/lib/despesas-fixas";
import { ProvedorAviso } from "../ui/Aviso";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "c1", nome: "Nosso", cor: "grafite", rotulo: "compartilhada", visibilidade: "aberta" };
const CONTA = {
  id: "a1",
  carteiraID: "c1",
  nome: "Corrente",
  tipo: "corrente" as const,
  saldoInicial: 0,
  arquivada: false,
  cor: CORES_CARTAO[0],
};

function despesa(valor: number, descricao: string, categoriaID: string, id = crypto.randomUUID()) {
  return {
    id,
    carteiraID: "c1",
    tipo: "despesa" as const,
    valor,
    data: new Date().toISOString(),
    categoriaID,
    descricao,
    contaID: "a1",
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
    status: "liquidado" as const,
  };
}

function montar(extra: Record<string, unknown> = {}) {
  const { competenciaRota, ...lojaExtra } = extra;
  loja.valor = {
    carteira: CARTEIRA,
    cartoes: [],
    contas: [CONTA],
    faturas: [],
    transacoes: [],
    ...lojaExtra,
  };
  return render(
    <ProvedorAviso>
      <Mes competenciaRota={typeof competenciaRota === "string" ? competenciaRota : undefined} />
    </ProvedorAviso>,
  );
}

describe("Mes", () => {
  it("soma só as despesas do mês corrente", () => {
    const mesPassado = new Date();
    mesPassado.setMonth(mesPassado.getMonth() - 1);
    montar({
      transacoes: [
        despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001"),
        despesa(1800, "Padaria", "00000000-0000-0000-0000-000000000001"),
        { ...despesa(50000, "Antigo", "00000000-0000-0000-0000-000000000001"), data: mesPassado.toISOString() },
      ],
    });
    expect(
      screen.getByText((_, el) => el?.textContent === "R$ 232,90" && el.className.includes("text-[36px]")),
    ).toBeInTheDocument();
    expect(screen.queryByText("Antigo")).toBeNull();
  });

  it("lista os lançamentos do mês com a categoria", () => {
    montar({
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001", "tx-1")],
    });
    expect(screen.getByRole("link", { name: /Mercado/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Corrente/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Mercado/ })).toHaveAttribute(
      "href",
      "/lancamentos/tx-1",
    );
  });

  it("no desktop a lista vira tabela, não card de telefone", () => {
    const { container } = montar({
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001", "tx-1")],
    });
    expect(container.querySelector(".casal-resumo-mes")).toBeTruthy();
    expect(container.querySelector(".casal-linha-mes")).toBeTruthy();
    expect(container.querySelector(".casal-tabela-cabeca")?.textContent).toMatch(
      /descrição.*categoria.*origem.*valor.*estado/,
    );
  });

  it("mostra o estado vazio quando não houve gasto", () => {
    montar();
    expect(screen.getByText(/Nenhum gasto/)).toBeInTheDocument();
  });

  it("não usa gradiente em nenhuma superfície", () => {
    const { container } = montar({
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    });
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("na conjunta, marca quem pagou quando não é óbvio", () => {
    montar({
      membros: [
        { userId: "u1", email: "eu@casa.br", papel: "dono" },
        { userId: "u2", email: "ana@casa.br", papel: "membro" },
      ],
      usuarioID: "u1",
      transacoes: [
        { ...despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001", "tx-1"), pagadorID: "u2" },
      ],
    });
    expect(screen.getByText(/Mercado · Corrente · AN/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mercado/ })).toHaveAttribute(
      "href",
      "/lancamentos/tx-1",
    );
  });

  it("na pessoal, não mostra quem pagou", () => {
    montar({
      carteira: { ...CARTEIRA, nome: "Meu", rotulo: "pessoal", visibilidade: "fechada" },
      membros: [{ userId: "u1", email: "eu@casa.br", papel: "dono" }],
      usuarioID: "u1",
      transacoes: [
        { ...despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001"), pagadorID: "u1" },
      ],
    });
    expect(screen.queryByText(/você/)).toBeNull();
  });

  it("filtra pagos e a pagar", async () => {
    montar({
      transacoes: [
        despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001", "tx-pago"),
        {
          ...despesa(250_000, "Aluguel", "00000000-0000-0000-0000-000000000005", "tx-apagar"),
          status: "a_pagar",
          hashDedup: hashDedupFixa("f1", { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 }),
        },
      ],
    });
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getAllByText("Mercado", { selector: "span" }).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Pagos" }));
    expect(screen.queryByText("Aluguel")).toBeNull();
    expect(screen.getByRole("link", { name: /Mercado/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "A pagar" }));
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Mercado/ })).toBeNull();
  });

  it("swipe de a pagar abre modal e escolhe origem", async () => {
    const liquidar = vi.fn().mockResolvedValue(undefined);
    montar({
      contas: [CONTA],
      contasTodas: [CONTA],
      liquidarLancamento: liquidar,
      transacoes: [
        {
          ...despesa(250_000, "Aluguel", "00000000-0000-0000-0000-000000000005", "tx-apagar"),
          status: "a_pagar",
          contaID: undefined,
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "Pago" }));
    expect(screen.getByRole("dialog", { name: "Marcar pago" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Forma de pagamento"), "conta:a1");
    await userEvent.click(screen.getByRole("button", { name: /Marcar pago/ }));
    expect(liquidar).toHaveBeenCalledWith(
      expect.objectContaining({ id: "tx-apagar", contaID: "a1" }),
    );
  });

  it("compra no cartão mostra o método com check, sem swipe", () => {
    const { container } = montar({
      cartoes: [{
        id: "k1",
        carteiraID: "c1",
        apelido: "Roxinho",
        banco: "Nubank",
        ultimos4: "4417",
        bandeira: "mastercard",
        cor: CORES_CARTAO[0],
        limite: 1_000_000,
        diaFechamento: 28,
        diaVencimento: 5,
        arquivado: false,
      }],
      transacoes: [
        {
          ...despesa(4200, "Padaria", "00000000-0000-0000-0000-000000000002", "tx-cartao"),
          contaID: undefined,
          cartaoID: "k1",
          status: "liquidado",
        },
      ],
    });
    expect(screen.getByText(/Roxinho/)).toBeInTheDocument();
    expect(container.querySelector("[data-cor-origem]")).toBeTruthy();
    expect(screen.getByLabelText("pago")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pago" })).toBeNull();
  });

  it("mostra o total da fatura em a pagar", async () => {
    const agora = new Date();
    const noMes = new Date(agora.getFullYear(), agora.getMonth(), 10, 12, 0, 0);
    montar({
      cartoes: [{
        id: "k1",
        carteiraID: "c1",
        apelido: "Roxinho",
        banco: "Nubank",
        ultimos4: "4417",
        bandeira: "mastercard",
        cor: CORES_CARTAO[0],
        limite: 1_000_000,
        diaFechamento: 28,
        diaVencimento: 5,
        arquivado: false,
      }],
      faturas: [{
        id: "inv-1",
        cartaoID: "k1",
        ano: agora.getFullYear(),
        mes: agora.getMonth() + 1,
        fechaEm: `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-28`,
        venceEm: `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-05`,
        status: "aberta",
        valorPago: 0,
      }],
      transacoes: [
        {
          ...despesa(4200, "Padaria", "00000000-0000-0000-0000-000000000002", "tx-cartao"),
          data: noMes.toISOString(),
          contaID: undefined,
          cartaoID: "k1",
          status: "a_pagar",
        },
      ],
    });
    expect(screen.getByText("Fatura Roxinho")).toBeInTheDocument();
    expect(screen.getByLabelText("pago")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "A pagar" }));
    expect(screen.getByText("Fatura Roxinho")).toBeInTheDocument();
    expect(screen.queryByText("Padaria")).toBeNull();
  });

  it("sinaliza a cor da conta na linha", () => {
    const { container } = montar({
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    });
    const bola = container.querySelector("[data-cor-origem]") as HTMLElement;
    expect(bola).toBeTruthy();
    expect(bola.style.background).toBeTruthy();
    expect(screen.getAllByText(/Corrente/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("pago")).toBeInTheDocument();
  });

  it("alerta teto no limite ou estourado", () => {
    montar({
      transacoes: [despesa(45_000, "Mercado", "00000000-0000-0000-0000-000000000001")],
      metas: [
        {
          id: "m1",
          carteiraID: "c1",
          tipo: "teto_categoria",
          nome: "Mercado",
          valorAlvo: 50_000,
          categoriaID: "00000000-0000-0000-0000-000000000001",
          periodo: "mensal",
          ativa: true,
        },
      ],
    });
    expect(screen.getByText("Sobram R$ 50,00 no teto de Mercado.")).toBeInTheDocument();
  });

  it("mostra gasto em categoria custom e não some no filtro Todos", () => {
    const bemEstar = {
      id: "966ee5dd-4382-42fe-bd8c-1c009faddac0",
      nome: "Bem Estar",
      icone: "outros",
      cor: "grafite",
      tipo: "despesa" as const,
      carteiraID: "c1",
    };
    montar({
      categorias: [bemEstar],
      transacoes: [
        {
          ...despesa(10_500, "Barbearia do Kelvin", bemEstar.id, "tx-be"),
          status: "a_pagar",
          cartaoID: "k1",
          contaID: undefined,
        },
      ],
    });
    expect(screen.getByRole("link", { name: /Barbearia do Kelvin/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Bem Estar/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("pago")).toBeInTheDocument();
  });

  it("no mês da rota lista custom de agosto que o mês atual omitiria", () => {
    const bemEstar = {
      id: "966ee5dd-4382-42fe-bd8c-1c009faddac0",
      nome: "Bem Estar",
      icone: "outros",
      cor: "grafite",
      tipo: "despesa" as const,
      carteiraID: "c1",
    };
    montar({
      competenciaRota: "2026-08",
      categorias: [bemEstar],
      transacoes: [
        {
          ...despesa(10_500, "Barbearia do Kelvin", bemEstar.id, "tx-be"),
          data: "2026-08-05T15:00:00.000Z",
          status: "a_pagar",
        },
      ],
    });
    expect(screen.getByText(/agosto/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Barbearia do Kelvin/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Bem Estar/).length).toBeGreaterThan(0);
  });

  it("compra OFX de agosto cai no mês da fatura (fechamento dia 7) com categoria custom", () => {
    const bemEstar = {
      id: "966ee5dd-4382-42fe-bd8c-1c009faddac0",
      nome: "Bem Estar",
      icone: "outros",
      cor: "grafite",
      tipo: "despesa" as const,
      carteiraID: "c1",
    };
    const nanquim = {
      id: "6474d2f6-56ef-42a7-859e-3a2bca2cfdda",
      carteiraID: "c1",
      apelido: "Nanquim",
      banco: "Caixa",
      ultimos4: "4687",
      bandeira: "mastercard" as const,
      cor: CORES_CARTAO[0],
      limite: 1_000_000,
      diaFechamento: 7,
      diaVencimento: 15,
      arquivado: false,
    };
    montar({
      competenciaRota: "2026-09",
      categorias: [bemEstar],
      cartoes: [nanquim],
      transacoes: [
        {
          ...despesa(4_000, "PARK EXPRESS", bemEstar.id, "tx-park"),
          data: "2026-08-25T15:00:00.000Z",
          cartaoID: nanquim.id,
          contaID: undefined,
          hashDedup: "ofx|nanquim|park",
          status: "a_pagar",
        },
        {
          ...despesa(10_500, "BARBEARIADOKEL VIN", bemEstar.id, "tx-barbe"),
          data: "2026-08-05T15:00:00.000Z",
          cartaoID: nanquim.id,
          contaID: undefined,
          hashDedup: "ofx|nanquim|barbe",
          status: "a_pagar",
        },
      ],
    });
    expect(screen.getByText(/setembro/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PARK EXPRESS/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Bem Estar/).length).toBeGreaterThan(0);
    expect(screen.queryByText("BARBEARIADOKEL VIN")).toBeNull();
  });

  it("hex só na bolinha da origem", () => {
    const { container } = montar({
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    });
    const semBola = container.innerHTML.replace(/data-cor-origem[\s\S]*?>/g, ">");
    expect(semBola).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
