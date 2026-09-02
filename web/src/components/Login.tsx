"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function Login() {
  const { entrar, criarConta } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pode = email.trim().includes("@") && senha.length >= 6 && !enviando;

  return (
    <div className="flex h-full min-h-0 flex-col px-6">
      <div className="pt-[max(48px,env(safe-area-inset-top))]">
        <p className="text-[13px] font-semibold tracking-wide" style={{ color: "#7C5CFF" }}>
          ca$al
        </p>
        <h1 className="mt-2 text-[34px] font-bold tracking-tight">
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-2 text-[15px] text-black/45">
          Finanças do casal neste aparelho, com a mesma cara do iPhone.
        </p>
      </div>
      <form
        className="mt-8 flex flex-1 flex-col"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pode) return;
          setEnviando(true);
          setErro(null);
          const falha = modo === "entrar" ? await entrar(email, senha) : await criarConta(email, senha);
          setEnviando(false);
          if (falha) setErro(falha);
        }}
      >
        <label className="block">
          <span className="text-[13px] text-black/40">E-mail</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-[16px] outline-none"
            placeholder="voces@email.com"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-[13px] text-black/40">Senha</span>
          <input
            type="password"
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-[16px] outline-none"
            placeholder="mínimo 6 caracteres"
          />
        </label>
        {erro && <p className="mt-3 text-[13px] text-red-500">{erro}</p>}
        <button
          type="submit"
          disabled={!pode}
          className="mt-6 min-h-12 rounded-xl text-[16px] font-bold text-white disabled:bg-black/20"
          style={{ background: pode ? "#7C5CFF" : undefined }}
        >
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
        <button
          type="button"
          className="mt-4 text-[15px]"
          style={{ color: "#7C5CFF" }}
          onClick={() => {
            setErro(null);
            setModo((m) => (m === "entrar" ? "criar" : "entrar"));
          }}
        >
          {modo === "entrar" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
        </button>
      </form>
    </div>
  );
}
