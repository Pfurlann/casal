/** Fila offline→online de inserts de transações (idempotente por id / 23505). */

export type ItemOutbox = {
  id: string;
  criadoEm: string;
  tentativas: number;
  /** Linhas no formato do insert em `transactions`. */
  linhas: Record<string, unknown>[];
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

export function lerOutbox(userId?: string | null): ItemOutbox[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const bruto = localStorage.getItem(chaveOutbox(userId));
    if (!bruto) return [];
    const parsed = JSON.parse(bruto) as ItemOutbox[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function gravarOutbox(itens: ItemOutbox[], userId?: string | null): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(chaveOutbox(userId), JSON.stringify(itens));
}

export function enfileirarOutbox(
  linhas: Record<string, unknown>[],
  userId?: string | null,
): ItemOutbox {
  const item: ItemOutbox = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ob-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
    linhas,
  };
  const fila = lerOutbox(userId);
  gravarOutbox([...fila, item], userId);
  return item;
}

export function removerOutbox(id: string, userId?: string | null): void {
  gravarOutbox(
    lerOutbox(userId).filter((i) => i.id !== id),
    userId,
  );
}

export function tamanhoOutbox(userId?: string | null): number {
  return lerOutbox(userId).reduce((n, i) => n + i.linhas.length, 0);
}

export type ClienteInsert = {
  from: (tabela: string) => {
    insert: (linhas: Record<string, unknown>[]) => PromiseLike<{
      error: { code?: string; message?: string } | null;
    }>;
  };
};

/** Envia a fila; remove itens ok; 23505 conta como sucesso. */
export async function drenarOutbox(
  sb: ClienteInsert,
  userId?: string | null,
): Promise<{ enviados: number; restam: number }> {
  const fila = lerOutbox(userId);
  if (fila.length === 0) return { enviados: 0, restam: 0 };
  let enviados = 0;
  const restam: ItemOutbox[] = [];
  for (const item of fila) {
    try {
      const { error } = await sb.from("transactions").insert(item.linhas);
      if (error && error.code !== "23505") {
        restam.push({ ...item, tentativas: item.tentativas + 1 });
        continue;
      }
      enviados += item.linhas.length;
    } catch {
      restam.push({ ...item, tentativas: item.tentativas + 1 });
    }
  }
  gravarOutbox(restam, userId);
  return { enviados, restam: restam.reduce((n, i) => n + i.linhas.length, 0) };
}
