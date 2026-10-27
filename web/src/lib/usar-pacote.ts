"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { carregarPacote, salvarPacote, type PacoteDfcl } from "./dados-dfcl";

/** Pacote importado das planilhas, lido do navegador depois da montagem (sem divergir do servidor). */
export function usePacote() {
  const { usuario } = useAuth();
  const uid = usuario?.id ?? "local";
  const [pacote, setPacote] = useState<PacoteDfcl | null>(null);
  const [lido, setLido] = useState(false);

  useEffect(() => {
    setPacote(carregarPacote(uid));
    setLido(true);
  }, [uid]);

  const definir = useCallback(
    (novo: PacoteDfcl) => {
      salvarPacote(uid, novo);
      setPacote(novo);
    },
    [uid],
  );

  return { pacote, lido, definir };
}
