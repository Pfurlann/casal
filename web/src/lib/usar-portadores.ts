"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { lerPortadores, type ClienteRemoto } from "./dfcl-remoto";
import type { Portador } from "./portadores";
import { useLoja } from "./store";
import { clienteSupabase } from "./supabase";

/** Portadores gravados no banco para a carteira ativa. Vazio sem banco ou sem login. */
export function usePortadores(): Portador[] {
  const { usuario } = useAuth();
  const { carteira, pronto } = useLoja();
  const [lista, setLista] = useState<Portador[]>([]);

  useEffect(() => {
    const sb = clienteSupabase() as unknown as ClienteRemoto | null;
    if (!usuario || !pronto || !sb) return;
    let ativo = true;
    lerPortadores(sb, carteira.id)
      .then((r) => {
        if (ativo) setLista(r);
      })
      .catch(() => {
        /* sem rede: segue com o que o arquivo importado trouxer */
      });
    return () => {
      ativo = false;
    };
  }, [usuario, pronto, carteira.id]);

  return lista;
}
