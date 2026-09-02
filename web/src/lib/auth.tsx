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
import { clienteSupabase } from "./supabase";

type Auth = {
  pronto: boolean;
  remoto: boolean;
  sessao: Session | null;
  usuario: User | null;
  precisaLogin: boolean;
  entrar: (email: string, senha: string) => Promise<string | null>;
  criarConta: (email: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora do provider");
  return v;
}

function traduzirErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("user already")) return "Esse e-mail já tem conta. Entre com a senha.";
  if (m.includes("password") && m.includes("6")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("email") && m.includes("invalid")) return "E-mail inválido.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Espere um minuto.";
  return msg;
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
    void sb.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setPronto(true);
    });
    const { data } = sb.auth.onAuthStateChange((_evento, proxima) => {
      setSessao(proxima);
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      if (!sb) return "Supabase não configurado.";
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
      return error ? traduzirErro(error.message) : null;
    },
    [sb],
  );

  const criarConta = useCallback(
    async (email: string, senha: string) => {
      if (!sb) return "Supabase não configurado.";
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password: senha });
      if (error) return traduzirErro(error.message);
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
    },
    [sb],
  );

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
    sair,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
