"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { traduzirErroAuth } from "@/lib/login-erros";
import {
  apagarEmailLembrado,
  avisoOrigemPasskey,
  biometriaDoAparelhoDisponivel,
  gravarEmailLembrado,
  guardarSenhaNoAparelho,
  lerEmailLembrado,
  rotuloBiometria,
  textoBotaoBiometria,
  validarLogin,
} from "@/lib/login-aparelho";
import { ForcarTemaClaro } from "@/lib/tema";
import { Assinatura } from "../marca/Assinatura";
import { Botao } from "../ui/Botao";
import { Campo } from "../ui/Campo";

export function Entrar() {
  const { entrar, criarConta, entrarComPasskey, registrarPasskey, pronto, sessao } = useAuth();
  const router = useRouter();
  const idSalvar = useId();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [salvar, setSalvar] = useState(true);
  const [biometria, setBiometria] = useState(false);
  const [rotuloBio, setRotuloBio] = useState("biometria deste aparelho");
  const [etapa, setEtapa] = useState<"form" | "biometria">("form");
  const [acabouDeEntrar, setAcabouDeEntrar] = useState(false);

  const rotulo = modo === "entrar" ? "Entrar" : "Criar conta";

  useEffect(() => {
    setEmail(lerEmailLembrado());
    setRotuloBio(rotuloBiometria());
    void biometriaDoAparelhoDisponivel().then(setBiometria);
  }, []);

  useEffect(() => {
    if (pronto && sessao && !acabouDeEntrar && etapa === "form") {
      router.replace("/mes");
    }
  }, [pronto, sessao, acabouDeEntrar, etapa, router]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const invalido = validarLogin(email, senha);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const falha = modo === "entrar" ? await entrar(email, senha) : await criarConta(email, senha);
      if (falha) {
        setErro(falha);
        return;
      }
      if (salvar) {
        gravarEmailLembrado(email);
        void guardarSenhaNoAparelho(email, senha);
      } else {
        apagarEmailLembrado();
      }
      setAcabouDeEntrar(true);
      if (biometria) setEtapa("biometria");
      else router.replace("/mes");
    } catch (err) {
      setErro(
        err instanceof Error && err.message
          ? err.message
          : "Sem conexão com o servidor. Confira a internet e tente de novo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function ativarBiometria() {
    const origem = avisoOrigemPasskey();
    if (origem) {
      setErro(origem);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const falha = await registrarPasskey();
      if (falha) {
        setErro(falha);
        return;
      }
      router.replace("/mes");
    } catch (err) {
      setErro(
        traduzirErroAuth(err instanceof Error ? err.message : "Falha ao ativar o Face ID."),
      );
    } finally {
      setEnviando(false);
    }
  }

  async function entrarBiometria() {
    const origem = avisoOrigemPasskey();
    if (origem) {
      setErro(origem);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const falha = await entrarComPasskey();
      if (falha) {
        setErro(falha);
        return;
      }
      router.replace("/mes");
    } catch (err) {
      setErro(
        traduzirErroAuth(err instanceof Error ? err.message : "Falha ao entrar com a biometria."),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ForcarTemaClaro>
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-ar px-6 text-grafite">
        <div className="pt-[max(48px,env(safe-area-inset-top))]">
          <Assinatura variante="base" largura={132} />
          <h1 className="mt-8 font-texto text-[17px] font-semibold tracking-[-0.02em] text-grafite">
            {etapa === "biometria" ? `Entrar com ${rotuloBio}` : rotulo}
          </h1>
          <p className="mt-2 text-[14px] text-cinza">
            {etapa === "biometria"
              ? `Na próxima vez, use o ${rotuloBio} deste aparelho. E-mail e senha continuam valendo.`
              : "Gastos, cartões e contas do casal, num lugar só."}
          </p>
        </div>

        {erro && (
          <p role="alert" className="mt-6 text-[14px] text-ambar-texto">
            {erro}
          </p>
        )}

        {etapa === "biometria" ? (
          <div className="relative z-10 mt-8 flex flex-1 flex-col">
            <Botao variante="primario" disabled={enviando} onClick={() => void ativarBiometria()}>
              {enviando ? "Aguarde…" : `Ativar ${rotuloBio}`}
            </Botao>
            <div className="mt-4">
              <Botao variante="secundario" disabled={enviando} onClick={() => router.replace("/mes")}>
                Agora não
              </Botao>
            </div>
          </div>
        ) : (
          <form className="relative z-10 mt-8 flex flex-1 flex-col" onSubmit={(e) => void enviar(e)}>
            <Campo
              label="E-mail"
              value={email}
              onChange={setEmail}
              inputMode="email"
              autoComplete="username"
            />
            <Campo
              label="Senha"
              value={senha}
              onChange={setSenha}
              erro={erro ?? undefined}
              tipo="senha"
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            />
            <label
              htmlFor={idSalvar}
              className="mt-4 flex min-h-[44px] items-center gap-3 text-[14px] text-grafite"
            >
              <input
                id={idSalvar}
                type="checkbox"
                checked={salvar}
                onChange={(e) => setSalvar(e.target.checked)}
                className="size-5 accent-grafite"
              />
              Salvar login neste aparelho
            </label>
            <div className="mt-6">
              <Botao variante="primario" type="submit" disabled={enviando}>
                {enviando ? "Aguarde…" : rotulo}
              </Botao>
            </div>
            {biometria && modo === "entrar" && (
              <div className="mt-4">
                <Botao variante="secundario" disabled={enviando} onClick={() => void entrarBiometria()}>
                  {textoBotaoBiometria()}
                </Botao>
              </div>
            )}
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
        )}
      </div>
    </ForcarTemaClaro>
  );
}
