"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import {
  aplicarPagamento,
  avancando,
  competenciaDaCompra,
  competenciaDe,
  fechamento,
  horizonte,
  saldoDevedor,
  transacoesDoLancamento,
  totalDaFatura,
  uuid,
  vencimento,
  type Cartao,
  type Carteira,
  type Categoria,
  type Compromisso,
  type Conta,
  type Fatura,
  type RotuloCarteira,
  type Competencia,
  type DespesaFixa,
  type Meta,
  type PeriodoMeta,
  type Transacao,
  type VisibilidadeCarteira,
} from "./domain";
import { COR_CATEGORIA_CUSTOM } from "./categorias";
import { liquidarCompromisso as aplicarLiquidacao, transacaoDoCompromisso } from "./compromissos";
import { gerarLancamentosFixos, liquidarLancamento as aplicarLiquidacaoLancamento } from "./despesas-fixas";
import {
  competenciaDoHashFatura,
  eCompraNoCartao,
  eLancamentoDeFatura,
  sincronizarTotaisFatura,
} from "./faturas";
import { COR_ORIGEM_PADRAO, corValida } from "./origem";
import { aplicarGastoNaReserva } from "./metas";
import { pagadorPadrao } from "./pagador";
import { clienteSupabase } from "./supabase";
import { colunasDoPrograma, programaDeColunas } from "./pontos";
import { transacoesDoOfx, type LinhaImportacaoOfx } from "./ofx";
import { cartaoDoLancamento, cartoesDaLoja, linhaDaTransacao } from "./persistir";
import { aplicarApagar, aplicarEdicao, idsParaApagar, idsParaEditar, type ApagarLancamento, type EdicaoLancamento } from "./transacoes";
import { cartoesAposApagar, eDonoDaOrigem, filtrarOrigensDaCarteira, normalizarVisibilidadeOrigem, visibilidadePadraoDaCarteira } from "./visibilidade";

export type MembroCarteira = {
  userId: string;
  email: string;
  papel: "dono" | "membro";
};

export type ConviteAtivo = {
  codigo: string;
  expiraEm: string;
};

export type CarteiraItem = Carteira & { membrosN: number; souDono: boolean };

export type Estado = {
  carteira: Carteira;
  carteiras: CarteiraItem[];
  contas: Conta[];
  contasTodas: Conta[];
  cartoes: Cartao[];
  cartoesTodos: Cartao[];
  faturas: Fatura[];
  transacoes: Transacao[];
  categorias: Categoria[];
  categoriasTodas: Categoria[];
  despesasFixas: DespesaFixa[];
  despesasFixasTodas: DespesaFixa[];
  metas: Meta[];
  metasTodas: Meta[];
  compromissos: Compromisso[];
  compromissosTodos: Compromisso[];
  membros: MembroCarteira[];
  convite: ConviteAtivo | null;
};

function carteiraPadrao(parcial?: Partial<Carteira>): Carteira {
  return {
    id: parcial?.id ?? "",
    nome: parcial?.nome ?? "Nosso",
    cor: parcial?.cor ?? "#7C5CFF",
    rotulo: parcial?.rotulo ?? "compartilhada",
    visibilidade: parcial?.visibilidade ?? "aberta",
  };
}

function visibilidadeDe(rotulo: RotuloCarteira): VisibilidadeCarteira {
  return rotulo === "pessoal" ? "fechada" : "aberta";
}

function mapearCarteira(w: {
  id: string;
  nome: string;
  cor?: string | null;
  rotulo?: string | null;
  visibilidade?: string | null;
}, membrosN = 1, souDono = true): CarteiraItem {
  const rotulo = (w.rotulo === "pessoal" || w.rotulo === "pj" ? w.rotulo : "compartilhada") as RotuloCarteira;
  const visibilidade = (w.visibilidade === "resumo" || w.visibilidade === "fechada" ? w.visibilidade : "aberta") as VisibilidadeCarteira;
  return {
    id: w.id,
    nome: w.nome,
    cor: w.cor ?? "#7C5CFF",
    rotulo,
    visibilidade,
    membrosN,
    souDono,
  };
}

function mapearConta(a: {
  id: string;
  wallet_id: string;
  nome: string;
  tipo: string;
  saldo_inicial_centavos: number;
  arquivada?: boolean | null;
  dono_id?: string | null;
  visibilidade?: string | null;
  cor?: string | null;
}): Conta {
  return {
    id: a.id,
    carteiraID: a.wallet_id,
    nome: a.nome,
    tipo: a.tipo as Conta["tipo"],
    saldoInicial: a.saldo_inicial_centavos,
    arquivada: Boolean(a.arquivada),
    donoID: a.dono_id ?? undefined,
    visibilidade: normalizarVisibilidadeOrigem(a.visibilidade),
    cor: corValida(a.cor),
  };
}

function mapearCartao(c: {
  id: string;
  wallet_id: string;
  apelido: string;
  banco: string;
  ultimos4: string;
  bandeira: string;
  cor?: string | null;
  limite_centavos: number;
  dia_fechamento: number;
  dia_vencimento: number;
  arquivado?: boolean | null;
  programa_pontos?: string | null;
  saldo_pontos?: number | null;
  pontos_por_unidade_x100?: number | null;
  moeda_acumulo?: string | null;
  valor_ponto_centavos?: number | null;
  dono_id?: string | null;
  visibilidade?: string | null;
}): Cartao {
  return {
    id: c.id,
    carteiraID: c.wallet_id,
    apelido: c.apelido,
    banco: c.banco,
    ultimos4: c.ultimos4,
    bandeira: c.bandeira as Cartao["bandeira"],
    cor: corValida(c.cor),
    limite: c.limite_centavos,
    diaFechamento: c.dia_fechamento,
    diaVencimento: c.dia_vencimento,
    arquivado: Boolean(c.arquivado),
    programa: programaDeColunas(c),
    donoID: c.dono_id ?? undefined,
    visibilidade: normalizarVisibilidadeOrigem(c.visibilidade),
  };
}

function mapearDespesaFixa(r: {
  id: string;
  wallet_id: string;
  nome: string;
  valor_centavos: number;
  category_id: string;
  dia_vencimento: number;
  account_id?: string | null;
  card_id?: string | null;
  tipo?: string | null;
  parcelas?: number | null;
  valores_parcelas?: number[] | null;
}): DespesaFixa {
  const parcelas = r.parcelas && r.parcelas > 1 ? r.parcelas : undefined;
  const valores = Array.isArray(r.valores_parcelas)
    ? r.valores_parcelas.filter((v) => Number.isInteger(v) && v > 0)
    : undefined;
  return {
    id: r.id,
    carteiraID: r.wallet_id,
    nome: r.nome,
    valor: r.valor_centavos,
    categoriaID: r.category_id,
    diaVencimento: r.dia_vencimento,
    contaID: r.account_id ?? undefined,
    cartaoID: r.card_id ?? undefined,
    tipo: r.tipo === "receita" ? "receita" : "despesa",
    parcelas,
    valoresParcelas: parcelas && valores && valores.length === parcelas ? valores : undefined,
  };
}

function mapearMeta(r: {
  id: string;
  wallet_id: string;
  tipo: string;
  nome: string;
  valor_alvo_centavos: number;
  category_id?: string | null;
  periodo?: string | null;
  data_alvo?: string | null;
  ativa?: boolean | null;
  account_id?: string | null;
  alocado_centavos?: number | null;
}): Meta | null {
  const tipo = r.tipo;
  if (tipo !== "teto_categoria" && tipo !== "economia_mensal" && tipo !== "objetivo") return null;
  const periodo: PeriodoMeta =
    r.periodo === "longo_prazo" || tipo === "objetivo" ? "longo_prazo" : "mensal";
  return {
    id: r.id,
    carteiraID: r.wallet_id,
    tipo,
    nome: r.nome,
    valorAlvo: r.valor_alvo_centavos,
    categoriaID: r.category_id ?? undefined,
    periodo,
    dataAlvo: r.data_alvo ?? undefined,
    ativa: r.ativa !== false,
    contaID: r.account_id ?? undefined,
    alocado: r.alocado_centavos ?? 0,
  };
}

function mapearCompromisso(r: {
  id: string;
  wallet_id: string;
  nome: string;
  valor_centavos: number;
  vence_em: string;
  category_id: string;
  transaction_id: string;
  status?: string | null;
}): Compromisso {
  return {
    id: r.id,
    carteiraID: r.wallet_id,
    nome: r.nome,
    valor: r.valor_centavos,
    venceEm: r.vence_em.slice(0, 10),
    categoriaID: r.category_id,
    transacaoID: r.transaction_id,
    status: r.status === "liquidado" ? "liquidado" : "a_pagar",
  };
}

function linhaDaMeta(m: Meta) {
  return {
    id: m.id,
    wallet_id: m.carteiraID,
    tipo: m.tipo,
    nome: m.nome,
    valor_alvo_centavos: m.valorAlvo,
    category_id: m.categoriaID ?? null,
    periodo: m.periodo,
    data_alvo: m.dataAlvo ?? null,
    ativa: m.ativa,
    account_id: m.contaID ?? null,
    alocado_centavos: m.alocado ?? 0,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
}

function mapearCategoria(r: {
  id: string;
  wallet_id?: string | null;
  nome: string;
  icone?: string | null;
  cor?: string | null;
  tipo?: string | null;
  deleted_at?: string | null;
} | null | undefined): Categoria | null {
  if (!r || r.deleted_at || !r.wallet_id) return null;
  return {
    id: r.id,
    nome: r.nome,
    icone: r.icone || "outros",
    cor: r.cor || COR_CATEGORIA_CUSTOM,
    tipo: r.tipo === "receita" ? "receita" : "despesa",
    carteiraID: r.wallet_id,
  };
}

function mesclarPorId<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some((x) => x.id === item.id)
    ? lista.map((x) => (x.id === item.id ? item : x))
    : [...lista, item];
}

function eDonoDa(
  carteiras: CarteiraItem[],
  membros: MembroCarteira[],
  userId: string | undefined,
  walletId: string,
): boolean {
  const item = carteiras.find((c) => c.id === walletId);
  if (item && typeof item.souDono === "boolean") return item.souDono;
  if (!userId) return true;
  if (membros.length === 0) return true;
  return membros.some((m) => m.userId === userId && m.papel === "dono");
}

const VAZIO: Estado = {
  carteira: carteiraPadrao(),
  carteiras: [],
  contas: [],
  contasTodas: [],
  cartoes: [],
  cartoesTodos: [],
  faturas: [],
  transacoes: [],
  categorias: [],
  categoriasTodas: [],
  despesasFixas: [],
  despesasFixasTodas: [],
  metas: [],
  metasTodas: [],
  compromissos: [],
  compromissosTodos: [],
  membros: [],
  convite: null,
};

function bootstrap(rotulo: RotuloCarteira = "compartilhada"): Estado {
  const visibilidade: VisibilidadeCarteira = rotulo === "pessoal" ? "fechada" : "aberta";
  const nome = rotulo === "pessoal" ? "Meu" : "Nosso";
  const carteira = carteiraPadrao({ id: uuid(), nome, rotulo, visibilidade });
  const contas: Conta[] = [
    {
      id: uuid(),
      carteiraID: carteira.id,
      nome: "Corrente",
      tipo: "corrente",
      saldoInicial: 0,
      arquivada: false,
      visibilidade: visibilidadePadraoDaCarteira(carteira),
      cor: COR_ORIGEM_PADRAO,
    },
  ];
  return {
    carteira,
    carteiras: [{ ...carteira, membrosN: 1, souDono: true }],
    contas,
    contasTodas: contas,
    cartoes: [],
    cartoesTodos: [],
    faturas: [],
    transacoes: [],
    categorias: [],
    categoriasTodas: [],
    despesasFixas: [],
    despesasFixasTodas: [],
    metas: [],
    metasTodas: [],
    compromissos: [],
    compromissosTodos: [],
    membros: [],
    convite: null,
  };
}

function chaveCarteira(userId?: string | null) {
  return userId ? `casal-carteira:${userId}` : "casal-carteira";
}

function escolherWalletId(
  wallets: { id: string }[],
  membros: { wallet_id: string }[],
  userId: string | undefined,
): string {
  const ids = wallets.map((w) => w.id);
  const saved = userId ? localStorage.getItem(chaveCarteira(userId)) : null;
  if (saved && ids.includes(saved)) return saved;
  const contagem = new Map<string, number>();
  for (const m of membros) {
    contagem.set(m.wallet_id, (contagem.get(m.wallet_id) ?? 0) + 1);
  }
  let melhor = ids[0] ?? "";
  let max = -1;
  for (const id of ids) {
    const n = contagem.get(id) ?? 1;
    if (n > max) {
      max = n;
      melhor = id;
    }
  }
  return melhor;
}

function mapearMembros(
  linhas: { wallet_id: string; user_id: string; email?: string | null; papel: string }[],
  walletId: string,
): MembroCarteira[] {
  return linhas
    .filter((m) => m.wallet_id === walletId)
    .map((m) => ({
      userId: m.user_id,
      email: m.email ?? "",
      papel: m.papel === "dono" ? "dono" : "membro",
    }));
}

function traduzirConvite(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("codigo invalido")) return "Código inválido ou já usado.";
  if (m.includes("expirado")) return "Este convite expirou. Peça um código novo.";
  if (m.includes("proprio")) return "Esse código é o seu. A outra pessoa entra com a conta dela.";
  if (m.includes("ja e membro")) return "Você já está nesta carteira.";
  if (m.includes("fechada")) return "Esta carteira não aceita convites.";
  if (m.includes("so o dono")) return "Só quem criou a carteira pode gerar convite.";
  if (m.includes("sem permissao") || m.includes("nao autenticado")) return "Sem permissão.";
  return msg;
}

function chaveLocal(userId?: string | null) {
  return userId ? `casal-estado:${userId}` : "casal-estado";
}

type Loja = Estado & {
  usuarioID?: string;
  pronto: boolean;
  remoto: boolean;
  recarregar: () => Promise<void>;
  salvarCartao: (c: Cartao) => Promise<void>;
  apagarCartao: (id: string) => Promise<void>;
  salvarConta: (c: Conta) => Promise<void>;
  lancar: (p: {
    valor: number;
    categoriaID?: string;
    descricao: string;
    data: Date;
    cartaoID?: string;
    contaID?: string;
    parcelas: number;
    pagadorID?: string;
    tipo?: "despesa" | "receita";
    metaID?: string;
  }) => Promise<void>;
  editar: (p: EdicaoLancamento) => Promise<void>;
  apagar: (p: ApagarLancamento) => Promise<void>;
  pagarFatura: (p: {
    cartao: Cartao;
    fatura: Fatura;
    valor: number;
    contaID: string;
  }) => Promise<void>;
  criarConvite: () => Promise<string | null>;
  aceitarConvite: (codigo: string) => Promise<string | null>;
  criarCarteira: (p: { nome: string; rotulo: RotuloCarteira; cor: string }) => Promise<string | null>;
  selecionarCarteira: (id: string) => Promise<void>;
  salvarCarteira: (p: { id: string; nome: string; rotulo: RotuloCarteira; cor: string }) => Promise<string | null>;
  apagarCarteira: (id: string) => Promise<string | null>;
  salvarDespesaFixa: (f: DespesaFixa) => Promise<void>;
  apagarDespesaFixa: (id: string) => Promise<void>;
  lancarDespesaFixa: (id: string, competencia?: Competencia) => Promise<void>;
  liquidarLancamento: (p: {
    id: string;
    contaID?: string;
    cartaoID?: string;
    metaID?: string;
  }) => Promise<void>;
  salvarCategoria: (c: Categoria) => Promise<void>;
  apagarCategoria: (id: string) => Promise<void>;
  salvarMeta: (m: Meta) => Promise<void>;
  apagarMeta: (id: string) => Promise<void>;
  salvarCompromisso: (c: Compromisso) => Promise<void>;
  apagarCompromisso: (id: string) => Promise<void>;
  liquidarCompromisso: (p: {
    id: string;
    contaID?: string;
    cartaoID?: string;
    metaID?: string;
  }) => Promise<void>;
  importarOfx: (p: {
    cartaoID: string;
    linhas: LinhaImportacaoOfx[];
  }) => Promise<{ importados: number; repetidos: number }>;
};

const Ctx = createContext<Loja | null>(null);

export function useLoja(): Loja {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLoja fora do provider");
  return v;
}

export function LojaProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [estado, setEstado] = useState<Estado>(VAZIO);
  const [pronto, setPronto] = useState(false);
  const sb = useMemo(() => clienteSupabase(), []);
  const localKey = chaveLocal(usuario?.id);

  const persistirLocal = useCallback(
    (e: Estado) => {
      localStorage.setItem(localKey, JSON.stringify(e));
    },
    [localKey],
  );

  const recarregar = useCallback(async () => {
    if (!sb) {
      const bruto = localStorage.getItem(localKey);
      if (bruto) {
        const parsed = JSON.parse(bruto) as Estado;
        const contasTodas = parsed.contasTodas ?? parsed.contas ?? [];
        const cartoesTodos = parsed.cartoesTodos ?? parsed.cartoes ?? [];
        const despesasFixasTodas = (parsed.despesasFixasTodas ?? parsed.despesasFixas ?? []).map((f) => ({
          ...f,
          tipo: f.tipo === "receita" ? "receita" as const : "despesa" as const,
        }));
        const categoriasTodas = parsed.categoriasTodas ?? parsed.categorias ?? [];
        const metasTodas = parsed.metasTodas ?? parsed.metas ?? [];
        const compromissosTodos = parsed.compromissosTodos ?? parsed.compromissos ?? [];
        setEstado({
          ...VAZIO,
          ...parsed,
          membros: parsed.membros ?? [],
          convite: parsed.convite ?? null,
          carteiras: (parsed.carteiras ?? (parsed.carteira ? [{ ...carteiraPadrao(parsed.carteira), membrosN: 1, souDono: true }] : [])).map((c) => ({
            ...c,
            souDono: c.souDono !== false,
          })),
          carteira: carteiraPadrao(parsed.carteira),
          contasTodas,
          cartoesTodos,
          contas: filtrarOrigensDaCarteira(
            contasTodas.filter((c) => !c.arquivada),
            parsed.carteira,
            usuario?.id,
          ),
          cartoes: filtrarOrigensDaCarteira(
            cartoesTodos.filter((c) => !c.arquivado),
            parsed.carteira,
            usuario?.id,
          ),
          despesasFixasTodas,
          despesasFixas: parsed.despesasFixas ?? despesasFixasTodas.filter((f) => f.carteiraID === parsed.carteira?.id),
          categoriasTodas,
          categorias: (parsed.categorias ?? categoriasTodas).filter((c) => c?.carteiraID === parsed.carteira?.id),
          metasTodas,
          metas: parsed.metas ?? metasTodas.filter((m) => m.carteiraID === parsed.carteira?.id),
          compromissosTodos,
          compromissos: parsed.compromissos ?? compromissosTodos.filter((c) => c.carteiraID === parsed.carteira?.id),
        });
      } else {
        const inicial = bootstrap();
        persistirLocal(inicial);
        setEstado(inicial);
      }
      setPronto(true);
      return;
    }

    const [wallets, accounts, cards, invoices, txs, members, fixas, cats, goals, commits] = await Promise.all([
      sb.from("wallets").select("*").is("deleted_at", null),
      sb.from("accounts").select("*").is("deleted_at", null),
      sb.from("cards").select("*").is("deleted_at", null),
      sb.from("invoices").select("*").is("deleted_at", null),
      sb.from("transactions").select("*").is("deleted_at", null),
      sb.from("wallet_members").select("wallet_id, user_id, email, papel"),
      sb.from("fixed_expenses").select("*").is("deleted_at", null),
      sb.from("categories").select("*"),
      sb.from("goals").select("*").is("deleted_at", null),
      sb.from("commitments").select("*").is("deleted_at", null),
    ]);

    if (wallets.error) {
      console.error(wallets.error);
      setPronto(true);
      return;
    }

    if (!wallets.data?.length) {
      const inicial = bootstrap();
      const { error: errW } = await sb.from("wallets").insert({
        id: inicial.carteira.id,
        nome: inicial.carteira.nome,
        cor: inicial.carteira.cor,
        rotulo: inicial.carteira.rotulo,
        visibilidade: inicial.carteira.visibilidade,
      });
      if (errW) {
        console.error(errW);
        setPronto(true);
        return;
      }
      await sb.from("accounts").insert({
        id: inicial.contas[0].id,
        wallet_id: inicial.carteira.id,
        nome: inicial.contas[0].nome,
        tipo: inicial.contas[0].tipo,
        saldo_inicial_centavos: 0,
        dono_id: usuario?.id,
        visibilidade: visibilidadePadraoDaCarteira(inicial.carteira),
      });
      const comMembros: Estado = {
        ...inicial,
        membros: usuario
          ? [{ userId: usuario.id, email: usuario.email ?? "", papel: "dono" }]
          : [],
      };
      persistirLocal(comMembros);
      setEstado(comMembros);
      setPronto(true);
      return;
    }

    const linhasMembros = (members.data ?? []) as {
      wallet_id: string;
      user_id: string;
      email?: string | null;
      papel: string;
    }[];
    const carteiras: CarteiraItem[] = (wallets.data as { id: string; nome: string; cor?: string | null; rotulo?: string | null; visibilidade?: string | null; dono_id?: string | null }[]).map((w) =>
      mapearCarteira(
        w,
        linhasMembros.filter((m) => m.wallet_id === w.id).length,
        w.dono_id === usuario?.id
          || linhasMembros.some((m) => m.wallet_id === w.id && m.user_id === usuario?.id && m.papel === "dono"),
      ),
    );
    const walletId = escolherWalletId(carteiras, linhasMembros, usuario?.id);
    const linhaCarteira = carteiras.find((w) => w.id === walletId) ?? carteiras[0];
    const convites = await sb
      .from("invites")
      .select("codigo, expira_em")
      .eq("wallet_id", walletId)
      .is("aceito_por", null)
      .is("deleted_at", null)
      .gt("expira_em", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const contasTodas = (accounts.data ?? [])
      .filter((a) => !a.arquivada)
      .map((a) => mapearConta(a as Parameters<typeof mapearConta>[0]));
    const cartoesTodos = (cards.data ?? [])
      .filter((c) => !c.arquivado)
      .map((c) => mapearCartao(c as Parameters<typeof mapearCartao>[0]));
    const cartoes = filtrarOrigensDaCarteira(cartoesTodos, linhaCarteira, usuario?.id);
    const idsCartoes = new Set(cartoes.map((c) => c.id));
    const localFallback = (): Estado | null => {
      try {
        const bruto = localStorage.getItem(localKey);
        if (!bruto) return null;
        return JSON.parse(bruto) as Estado;
      } catch {
        return null;
      }
    };
    const despesasFixasTodas = !fixas.error
      ? (fixas.data ?? []).map((r) => mapearDespesaFixa(r as Parameters<typeof mapearDespesaFixa>[0]))
      : (localFallback()?.despesasFixasTodas ?? localFallback()?.despesasFixas ?? []);
    const categoriasTodas = !cats.error
      ? (cats.data ?? [])
          .map((r) => mapearCategoria(r as Parameters<typeof mapearCategoria>[0]))
          .filter((c): c is Categoria => Boolean(c))
      : (localFallback()?.categoriasTodas ?? localFallback()?.categorias ?? []);
    const metasTodas = !goals.error
      ? (goals.data ?? [])
          .map((r) => mapearMeta(r as Parameters<typeof mapearMeta>[0]))
          .filter((m): m is Meta => Boolean(m))
      : (localFallback()?.metasTodas ?? localFallback()?.metas ?? []);
    const compromissosTodos = !commits.error
      ? (commits.data ?? []).map((r) => mapearCompromisso(r as Parameters<typeof mapearCompromisso>[0]))
      : (localFallback()?.compromissosTodos ?? localFallback()?.compromissos ?? []);

    const proximo: Estado = {
      carteira: {
        id: linhaCarteira.id,
        nome: linhaCarteira.nome,
        cor: linhaCarteira.cor,
        rotulo: linhaCarteira.rotulo,
        visibilidade: linhaCarteira.visibilidade,
      },
      carteiras,
      contasTodas,
      contas: filtrarOrigensDaCarteira(contasTodas, linhaCarteira, usuario?.id),
      cartoesTodos,
      cartoes,
      faturas: (invoices.data ?? [])
        .filter((f) => idsCartoes.has(f.card_id as string))
        .map((f) => ({
        id: f.id as string,
        cartaoID: f.card_id as string,
        ano: f.competencia_ano as number,
        mes: f.competencia_mes as number,
        fechaEm: f.fecha_em as string,
        venceEm: f.vence_em as string,
        status: f.status as Fatura["status"],
        valorPago: f.valor_pago_centavos as number,
      })),
      transacoes: (txs.data ?? [])
        .filter((t) => t.wallet_id === walletId)
        .map((t) => ({
          id: t.id as string,
          carteiraID: t.wallet_id as string,
          tipo: t.tipo as Transacao["tipo"],
          valor: t.valor_centavos as number,
          data: t.data as string,
          categoriaID: (t.category_id as string | null) ?? undefined,
          descricao: (t.descricao as string) ?? "",
          contaID: (t.account_id as string | null) ?? undefined,
          cartaoID: (t.card_id as string | null) ?? undefined,
          faturaID: (t.invoice_id as string | null) ?? undefined,
          pagadorID: (t.pagador_id as string | null) ?? undefined,
          hashDedup: (t.hash_dedup as string) ?? "",
          grupoParcela: (t.grupo_parcela as string | null) ?? undefined,
          parcelaN: (t.parcela_n as number) ?? 1,
          parcelaTotal: (t.parcela_total as number) ?? 1,
          status: t.status === "liquidado" ? "liquidado" as const : "a_pagar" as const,
          metaID: (t.goal_id as string | null) ?? undefined,
        })),
      despesasFixasTodas,
      despesasFixas: despesasFixasTodas.filter((f) => f.carteiraID === walletId),
      categoriasTodas,
      categorias: categoriasTodas.filter((c) => c?.carteiraID === walletId),
      metasTodas,
      metas: metasTodas.filter((m) => m.carteiraID === walletId),
      compromissosTodos,
      compromissos: compromissosTodos.filter((c) => c.carteiraID === walletId),
      membros: mapearMembros(linhasMembros, walletId),
      convite: convites.data?.[0]
        ? { codigo: convites.data[0].codigo as string, expiraEm: convites.data[0].expira_em as string }
        : null,
    };
    const geradas = gerarLancamentosFixos(
      proximo.despesasFixas,
      proximo.transacoes,
      competenciaDe(new Date()),
      proximo.cartoesTodos ?? proximo.cartoes,
    ).map((t) => ({ ...t, pagadorID: usuario?.id }));
    const comFixos =
      geradas.length === 0
        ? proximo
        : { ...proximo, transacoes: [...proximo.transacoes, ...geradas] };
    const totais = sincronizarTotaisFatura(
      comFixos.cartoesTodos ?? comFixos.cartoes,
      comFixos.faturas,
      comFixos.transacoes,
    );
    const final = { ...comFixos, transacoes: totais.transacoes };
    persistirLocal(final);
    setEstado(final);
    setPronto(true);
    const inserir = [...geradas, ...totais.novas];
    if (inserir.length > 0) {
      const { error } = await sb.from("transactions").insert(inserir.map(linhaDaTransacao));
      if (error && error.code !== "23505") console.error(error);
    }
    if (totais.alteradas.length > 0) {
      const agora = new Date().toISOString();
      await Promise.all(
        totais.alteradas.map((t) =>
          sb.from("transactions").update({
            valor_centavos: t.valor,
            status: t.status,
            invoice_id: t.faturaID ?? null,
            updated_at: agora,
          }).eq("id", t.id),
        ),
      );
    }
  }, [sb, localKey, persistirLocal, usuario]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const commit = async (proximo: Estado) => {
    setEstado(proximo);
    persistirLocal(proximo);
  };

  const salvarCartao = async (c: Cartao) => {
    const gravado: Cartao = {
      ...c,
      donoID: c.donoID ?? usuario?.id,
      visibilidade: c.visibilidade ?? visibilidadePadraoDaCarteira(estado.carteira),
    };
    const cartoesTodos = mesclarPorId(estado.cartoesTodos ?? estado.cartoes, gravado).filter((x) => !x.arquivado);
    const cartoes = filtrarOrigensDaCarteira(cartoesTodos, estado.carteira, usuario?.id);
    await commit({ ...estado, cartoesTodos, cartoes });
    if (sb) {
      await sb.from("cards").upsert({
        id: gravado.id,
        wallet_id: gravado.carteiraID,
        apelido: gravado.apelido,
        banco: gravado.banco,
        ultimos4: gravado.ultimos4,
        bandeira: gravado.bandeira,
        cor: gravado.cor,
        limite_centavos: gravado.limite,
        dia_fechamento: gravado.diaFechamento,
        dia_vencimento: gravado.diaVencimento,
        arquivado: gravado.arquivado,
        dono_id: gravado.donoID,
        visibilidade: gravado.visibilidade,
        updated_at: new Date().toISOString(),
        ...colunasDoPrograma(gravado.programa),
      });
    }
  };

  const apagarCartao = async (id: string) => {
    const atual = (estado.cartoesTodos ?? estado.cartoes).find((c) => c.id === id);
    if (!atual) return;
    if (!eDonoDaOrigem(atual, usuario?.id)) {
      throw new Error("Só quem cadastrou o cartão pode apagar.");
    }
    const { cartoesTodos, cartoes, faturas } = cartoesAposApagar(
      estado.cartoesTodos ?? estado.cartoes,
      estado.faturas,
      estado.carteira,
      id,
      usuario?.id,
    );
    await commit({ ...estado, cartoesTodos, cartoes, faturas });
    if (sb) {
      const agora = new Date().toISOString();
      const { error } = await sb.from("cards").update({
        deleted_at: agora,
        arquivado: true,
        updated_at: agora,
      }).eq("id", id);
      if (error) throw error;
    }
  };

  const salvarConta = async (c: Conta) => {
    const gravada: Conta = {
      ...c,
      donoID: c.donoID ?? usuario?.id,
      visibilidade: c.visibilidade ?? visibilidadePadraoDaCarteira(estado.carteira),
      cor: corValida(c.cor),
    };
    const contasTodas = mesclarPorId(estado.contasTodas ?? estado.contas, gravada).filter((x) => !x.arquivada);
    const contas = filtrarOrigensDaCarteira(contasTodas, estado.carteira, usuario?.id);
    await commit({ ...estado, contasTodas, contas });
    if (sb) {
      await sb.from("accounts").upsert({
        id: gravada.id,
        wallet_id: gravada.carteiraID,
        nome: gravada.nome,
        tipo: gravada.tipo,
        saldo_inicial_centavos: gravada.saldoInicial,
        arquivada: gravada.arquivada,
        dono_id: gravada.donoID,
        visibilidade: gravada.visibilidade,
        cor: corValida(gravada.cor),
        updated_at: new Date().toISOString(),
      });
    }
  };

  const persistirNovasTransacoes = async (novas: Transacao[]) => {
    if (novas.length === 0) return;
    if (!sb) return;
    const { error } = await sb.from("transactions").insert(novas.map(linhaDaTransacao));
    if (error && error.code !== "23505") throw error;
  };

  const mesclarFixosNoEstado = (base: Estado, pagadorID?: string): { estado: Estado; novas: Transacao[] } => {
    const desde = competenciaDe(new Date());
    const novas = gerarLancamentosFixos(
      base.despesasFixas ?? [],
      base.transacoes,
      desde,
      base.cartoesTodos ?? base.cartoes,
    ).map((t) => ({ ...t, pagadorID: pagadorID ?? t.pagadorID }));
    if (novas.length === 0) return { estado: base, novas };
    return { estado: { ...base, transacoes: [...base.transacoes, ...novas] }, novas };
  };

  const mesclarFaturasNoEstado = (base: Estado): {
    estado: Estado;
    novas: Transacao[];
    alteradas: Transacao[];
  } => {
    const totais = sincronizarTotaisFatura(
      base.cartoesTodos ?? base.cartoes,
      base.faturas,
      base.transacoes,
    );
    return { estado: { ...base, transacoes: totais.transacoes }, novas: totais.novas, alteradas: totais.alteradas };
  };

  const persistirTotaisFatura = async (novas: Transacao[], alteradas: Transacao[]) => {
    if (!sb) return;
    await persistirNovasTransacoes(novas);
    if (alteradas.length === 0) return;
    const agora = new Date().toISOString();
    await Promise.all(
      alteradas.map((t) =>
        sb.from("transactions").update({
          valor_centavos: t.valor,
          status: t.status,
          invoice_id: t.faturaID ?? null,
          updated_at: agora,
        }).eq("id", t.id),
      ),
    );
  };

  const salvarDespesaFixa = async (f: DespesaFixa) => {
    const despesasFixasTodas = mesclarPorId(estado.despesasFixasTodas ?? estado.despesasFixas ?? [], f);
    const despesasFixas = despesasFixasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    const base = { ...estado, despesasFixasTodas, despesasFixas };
    const { estado: comFixos, novas } = mesclarFixosNoEstado(base, usuario?.id);
    const { estado: proximo, novas: totaisNovos, alteradas } = mesclarFaturasNoEstado(comFixos);
    await commit(proximo);
    if (sb) {
      const { error } = await sb.from("fixed_expenses").upsert({
        id: f.id,
        wallet_id: f.carteiraID,
        nome: f.nome,
        valor_centavos: f.valor,
        category_id: f.categoriaID,
        dia_vencimento: f.diaVencimento,
        account_id: f.cartaoID ? null : f.contaID ?? null,
        card_id: f.tipo === "receita" ? null : f.cartaoID ?? null,
        tipo: f.tipo === "receita" ? "receita" : "despesa",
        parcelas: f.parcelas && f.parcelas > 1 ? f.parcelas : 1,
        valores_parcelas: f.parcelas && f.parcelas > 1 ? (f.valoresParcelas ?? null) : null,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await persistirNovasTransacoes(novas);
      await persistirTotaisFatura(totaisNovos, alteradas);
    }
  };

  const apagarDespesaFixa = async (id: string) => {
    const despesasFixasTodas = (estado.despesasFixasTodas ?? estado.despesasFixas ?? []).filter((f) => f.id !== id);
    const despesasFixas = despesasFixasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    await commit({ ...estado, despesasFixasTodas, despesasFixas });
    if (sb) {
      const agora = new Date().toISOString();
      const { error } = await sb.from("fixed_expenses").update({
        deleted_at: agora,
        updated_at: agora,
      }).eq("id", id);
      if (error) throw error;
    }
  };

  const salvarCategoria = async (c: Categoria) => {
    const categoriasTodas = mesclarPorId(estado.categoriasTodas ?? estado.categorias ?? [], c);
    const categorias = categoriasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    await commit({ ...estado, categoriasTodas, categorias });
    if (sb) {
      const { error } = await sb.from("categories").upsert({
        id: c.id,
        wallet_id: c.carteiraID,
        nome: c.nome,
        icone: c.icone,
        cor: c.cor || COR_CATEGORIA_CUSTOM,
        tipo: c.tipo,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
  };

  const apagarCategoria = async (id: string) => {
    const categoriasTodas = (estado.categoriasTodas ?? estado.categorias ?? []).filter((c) => c.id !== id);
    const categorias = categoriasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    await commit({ ...estado, categoriasTodas, categorias });
    if (sb) {
      const agora = new Date().toISOString();
      const { error } = await sb.from("categories").update({
        deleted_at: agora,
        updated_at: agora,
      }).eq("id", id);
      if (error) throw error;
    }
  };

  const salvarMeta = async (m: Meta) => {
    const metasTodas = mesclarPorId(estado.metasTodas ?? estado.metas ?? [], m);
    const metas = metasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    await commit({ ...estado, metasTodas, metas });
    if (sb) {
      const { error } = await sb.from("goals").upsert(linhaDaMeta(m));
      if (error) throw error;
    }
  };

  const apagarMeta = async (id: string) => {
    const metasTodas = (estado.metasTodas ?? estado.metas ?? []).filter((m) => m.id !== id);
    const metas = metasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    await commit({ ...estado, metasTodas, metas });
    if (sb) {
      const agora = new Date().toISOString();
      const { error } = await sb.from("goals").update({
        deleted_at: agora,
        updated_at: agora,
      }).eq("id", id);
      if (error) throw error;
    }
  };

  const lancarDespesaFixa = async (id: string, competencia?: Competencia) => {
    const fixa = (estado.despesasFixas ?? []).find((f) => f.id === id);
    if (!fixa) throw new Error("despesa fixa não encontrada");
    const desde = competencia ?? competenciaDe(new Date());
    const novas = gerarLancamentosFixos(
      [fixa],
      estado.transacoes,
      desde,
      estado.cartoesTodos ?? estado.cartoes,
    ).map((t) => ({ ...t, pagadorID: usuario?.id }));
    if (novas.length === 0) return;
    const comFixos = { ...estado, transacoes: [...estado.transacoes, ...novas] };
    const { estado: proximo, novas: totaisNovos, alteradas } = mesclarFaturasNoEstado(comFixos);
    await commit(proximo);
    await persistirNovasTransacoes(novas);
    await persistirTotaisFatura(totaisNovos, alteradas);
  };

  const liquidarLancamento: Loja["liquidarLancamento"] = async ({
    id,
    contaID,
    cartaoID,
    metaID,
  }) => {
    const compromisso = (estado.compromissos ?? []).find((c) => c.transacaoID === id);
    if (compromisso) {
      await liquidarCompromisso({ id: compromisso.id, contaID, cartaoID, metaID });
      return;
    }
    const alvo = estado.transacoes.find((t) => t.id === id);
    if (!alvo) throw new Error("lançamento não encontrado");
    if (eCompraNoCartao(alvo)) {
      throw new Error("Compra no cartão se liquida na fatura.");
    }
    if (eLancamentoDeFatura(alvo)) {
      if (!contaID || cartaoID) throw new Error("Pague a fatura com uma conta.");
      const parsed = competenciaDoHashFatura(alvo.hashDedup);
      const cartao = (estado.cartoesTodos ?? estado.cartoes).find((c) => c.id === alvo.cartaoID);
      if (!cartao || !parsed) throw new Error("Não achei essa fatura.");
      const fatura = faturaDaCompetencia(cartao, estado.faturas, parsed.competencia);
      const total = totalDaFatura(fatura, estado.transacoes, cartao);
      const resto = saldoDevedor(fatura, total);
      if (resto > 0) {
        await pagarFatura({ cartao, fatura, valor: resto, contaID });
        return;
      }
    }
    const transacao = aplicarLiquidacaoLancamento(alvo, { contaID, cartaoID });
    let metasTodas = estado.metasTodas ?? estado.metas ?? [];
    if (contaID) {
      metasTodas = aplicarGastoNaReserva(metasTodas, {
        valor: transacao.valor,
        contaID,
        metaID,
      });
    }
    const metas = metasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    const transacoes = estado.transacoes.map((t) => (t.id === transacao.id ? transacao : t));
    await commit({ ...estado, transacoes, metasTodas, metas });
    if (sb) {
      const agora = new Date().toISOString();
      const { error } = await sb.from("transactions").update({
        account_id: transacao.contaID ?? null,
        card_id: transacao.cartaoID ?? null,
        status: "liquidado",
        goal_id: transacao.metaID ?? metaID ?? null,
        updated_at: agora,
      }).eq("id", transacao.id);
      if (error) throw error;
      const mudou = metasTodas.filter((m) => {
        const antes = (estado.metasTodas ?? estado.metas ?? []).find((x) => x.id === m.id);
        return !antes || (antes.alocado ?? 0) !== (m.alocado ?? 0);
      });
      await persistirMetas(mudou);
    }
  };

  const persistirMetas = async (metas: Meta[]) => {
    if (!sb) return;
    await Promise.all(metas.map((m) => sb.from("goals").upsert(linhaDaMeta(m))));
  };

  const lancar: Loja["lancar"] = async ({
    valor,
    categoriaID,
    descricao,
    data,
    cartaoID,
    contaID,
    parcelas,
    pagadorID,
    tipo,
    metaID,
  }) => {
    const cartao = cartaoDoLancamento(
      cartaoID,
      tipo,
      cartoesDaLoja(estado.cartoesTodos, estado.cartoes),
    );
    if (cartaoID && tipo !== "receita" && !cartao) {
      throw new Error("Não achei esse cartão.");
    }
    const novas = transacoesDoLancamento({
      valor,
      categoriaID,
      descricao,
      data,
      cartao,
      contaID: cartao ? undefined : contaID,
      parcelas: cartao ? parcelas : 1,
      carteiraID: estado.carteira.id,
      pagadorID: pagadorPadrao(pagadorID, usuario?.id),
      tipo: tipo ?? "despesa",
    }).map((t) => ({
      ...t,
      status: (tipo ?? "despesa") === "receita" ? "liquidado" as const : "a_pagar" as const,
      metaID: cartao ? undefined : metaID,
    }));
    const comNovas = { ...estado, transacoes: [...estado.transacoes, ...novas] };
    const { estado: comFaturas, novas: totaisNovos, alteradas } = mesclarFaturasNoEstado(comNovas);
    await commit(comFaturas);
    if (sb) {
      await persistirNovasTransacoes(novas);
      await persistirTotaisFatura(totaisNovos, alteradas);
    }
  };

  const salvarCompromisso = async (c: Compromisso) => {
    const tx = transacaoDoCompromisso(c);
    const existente = estado.transacoes.find((t) => t.id === c.transacaoID);
    const transacoes = existente
      ? estado.transacoes.map((t) => (t.id === tx.id
        ? { ...t, descricao: tx.descricao, valor: tx.valor, data: tx.data, categoriaID: tx.categoriaID, status: c.status }
        : t))
      : [...estado.transacoes, tx];
    const compromissosTodos = mesclarPorId(estado.compromissosTodos ?? estado.compromissos ?? [], c);
    const compromissos = compromissosTodos.filter((x) => x.carteiraID === estado.carteira.id);
    await commit({ ...estado, transacoes, compromissosTodos, compromissos });
    if (sb) {
      const { error: errTx } = existente
        ? await sb.from("transactions").update({
            descricao: tx.descricao,
            valor_centavos: tx.valor,
            data: tx.data,
            category_id: tx.categoriaID ?? null,
            status: c.status,
            updated_at: new Date().toISOString(),
          }).eq("id", tx.id)
        : await sb.from("transactions").insert(linhaDaTransacao(tx));
      if (errTx) throw errTx;
      const { error } = await sb.from("commitments").upsert({
        id: c.id,
        wallet_id: c.carteiraID,
        nome: c.nome,
        valor_centavos: c.valor,
        vence_em: c.venceEm,
        category_id: c.categoriaID,
        transaction_id: c.transacaoID,
        status: c.status,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
  };

  const apagarCompromisso = async (id: string) => {
    const alvo = (estado.compromissosTodos ?? estado.compromissos ?? []).find((c) => c.id === id);
    const compromissosTodos = (estado.compromissosTodos ?? estado.compromissos ?? []).filter((c) => c.id !== id);
    const compromissos = compromissosTodos.filter((x) => x.carteiraID === estado.carteira.id);
    const apagaTx = alvo?.status === "a_pagar";
    const transacoes = apagaTx
      ? estado.transacoes.filter((t) => t.id !== alvo.transacaoID)
      : estado.transacoes;
    await commit({ ...estado, compromissosTodos, compromissos, transacoes });
    if (sb) {
      const agora = new Date().toISOString();
      const { error } = await sb.from("commitments").update({
        deleted_at: agora,
        updated_at: agora,
      }).eq("id", id);
      if (error) throw error;
      if (apagaTx && alvo) {
        await sb.from("transactions").update({
          deleted_at: agora,
          updated_at: agora,
        }).eq("id", alvo.transacaoID);
      }
    }
  };

  const liquidarCompromisso: Loja["liquidarCompromisso"] = async ({
    id,
    contaID,
    cartaoID,
    metaID,
  }) => {
    const c = (estado.compromissos ?? []).find((x) => x.id === id);
    if (!c) throw new Error("compromisso não encontrado");
    const tx = estado.transacoes.find((t) => t.id === c.transacaoID) ?? transacaoDoCompromisso(c);
    const { compromisso, transacao } = aplicarLiquidacao(c, tx, { contaID, cartaoID });
    let metasTodas = estado.metasTodas ?? estado.metas ?? [];
    if (contaID) {
      metasTodas = aplicarGastoNaReserva(metasTodas, {
        valor: compromisso.valor,
        contaID,
        metaID,
      });
    }
    const metas = metasTodas.filter((x) => x.carteiraID === estado.carteira.id);
    const compromissosTodos = mesclarPorId(estado.compromissosTodos ?? estado.compromissos ?? [], compromisso);
    const compromissos = compromissosTodos.filter((x) => x.carteiraID === estado.carteira.id);
    const transacoes = estado.transacoes.some((t) => t.id === transacao.id)
      ? estado.transacoes.map((t) => (t.id === transacao.id ? transacao : t))
      : [...estado.transacoes, transacao];
    await commit({ ...estado, compromissosTodos, compromissos, transacoes, metasTodas, metas });
    if (sb) {
      const agora = new Date().toISOString();
      const { error: errC } = await sb.from("commitments").update({
        status: "liquidado",
        updated_at: agora,
      }).eq("id", id);
      if (errC) throw errC;
      const { error: errT } = await sb.from("transactions").update({
        account_id: transacao.contaID ?? null,
        card_id: transacao.cartaoID ?? null,
        status: "liquidado",
        goal_id: transacao.metaID ?? metaID ?? null,
        updated_at: agora,
      }).eq("id", transacao.id);
      if (errT) throw errT;
      const mudou = metasTodas.filter((m) => {
        const antes = (estado.metasTodas ?? estado.metas ?? []).find((x) => x.id === m.id);
        return !antes || (antes.alocado ?? 0) !== (m.alocado ?? 0);
      });
      await persistirMetas(mudou);
    }
  };

  const editar: Loja["editar"] = async (p) => {
    const ids = idsParaEditar(estado.transacoes, p);
    const todas = aplicarEdicao(estado.transacoes, p);
    await commit({
      ...estado,
      transacoes: todas.filter((t) => t.carteiraID === estado.carteira.id),
    });
    if (sb) {
      const agora = new Date().toISOString();
      await Promise.all(
        ids.map((id) => {
          const t = todas.find((x) => x.id === id);
          if (!t) return Promise.resolve();
          return sb.from("transactions").update({
            descricao: t.descricao,
            category_id: t.categoriaID ?? null,
            valor_centavos: t.valor,
            wallet_id: t.carteiraID,
            account_id: t.contaID ?? null,
            card_id: t.cartaoID ?? null,
            pagador_id: t.pagadorID ?? null,
            updated_at: agora,
          }).eq("id", t.id);
        }),
      );
    }
  };

  const apagar: Loja["apagar"] = async (p) => {
    const ids = idsParaApagar(estado.transacoes, p);
    const transacoes = aplicarApagar(estado.transacoes, p);
    await commit({ ...estado, transacoes });
    if (sb && ids.length > 0) {
      const agora = new Date().toISOString();
      await sb.from("transactions").update({
        deleted_at: agora,
        updated_at: agora,
      }).in("id", ids);
    }
  };

  const pagarFatura: Loja["pagarFatura"] = async ({ cartao, fatura, valor, contaID }) => {
    let persistida = estado.faturas.find(
      (f) => f.cartaoID === cartao.id && f.ano === fatura.ano && f.mes === fatura.mes,
    );
    const faturas = [...estado.faturas];
    if (!persistida) {
      persistida = { ...fatura, id: fatura.id || uuid() };
      faturas.push(persistida);
    }
    const total = totalDaFatura(persistida, estado.transacoes, cartao);
    const atualizada = aplicarPagamento(persistida, valor, total);
    const idx = faturas.findIndex((f) => f.id === persistida!.id);
    faturas[idx] = atualizada;
    const tx: Transacao = {
      id: uuid(),
      carteiraID: estado.carteira.id,
      tipo: "transferencia",
      valor,
      data: new Date().toISOString(),
      descricao: "Pagamento de fatura",
      contaID,
      faturaID: atualizada.id,
      hashDedup: `pagamento|${atualizada.id}|${valor}`,
      parcelaN: 1,
      parcelaTotal: 1,
    };
    await commit({ ...estado, faturas, transacoes: [...estado.transacoes, tx] });
    if (sb) {
      await sb.from("invoices").upsert({
        id: atualizada.id,
        card_id: atualizada.cartaoID,
        competencia_ano: atualizada.ano,
        competencia_mes: atualizada.mes,
        fecha_em: atualizada.fechaEm,
        vence_em: atualizada.venceEm,
        status: atualizada.status,
        valor_pago_centavos: atualizada.valorPago,
        updated_at: new Date().toISOString(),
      });
      await sb.from("transactions").insert({
        id: tx.id,
        wallet_id: tx.carteiraID,
        tipo: tx.tipo,
        valor_centavos: tx.valor,
        data: tx.data,
        descricao: tx.descricao,
        account_id: contaID,
        invoice_id: atualizada.id,
        hash_dedup: tx.hashDedup,
      });
    }
  };

  const importarOfx: Loja["importarOfx"] = async ({ cartaoID, linhas }) => {
    const cartao = (estado.cartoesTodos ?? estado.cartoes).find((c) => c.id === cartaoID);
    if (!cartao) throw new Error("cartão não encontrado");
    const novas = transacoesDoOfx({
      linhas,
      carteiraID: estado.carteira.id,
      cartaoID: cartao.id,
      cartao,
      pagadorID: pagadorPadrao(undefined, usuario?.id),
      existentes: estado.transacoes,
    });
    const repetidos = linhas.filter((l) => estado.transacoes.some((t) => t.hashDedup === l.hashDedup)).length;
    if (novas.length === 0) return { importados: 0, repetidos };
    const comOfx = { ...estado, transacoes: [...estado.transacoes, ...novas] };
    const { estado: proximo, novas: totaisNovos, alteradas } = mesclarFaturasNoEstado(comOfx);
    await commit(proximo);
    if (sb) {
      const { error } = await sb.from("transactions").insert(novas.map(linhaDaTransacao));
      if (error) {
        if (error.code === "23505") {
          let gravados = 0;
          for (const tx of novas) {
            const r = await sb.from("transactions").insert(linhaDaTransacao(tx));
            if (r.error) {
              if (r.error.code === "23505") continue;
              throw r.error;
            }
            gravados += 1;
          }
          return { importados: gravados, repetidos: repetidos + (novas.length - gravados) };
        }
        throw error;
      }
      await persistirTotaisFatura(totaisNovos, alteradas);
    }
    return { importados: novas.length, repetidos };
  };

  const criarConvite = async (): Promise<string | null> => {
    if (!sb) return "Convites precisam do login na nuvem.";
    const { data, error } = await sb.rpc("criar_convite", { p_wallet_id: estado.carteira.id });
    if (error) return traduzirConvite(error.message);
    const bruto = data as { codigo?: string; expira_em?: string } | null;
    if (!bruto?.codigo) return "Não foi possível gerar o código.";
    await commit({
      ...estado,
      convite: { codigo: bruto.codigo, expiraEm: bruto.expira_em ?? new Date().toISOString() },
    });
    return null;
  };

  const aceitarConvite = async (codigo: string): Promise<string | null> => {
    if (!sb) return "Convites precisam do login na nuvem.";
    const { data, error } = await sb.rpc("aceitar_convite", { p_codigo: codigo });
    if (error) return traduzirConvite(error.message);
    const walletId = typeof data === "string" ? data : null;
    if (walletId && usuario?.id) {
      localStorage.setItem(chaveCarteira(usuario.id), walletId);
    }
    await recarregar();
    return null;
  };

  const selecionarCarteira = async (id: string) => {
    if (usuario?.id) localStorage.setItem(chaveCarteira(usuario.id), id);
    else localStorage.setItem(chaveCarteira(), id);
    await recarregar();
  };

  const lembrarCarteira = (id: string) => {
    if (usuario?.id) localStorage.setItem(chaveCarteira(usuario.id), id);
    else localStorage.setItem(chaveCarteira(), id);
  };

  const criarCarteira = async (p: { nome: string; rotulo: RotuloCarteira; cor: string }): Promise<string | null> => {
    const visibilidade = visibilidadeDe(p.rotulo);
    const id = uuid();
    const contaId = uuid();
    if (!sb) {
      const nova = carteiraPadrao({ id, nome: p.nome.trim(), cor: p.cor, rotulo: p.rotulo, visibilidade });
      const novaConta: Conta = {
        id: contaId,
        carteiraID: id,
        nome: "Corrente",
        tipo: "corrente",
        saldoInicial: 0,
        arquivada: false,
        donoID: usuario?.id,
        visibilidade: visibilidadePadraoDaCarteira(nova),
      };
      lembrarCarteira(id);
      await commit({
        carteira: nova,
        carteiras: [...estado.carteiras.filter((c) => c.id !== id), { ...nova, membrosN: 1, souDono: true }],
        contas: [novaConta],
        contasTodas: [...(estado.contasTodas ?? estado.contas).filter((c) => c.carteiraID !== id), novaConta],
        cartoes: [],
        cartoesTodos: estado.cartoesTodos ?? estado.cartoes,
        faturas: [],
        transacoes: [],
        categorias: [],
        categoriasTodas: (estado.categoriasTodas ?? estado.categorias ?? []).filter((c) => c.carteiraID !== id),
        despesasFixas: [],
        despesasFixasTodas: (estado.despesasFixasTodas ?? estado.despesasFixas ?? []).filter((f) => f.carteiraID !== id),
        metas: [],
        metasTodas: (estado.metasTodas ?? estado.metas ?? []).filter((m) => m.carteiraID !== id),
        compromissos: [],
        compromissosTodos: (estado.compromissosTodos ?? estado.compromissos ?? []).filter((c) => c.carteiraID !== id),
        membros: usuario ? [{ userId: usuario.id, email: usuario.email ?? "", papel: "dono" }] : [],
        convite: null,
      });
      return null;
    }
    const { error } = await sb.from("wallets").insert({
      id,
      nome: p.nome.trim(),
      cor: p.cor,
      rotulo: p.rotulo,
      visibilidade,
    });
    if (error) return error.message;
    await sb.from("accounts").insert({
      id: contaId,
      wallet_id: id,
      nome: "Corrente",
      tipo: "corrente",
      saldo_inicial_centavos: 0,
      dono_id: usuario?.id,
      visibilidade: visibilidadePadraoDaCarteira({ rotulo: p.rotulo, visibilidade }),
    });
    lembrarCarteira(id);
    await recarregar();
    return null;
  };

  const salvarCarteira = async (p: {
    id: string;
    nome: string;
    rotulo: RotuloCarteira;
    cor: string;
  }): Promise<string | null> => {
    if (!eDonoDa(estado.carteiras, estado.membros, usuario?.id, p.id)) {
      return "Só quem criou a carteira pode editar.";
    }
    const nome = p.nome.trim();
    const visibilidade = visibilidadeDe(p.rotulo);
    if (!sb) {
      const atual = estado.carteiras.find((c) => c.id === p.id);
      const atualizada = carteiraPadrao({
        id: p.id,
        nome,
        cor: p.cor,
        rotulo: p.rotulo,
        visibilidade,
      });
      await commit({
        ...estado,
        carteira: estado.carteira.id === p.id ? atualizada : estado.carteira,
        carteiras: estado.carteiras.map((c) =>
          c.id === p.id ? { ...c, ...atualizada, souDono: atual?.souDono !== false } : c,
        ),
      });
      return null;
    }
    const { error } = await sb
      .from("wallets")
      .update({ nome, cor: p.cor, rotulo: p.rotulo, visibilidade })
      .eq("id", p.id);
    if (error) return error.message;
    await recarregar();
    return null;
  };

  const apagarCarteira = async (id: string): Promise<string | null> => {
    if (!eDonoDa(estado.carteiras, estado.membros, usuario?.id, id)) {
      return "Só quem criou a carteira pode apagar.";
    }
    const restantes = estado.carteiras.filter((c) => c.id !== id);
    const ultima = restantes.length === 0;

    if (!sb) {
      if (ultima) {
        const novaId = uuid();
        const contaId = uuid();
        const nova = carteiraPadrao({
          id: novaId,
          nome: "Meu",
          rotulo: "pessoal",
          visibilidade: visibilidadeDe("pessoal"),
        });
        const novaConta: Conta = {
          id: contaId,
          carteiraID: novaId,
          nome: "Corrente",
          tipo: "corrente",
          saldoInicial: 0,
          arquivada: false,
          donoID: usuario?.id,
          visibilidade: visibilidadePadraoDaCarteira(nova),
        };
        lembrarCarteira(novaId);
        await commit({
          carteira: nova,
          carteiras: [{ ...nova, membrosN: 1, souDono: true }],
          contas: [novaConta],
          contasTodas: [novaConta],
          cartoes: [],
          cartoesTodos: [],
          faturas: [],
          transacoes: [],
          categorias: [],
          categoriasTodas: [],
          despesasFixas: [],
          despesasFixasTodas: [],
          metas: [],
          metasTodas: [],
          compromissos: [],
          compromissosTodos: [],
          membros: usuario ? [{ userId: usuario.id, email: usuario.email ?? "", papel: "dono" }] : [],
          convite: null,
        });
        return null;
      }
      const proxima = estado.carteira.id === id ? restantes[0] : null;
      if (proxima) lembrarCarteira(proxima.id);
      const contasTodas = (estado.contasTodas ?? estado.contas).filter((c) => c.carteiraID !== id);
      const cartoesTodos = (estado.cartoesTodos ?? estado.cartoes).filter((c) => c.carteiraID !== id);
      const despesasFixasTodas = (estado.despesasFixasTodas ?? estado.despesasFixas ?? []).filter((f) => f.carteiraID !== id);
      const categoriasTodas = (estado.categoriasTodas ?? estado.categorias ?? []).filter((c) => c.carteiraID !== id);
      const metasTodas = (estado.metasTodas ?? estado.metas ?? []).filter((m) => m.carteiraID !== id);
      const compromissosTodos = (estado.compromissosTodos ?? estado.compromissos ?? []).filter((c) => c.carteiraID !== id);
      await commit({
        ...estado,
        carteira: proxima
          ? {
              id: proxima.id,
              nome: proxima.nome,
              cor: proxima.cor,
              rotulo: proxima.rotulo,
              visibilidade: proxima.visibilidade,
            }
          : estado.carteira,
        carteiras: restantes,
        contasTodas,
        cartoesTodos,
        contas: proxima ? filtrarOrigensDaCarteira(contasTodas, proxima, usuario?.id) : estado.contas,
        cartoes: proxima ? filtrarOrigensDaCarteira(cartoesTodos, proxima, usuario?.id) : estado.cartoes,
        despesasFixasTodas,
        despesasFixas: proxima ? despesasFixasTodas.filter((f) => f.carteiraID === proxima.id) : estado.despesasFixas,
        categoriasTodas,
        categorias: proxima ? categoriasTodas.filter((c) => c.carteiraID === proxima.id) : estado.categorias,
        metasTodas,
        metas: proxima ? metasTodas.filter((m) => m.carteiraID === proxima.id) : estado.metas,
        compromissosTodos,
        compromissos: proxima ? compromissosTodos.filter((c) => c.carteiraID === proxima.id) : estado.compromissos,
        faturas: proxima ? [] : estado.faturas,
        transacoes: proxima ? [] : estado.transacoes,
        membros: proxima
          ? usuario
            ? [{ userId: usuario.id, email: usuario.email ?? "", papel: "dono" }]
            : []
          : estado.membros,
        convite: proxima ? null : estado.convite,
      });
      return null;
    }

    if (ultima) {
      const falha = await criarCarteira({
        nome: "Meu",
        rotulo: "pessoal",
        cor: estado.carteira.cor,
      });
      if (falha) return falha;
    } else if (estado.carteira.id === id && restantes[0]) {
      lembrarCarteira(restantes[0].id);
    }

    const { error } = await sb
      .from("wallets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return error.message;
    await recarregar();
    return null;
  };

  const valor: Loja = {
    ...estado,
    usuarioID: usuario?.id,
    pronto,
    remoto: Boolean(sb),
    recarregar,
    salvarCartao,
    apagarCartao,
    salvarConta,
    lancar,
    editar,
    apagar,
    pagarFatura,
    criarConvite,
    aceitarConvite,
    criarCarteira,
    selecionarCarteira,
    salvarCarteira,
    apagarCarteira,
    salvarDespesaFixa,
    apagarDespesaFixa,
    lancarDespesaFixa,
    salvarCategoria,
    apagarCategoria,
    salvarMeta,
    apagarMeta,
    salvarCompromisso,
    apagarCompromisso,
    liquidarCompromisso,
    liquidarLancamento,
    importarOfx,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function faturaAtualOuRascunho(cartao: Cartao, faturas: Fatura[], agora = new Date()): Fatura {
  const c = competenciaDe(agora);
  const existente = faturas.find((f) => f.cartaoID === cartao.id && f.ano === c.ano && f.mes === c.mes);
  if (existente) return existente;
  return {
    id: uuid(),
    cartaoID: cartao.id,
    ano: c.ano,
    mes: c.mes,
    fechaEm: fechamento(c, cartao),
    venceEm: vencimento(c, cartao),
    status: "aberta",
    valorPago: 0,
  };
}

export function faturaDaCompetencia(cartao: Cartao, faturas: Fatura[], c: { ano: number; mes: number }): Fatura {
  const existente = faturas.find((f) => f.cartaoID === cartao.id && f.ano === c.ano && f.mes === c.mes);
  if (existente) return existente;
  return {
    id: uuid(),
    cartaoID: cartao.id,
    ano: c.ano,
    mes: c.mes,
    fechaEm: fechamento(c, cartao),
    venceEm: vencimento(c, cartao),
    status: "aberta",
    valorPago: 0,
  };
}

export { saldoDevedor, totalDaFatura, horizonte, avancando, competenciaDe, competenciaDaCompra };
