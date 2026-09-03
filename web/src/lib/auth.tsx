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
import type { Session, User } from "@supabase/supabase-js";
import { textoFalha, traduzirErroAuth } from "./login-erros";
import { clienteSupabase } from "./supabase";

export { traduzirErroAuth } from "./login-erros";

type Auth = {
  pronto: boolean;
  remoto: boolean;
  sessao: Session | null;
  usuario: User | null;
  precisaLogin: boolean;
  entrar: (email: string, senha: string) => Promise<string | null>;
  criarConta: (email: string, senha: string) => Promise<string | null>;
  entrarComPasskey: () => Promise<string | null>;
  registrarPasskey: () => Promise<string | null>;
  sair: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora do provider");
  return v;
}

async function comFalha<T>(fn: () => Promise<T>): Promise<T | string> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sem conexão com o servidor.";
    return traduzirErroAuth(msg);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const sb = useMemo(() => clienteSupabase(), []);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!sb) {
      setPronto(true);
      return;
    }
    void sb.auth
      .getSession()
      .then(({ data }) => {
        setSessao(data.session);
      })
      .catch(() => {
        // rede/Supabase fora: a tela de login precisa aparecer, não ficar muda
      })
      .finally(() => setPronto(true));
    const { data } = sb.auth.onAuthStateChange((_evento, proxima) => {
      setSessao(proxima);
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      if (!sb) return "Não foi possível conectar. Tente de novo em instantes.";
      const resultado = await comFalha(async () => {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
        return textoFalha(error);
      });
      return typeof resultado === "string" ? resultado : resultado;
    },
    [sb],
  );

  const criarConta = useCallback(
    async (email: string, senha: string) => {
      if (!sb) return "Não foi possível conectar. Tente de novo em instantes.";
      const resultado = await comFalha(async () => {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password: senha });
        if (error) return textoFalha(error);
        if (!data.session) {
          const { error: errEntrar } = await sb.auth.signInWithPassword({
            email: email.trim(),
            password: senha,
          });
          if (errEntrar) {
            return "Conta criada. Se o e-mail de confirmação estiver ligado no Supabase, confirme e entre de novo.";
          }
        }
        return null;
      });
      return typeof resultado === "string" ? resultado : resultado;
    },
    [sb],
  );

  const entrarComPasskey = useCallback(async () => {
    if (!sb) return "Não foi possível conectar. Tente de novo em instantes.";
    const resultado = await comFalha(async () => {
      const { error } = await sb.auth.signInWithPasskey();
      return textoFalha(error);
    });
    return typeof resultado === "string" ? resultado : resultado;
  }, [sb]);

  const registrarPasskey = useCallback(async () => {
    if (!sb) return "Não foi possível conectar. Tente de novo em instantes.";
    const resultado = await comFalha(async () => {
      const { error } = await sb.auth.registerPasskey();
      return textoFalha(error);
    });
    return typeof resultado === "string" ? resultado : resultado;
  }, [sb]);

  const sair = useCallback(async () => {
    if (!sb) return;
    await sb.auth.signOut();
  }, [sb]);

  const valor: Auth = {
    pronto,
    remoto: Boolean(sb),
    sessao,
    usuario: sessao?.user ?? null,
    precisaLogin: Boolean(sb) && !sessao,
    entrar,
    criarConta,
    entrarComPasskey,
    registrarPasskey,
    sair,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
