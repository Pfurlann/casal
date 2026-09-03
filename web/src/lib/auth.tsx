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

export function traduzirErroAuth(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request")) {
    return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  }
  if (m.includes("supabase não configurado") || m.includes("supabase nao configurado")) {
    return "Não foi possível conectar. Tente de novo em instantes.";
  }
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("user already")) return "Esse e-mail já tem conta. Entre com a senha.";
  if (m.includes("password") && m.includes("6")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("email") && m.includes("invalid")) return "E-mail inválido.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Espere um minuto.";
  if (m.includes("notallowed") || m.includes("the operation either timed out or was not allowed") || m.includes("aborted")) {
    return "A biometria foi cancelada.";
  }
  if (m.includes("passkey_disabled")) {
    return "A biometria deste aparelho ainda não está disponível. Entre com e-mail e senha.";
  }
  if (m.includes("webauthn") || m.includes("passkey") || m.includes("does not support webauthn")) {
    return "Não deu para usar a biometria deste aparelho. Entre com e-mail e senha.";
  }
  return msg;
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
        return error ? traduzirErroAuth(error.message) : null;
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
        if (error) return traduzirErroAuth(error.message);
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
      return error ? traduzirErroAuth(error.message) : null;
    });
    return typeof resultado === "string" ? resultado : resultado;
  }, [sb]);

  const registrarPasskey = useCallback(async () => {
    if (!sb) return "Não foi possível conectar. Tente de novo em instantes.";
    const resultado = await comFalha(async () => {
      const { error } = await sb.auth.registerPasskey();
      return error ? traduzirErroAuth(error.message) : null;
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
