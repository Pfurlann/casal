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
  type Conta,
  type Fatura,
  type RotuloCarteira,
  type Transacao,
  type VisibilidadeCarteira,
} from "./domain";
import { clienteSupabase } from "./supabase";
import { aplicarApagar, aplicarEdicao, idsParaApagar, type ApagarLancamento, type EdicaoLancamento } from "./transacoes";

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
  cartoes: Cartao[];
  faturas: Fatura[];
  transacoes: Transacao[];
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
  cartoes: [],
  faturas: [],
  transacoes: [],
  membros: [],
  convite: null,
};

function bootstrap(rotulo: RotuloCarteira = "compartilhada"): Estado {
  const visibilidade: VisibilidadeCarteira = rotulo === "pessoal" ? "fechada" : "aberta";
  const nome = rotulo === "pessoal" ? "Meu" : "Nosso";
  const carteira = carteiraPadrao({ id: uuid(), nome, rotulo, visibilidade });
  return {
    carteira,
    carteiras: [{ ...carteira, membrosN: 1, souDono: true }],
    contas: [
      {
        id: uuid(),
        carteiraID: carteira.id,
        nome: "Corrente",
        tipo: "corrente",
        saldoInicial: 0,
        arquivada: false,
      },
    ],
    cartoes: [],
    faturas: [],
    transacoes: [],
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
  pronto: boolean;
  remoto: boolean;
  recarregar: () => Promise<void>;
  salvarCartao: (c: Cartao) => Promise<void>;
  salvarConta: (c: Conta) => Promise<void>;
  lancar: (p: {
    valor: number;
    categoriaID?: string;
    descricao: string;
    data: Date;
    cartaoID?: string;
    contaID?: string;
    parcelas: number;
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
        });
      } else {
        const inicial = bootstrap();
        persistirLocal(inicial);
        setEstado(inicial);
      }
      setPronto(true);
      return;
    }

    const [wallets, accounts, cards, invoices, txs, members] = await Promise.all([
      sb.from("wallets").select("*").is("deleted_at", null),
      sb.from("accounts").select("*").is("deleted_at", null),
      sb.from("cards").select("*").is("deleted_at", null),
      sb.from("invoices").select("*").is("deleted_at", null),
      sb.from("transactions").select("*").is("deleted_at", null),
      sb.from("wallet_members").select("wallet_id, user_id, email, papel"),
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

    const cartoes = (cards.data ?? [])
      .filter((c) => c.wallet_id === walletId && !c.arquivado)
      .map((c) => ({
        id: c.id as string,
        carteiraID: c.wallet_id as string,
        apelido: c.apelido as string,
        banco: c.banco as string,
        ultimos4: c.ultimos4 as string,
        bandeira: c.bandeira as Cartao["bandeira"],
        cor: c.cor as string,
        limite: c.limite_centavos as number,
        diaFechamento: c.dia_fechamento as number,
        diaVencimento: c.dia_vencimento as number,
        arquivado: Boolean(c.arquivado),
      }));
    const idsCartoes = new Set(cartoes.map((c) => c.id));

    const proximo: Estado = {
      carteira: {
        id: linhaCarteira.id,
        nome: linhaCarteira.nome,
        cor: linhaCarteira.cor,
        rotulo: linhaCarteira.rotulo,
        visibilidade: linhaCarteira.visibilidade,
      },
      carteiras,
      contas: (accounts.data ?? [])
        .filter((a) => a.wallet_id === walletId && !a.arquivada)
        .map((a) => ({
          id: a.id as string,
          carteiraID: a.wallet_id as string,
          nome: a.nome as string,
          tipo: a.tipo as Conta["tipo"],
          saldoInicial: a.saldo_inicial_centavos as number,
          arquivada: Boolean(a.arquivada),
        })),
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
          hashDedup: (t.hash_dedup as string) ?? "",
          grupoParcela: (t.grupo_parcela as string | null) ?? undefined,
          parcelaN: (t.parcela_n as number) ?? 1,
          parcelaTotal: (t.parcela_total as number) ?? 1,
        })),
      membros: mapearMembros(linhasMembros, walletId),
      convite: convites.data?.[0]
        ? { codigo: convites.data[0].codigo as string, expiraEm: convites.data[0].expira_em as string }
        : null,
    };
    persistirLocal(proximo);
    setEstado(proximo);
    setPronto(true);
  }, [sb, localKey, persistirLocal, usuario]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const commit = async (proximo: Estado) => {
    setEstado(proximo);
    persistirLocal(proximo);
  };

  const salvarCartao = async (c: Cartao) => {
    const existe = estado.cartoes.some((x) => x.id === c.id);
    const cartoes = existe
      ? estado.cartoes.map((x) => (x.id === c.id ? c : x))
      : [...estado.cartoes, c];
    await commit({ ...estado, cartoes });
    if (sb) {
      await sb.from("cards").upsert({
        id: c.id,
        wallet_id: c.carteiraID,
        apelido: c.apelido,
        banco: c.banco,
        ultimos4: c.ultimos4,
        bandeira: c.bandeira,
        cor: c.cor,
        limite_centavos: c.limite,
        dia_fechamento: c.diaFechamento,
        dia_vencimento: c.diaVencimento,
        arquivado: c.arquivado,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const salvarConta = async (c: Conta) => {
    const existe = estado.contas.some((x) => x.id === c.id);
    const contas = existe
      ? estado.contas.map((x) => (x.id === c.id ? c : x))
      : [...estado.contas, c];
    await commit({ ...estado, contas: contas.filter((x) => !x.arquivada) });
    if (sb) {
      await sb.from("accounts").upsert({
        id: c.id,
        wallet_id: c.carteiraID,
        nome: c.nome,
        tipo: c.tipo,
        saldo_inicial_centavos: c.saldoInicial,
        arquivada: c.arquivada,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const lancar: Loja["lancar"] = async ({
    valor,
    categoriaID,
    descricao,
    data,
    cartaoID,
    contaID,
    parcelas,
  }) => {
    const cartao = estado.cartoes.find((c) => c.id === cartaoID);
    const novas = transacoesDoLancamento({
      valor,
      categoriaID,
      descricao,
      data,
      cartao,
      contaID: cartao ? undefined : contaID,
      parcelas: cartao ? parcelas : 1,
      carteiraID: estado.carteira.id,
    });
    await commit({ ...estado, transacoes: [...estado.transacoes, ...novas] });
    if (sb) {
      await sb.from("transactions").insert(
        novas.map((t) => ({
          id: t.id,
          wallet_id: t.carteiraID,
          tipo: t.tipo,
          valor_centavos: t.valor,
          data: t.data,
          category_id: t.categoriaID ?? null,
          descricao: t.descricao,
          account_id: t.contaID ?? null,
          card_id: t.cartaoID ?? null,
          hash_dedup: t.hashDedup,
          grupo_parcela: t.grupoParcela ?? null,
          parcela_n: t.parcelaN,
          parcela_total: t.parcelaTotal,
        })),
      );
    }
  };

  const editar: Loja["editar"] = async (p) => {
    const transacoes = aplicarEdicao(estado.transacoes, p);
    await commit({ ...estado, transacoes });
    if (sb) {
      const t = transacoes.find((x) => x.id === p.id);
      if (!t) return;
      await sb.from("transactions").update({
        descricao: t.descricao,
        category_id: t.categoriaID ?? null,
        valor_centavos: t.valor,
        updated_at: new Date().toISOString(),
      }).eq("id", t.id);
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
      lembrarCarteira(id);
      await commit({
        carteira: nova,
        carteiras: [...estado.carteiras.filter((c) => c.id !== id), { ...nova, membrosN: 1, souDono: true }],
        contas: [{ id: contaId, carteiraID: id, nome: "Corrente", tipo: "corrente", saldoInicial: 0, arquivada: false }],
        cartoes: [],
        faturas: [],
        transacoes: [],
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
        lembrarCarteira(novaId);
        await commit({
          carteira: nova,
          carteiras: [{ ...nova, membrosN: 1, souDono: true }],
          contas: [
            {
              id: contaId,
              carteiraID: novaId,
              nome: "Corrente",
              tipo: "corrente",
              saldoInicial: 0,
              arquivada: false,
            },
          ],
          cartoes: [],
          faturas: [],
          transacoes: [],
          membros: usuario ? [{ userId: usuario.id, email: usuario.email ?? "", papel: "dono" }] : [],
          convite: null,
        });
        return null;
      }
      const proxima = estado.carteira.id === id ? restantes[0] : null;
      if (proxima) lembrarCarteira(proxima.id);
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
        contas: proxima ? [] : estado.contas,
        cartoes: proxima ? [] : estado.cartoes,
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
    pronto,
    remoto: Boolean(sb),
    recarregar,
    salvarCartao,
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
