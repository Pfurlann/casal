"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LojaProvider } from "@/lib/store";
import { ForcarTemaClaro } from "@/lib/tema";

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
  return <LojaProvider>{children}</LojaProvider>;
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
