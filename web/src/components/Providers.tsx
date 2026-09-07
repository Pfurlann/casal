"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LojaProvider, useLoja } from "@/lib/store";
import { ForcarTemaClaro } from "@/lib/tema";
import { FaixaOffline } from "@/components/ui/FaixaOffline";
import { Esqueleto } from "@/components/ui/Esqueleto";

/** Shell visível enquanto auth/loja carregam — evita tela morta só com “Carregando…”. */
function ShellCarregando({ mensagem }: { mensagem: string }) {
  return (
    <div className="casal-shell" aria-busy="true">
      <nav
        aria-label="Seções"
        className={
          "fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-nevoa bg-ar " +
          "pb-[env(safe-area-inset-bottom)] " +
          "lg:sticky lg:top-0 lg:h-dvh lg:w-[260px] lg:shrink-0 lg:flex-col lg:items-stretch " +
          "lg:overflow-y-auto lg:border-r lg:border-t-0 lg:px-4 lg:pt-8 lg:pb-0"
        }
      >
        <div className="hidden lg:mb-10 lg:block lg:px-2">
          <Esqueleto className="h-8 w-28" />
        </div>
        {["mês", "relatórios", "cartões", "metas", "mais"].map((nome) => (
          <div
            key={nome}
            className="flex flex-1 flex-col items-center justify-center gap-1 lg:mt-1 lg:w-full lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2"
          >
            <Esqueleto className="h-5 w-5 rounded-full" />
            <Esqueleto className="h-2.5 w-10 lg:w-16" />
          </div>
        ))}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[68px] lg:hidden">
          <Esqueleto className="h-[52px] w-[52px] rounded-etiqueta" />
        </div>
        <div className="mt-auto hidden lg:flex lg:flex-col lg:gap-3 lg:px-2 lg:pb-8 lg:pt-6">
          <Esqueleto className="h-6 w-20 rounded-etiqueta" />
          <Esqueleto className="h-3 w-36" />
          <Esqueleto className="h-3 w-10" />
          <Esqueleto className="h-[44px] w-full rounded-controle" />
        </div>
      </nav>
      <main className="casal-principal">
        <div role="status" className="space-y-4 px-4 pt-8 lg:px-0">
          <Esqueleto className="h-4 w-36" />
          <Esqueleto className="h-10 w-52" />
          <Esqueleto className="h-3 w-full" />
          <Esqueleto className="h-3 w-4/5" />
          <Esqueleto className="mt-6 h-24 w-full" />
          <p className="pt-2 text-center text-[12px] text-cinza">{mensagem}</p>
        </div>
      </main>
    </div>
  );
}

function FaixaSync() {
  const { pendenciasOutbox, pronto } = useLoja();
  return (
    <>
      {!pronto && (
        <div
          role="status"
          className="border-b border-nevoa bg-nevoa px-4 py-2 text-center text-[12px] text-grafite"
        >
          Carregando dados…
        </div>
      )}
      <FaixaOffline pendencias={pendenciasOutbox} />
    </>
  );
}

function ComSessao({ children }: { children: ReactNode }) {
  const { pronto, precisaLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (pronto && precisaLogin) router.replace("/entrar");
  }, [pronto, precisaLogin, router]);

  if (!pronto || precisaLogin) {
    const splash = <ShellCarregando mensagem={precisaLogin && pronto ? "Redirecionando…" : "Carregando…"} />;
    return pronto && precisaLogin ? <ForcarTemaClaro>{splash}</ForcarTemaClaro> : splash;
  }
  return (
    <LojaProvider>
      <FaixaSync />
      {children}
    </LojaProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return (
    <AuthProvider>
      <ComSessao>{children}</ComSessao>
    </AuthProvider>
  );
}
