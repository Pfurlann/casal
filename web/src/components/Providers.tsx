"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LojaProvider, useLoja } from "@/lib/store";
import { ForcarTemaClaro } from "@/lib/tema";
import { FaixaOffline } from "@/components/ui/FaixaOffline";

function FaixaSync() {
  const { pendenciasOutbox } = useLoja();
  return <FaixaOffline pendencias={pendenciasOutbox} />;
}

function ComSessao({ children }: { children: ReactNode }) {
  const { pronto, precisaLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (pronto && precisaLogin) router.replace("/entrar");
  }, [pronto, precisaLogin, router]);

  if (!pronto || precisaLogin) {
    const splash = (
      <div className="flex h-full items-center justify-center bg-ar text-[12px] text-cinza">
        Carregando…
      </div>
    );
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
