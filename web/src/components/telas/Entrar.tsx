"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Assinatura } from "../marca/Assinatura";
import { Botao } from "../ui/Botao";
import { Campo } from "../ui/Campo";

export function Entrar() {
  const { entrar, criarConta } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pode = email.trim().includes("@") && senha.length >= 6 && !enviando;
  const rotulo = modo === "entrar" ? "Entrar" : "Criar conta";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6">
      <div className="pt-[max(48px,env(safe-area-inset-top))]">
        <Assinatura variante="base" largura={132} />
        <h1 className="mt-8 font-texto text-[17px] font-semibold tracking-[-0.02em] text-grafite">
          {rotulo}
        </h1>
        <p className="mt-2 text-[14px] text-cinza">
          Gastos, cartões e contas do casal, num lugar só.
        </p>
      </div>

      <form
        className="mt-8 flex flex-1 flex-col"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pode) return;
          setEnviando(true);
          setErro(null);
          const falha =
            modo === "entrar"
              ? await entrar(email, senha)
              : await criarConta(email, senha);
          setEnviando(false);
          if (falha) setErro(falha);
        }}
      >
        <Campo
          label="E-mail"
          value={email}
          onChange={setEmail}
          inputMode="email"
          autoComplete="email"
        />
        <Campo
          label="Senha"
          value={senha}
          onChange={setSenha}
          erro={erro ?? undefined}
          tipo="senha"
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
        />
        <div className="mt-6">
          <Botao variante="primario" type="submit" disabled={!pode}>
            {enviando ? "Aguarde…" : rotulo}
          </Botao>
        </div>
        <div className="mt-4">
          <Botao
            variante="secundario"
            onClick={() => {
              setErro(null);
              setModo((m) => (m === "entrar" ? "criar" : "entrar"));
            }}
          >
            {modo === "entrar" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
          </Botao>
        </div>
      </form>
    </div>
  );
}
