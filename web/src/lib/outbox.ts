/** Fila offline→online (localStorage por user). Ops: insert | update | soft_delete. */

export type OpOutbox = "insert" | "update" | "soft_delete";
export type TabelaOutbox = "transactions" | "cards" | "accounts" | "invoices";

export type ItemOutbox = {
  id: string;
  criadoEm: string;
  tentativas: number;
  /** Padrão legado / omitido: insert. */
  op?: OpOutbox;
  /** Padrão legado / omitido: transactions. */
  tabela?: TabelaOutbox;
  /**
   * insert: linhas completas.
   * update / soft_delete: não usados (ver `ids` + `patch`).
   * Legado: só `linhas` ⇒ insert em transactions.
   */
  linhas: Record<string, unknown>[];
  /** update / soft_delete: ids alvo (eq id). */
  ids?: string[];
  /** update: campos a setar. soft_delete: { deleted_at, updated_at }. */
  patch?: Record<string, unknown>;
};

export function chaveOutbox(userId?: string | null): string {
  return userId ? `casal-outbox:${userId}` : "casal-outbox";
}

export function eErroRede(erro: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg =
    erro && typeof erro === "object" && "message" in erro
      ? String((erro as { message: unknown }).message)
      : String(erro ?? "");
  return /failed to fetch|network|offline|load failed|fetch failed|timeout|ECONN|ENOTFOUND|networkerror/i.test(
    msg,
  );
}

function normalizarItem(bruto: ItemOutbox): ItemOutbox {
  return {
    ...bruto,
    op: bruto.op ?? "insert",
    tabela: bruto.tabela ?? "transactions",
    linhas: Array.isArray(bruto.linhas) ? bruto.linhas : [],
    ids: Array.isArray(bruto.ids) ? bruto.ids : bruto.ids,
  };
}

export function lerOutbox(userId?: string | null): ItemOutbox[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const bruto = localStorage.getItem(chaveOutbox(userId));
    if (!bruto) return [];
    const parsed = JSON.parse(bruto) as ItemOutbox[];
    return Array.isArray(parsed) ? parsed.map(normalizarItem) : [];
  } catch {
    return [];
  }
}

export function gravarOutbox(itens: ItemOutbox[], userId?: string | null): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(chaveOutbox(userId), JSON.stringify(itens));
}

function novoIdOutbox(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ob-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function empilhar(item: ItemOutbox, userId?: string | null): ItemOutbox {
  const fila = lerOutbox(userId);
  gravarOutbox([...fila, item], userId);
  return item;
}

/**
 * Legado: enfileira insert de transactions (linhas no formato do insert).
 * Preferir `enfileirarOp` para update / soft_delete / outras tabelas.
 */
export function enfileirarOutbox(
  linhas: Record<string, unknown>[],
  userId?: string | null,
): ItemOutbox {
  return empilhar(
    {
      id: novoIdOutbox(),
      criadoEm: new Date().toISOString(),
      tentativas: 0,
      op: "insert",
      tabela: "transactions",
      linhas,
    },
    userId,
  );
}

/** Enfileira insert | update | soft_delete em transactions|cards|accounts|invoices. */
export function enfileirarOp(
  p: {
    op: OpOutbox;
    tabela?: TabelaOutbox;
    linhas?: Record<string, unknown>[];
    ids?: string[];
    patch?: Record<string, unknown>;
  },
  userId?: string | null,
): ItemOutbox {
  const tabela = p.tabela ?? "transactions";
  if (p.op === "insert") {
    const linhas = p.linhas ?? [];
    if (linhas.length === 0) {
      throw new Error("enfileirarOp insert exige linhas");
    }
    return empilhar(
      {
        id: novoIdOutbox(),
        criadoEm: new Date().toISOString(),
        tentativas: 0,
        op: "insert",
        tabela,
        linhas,
      },
      userId,
    );
  }
  const ids = p.ids ?? [];
  if (ids.length === 0) {
    throw new Error(`enfileirarOp ${p.op} exige ids`);
  }
  if (!p.patch || Object.keys(p.patch).length === 0) {
    throw new Error(`enfileirarOp ${p.op} exige patch`);
  }
  return empilhar(
    {
      id: novoIdOutbox(),
      criadoEm: new Date().toISOString(),
      tentativas: 0,
      op: p.op,
      tabela,
      linhas: [],
      ids,
      patch: p.patch,
    },
    userId,
  );
}

export function removerOutbox(id: string, userId?: string | null): void {
  gravarOutbox(
    lerOutbox(userId).filter((i) => i.id !== id),
    userId,
  );
}

export function tamanhoOutbox(userId?: string | null): number {
  return lerOutbox(userId).reduce((n, i) => {
    if ((i.op ?? "insert") === "insert") return n + i.linhas.length;
    return n + (i.ids?.length ?? 0);
  }, 0);
}

type ErroSb = { code?: string; message?: string } | null;

export type ClienteOutbox = {
  from: (tabela: string) => {
    insert: (linhas: Record<string, unknown>[]) => PromiseLike<{ error: ErroSb }>;
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: string) => PromiseLike<{ error: ErroSb }>;
      in: (col: string, vals: string[]) => PromiseLike<{ error: ErroSb }>;
    };
  };
};

/** @deprecated use ClienteOutbox */
export type ClienteInsert = ClienteOutbox;

function contagemItem(item: ItemOutbox): number {
  if ((item.op ?? "insert") === "insert") return item.linhas.length;
  return item.ids?.length ?? 0;
}

async function aplicarItem(sb: ClienteOutbox, item: ItemOutbox): Promise<ErroSb> {
  const op = item.op ?? "insert";
  const tabela = item.tabela ?? "transactions";
  if (op === "insert") {
    const { error } = await sb.from(tabela).insert(item.linhas);
    if (error && error.code === "23505") return null;
    return error;
  }
  const ids = item.ids ?? [];
  const patch = item.patch ?? {};
  if (ids.length === 0) return { message: "outbox sem ids" };
  if (ids.length === 1) {
    const { error } = await sb.from(tabela).update(patch).eq("id", ids[0]!);
    return error;
  }
  const { error } = await sb.from(tabela).update(patch).in("id", ids);
  return error;
}

/** Envia a fila; remove itens ok; 23505 em insert conta como sucesso. */
export async function drenarOutbox(
  sb: ClienteOutbox,
  userId?: string | null,
): Promise<{ enviados: number; restam: number }> {
  const fila = lerOutbox(userId);
  if (fila.length === 0) return { enviados: 0, restam: 0 };
  let enviados = 0;
  const restam: ItemOutbox[] = [];
  for (const item of fila) {
    try {
      const error = await aplicarItem(sb, item);
      if (error) {
        restam.push({ ...item, tentativas: item.tentativas + 1 });
        continue;
      }
      enviados += contagemItem(item);
    } catch {
      restam.push({ ...item, tentativas: item.tentativas + 1 });
    }
  }
  gravarOutbox(restam, userId);
  return { enviados, restam: restam.reduce((n, i) => n + contagemItem(i), 0) };
}
