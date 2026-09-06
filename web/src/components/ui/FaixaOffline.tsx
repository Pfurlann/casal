"use client";

import { useEffect, useState } from "react";
import { tamanhoOutbox } from "@/lib/outbox";
import { useAuth } from "@/lib/auth";

/** Faixa no topo: sem rede e/ou fila de sync pendente. */
export function FaixaOffline({ pendencias = 0 }: { pendencias?: number }) {
  const { usuario } = useAuth();
  const [online, setOnline] = useState(true);
  const [fila, setFila] = useState(pendencias);

  useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine);
      setFila(Math.max(pendencias, tamanhoOutbox(usuario?.id)));
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const t = window.setInterval(sync, 4000);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.clearInterval(t);
    };
  }, [pendencias, usuario?.id]);

  if (online && fila === 0) return null;

  const texto = !online
    ? fila > 0
      ? `Sem rede · ${fila} lançamento${fila === 1 ? "" : "s"} aguardando sync`
      : "Sem rede · você ainda pode lançar; sincroniza quando voltar"
    : `Sincronizando ${fila} lançamento${fila === 1 ? "" : "s"}…`;

  return (
    <div
      role="status"
      className="border-b border-nevoa bg-nevoa px-4 py-2 text-center text-[12px] text-grafite"
    >
      {texto}
    </div>
  );
}
