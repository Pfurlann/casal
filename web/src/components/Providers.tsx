"use client";

import { AuthProvider, useAuth } from "@/lib/auth";
import { LojaProvider } from "@/lib/store";
import { Login } from "./Login";
import { useEffect, type ReactNode } from "react";

function TelaCarregando({ texto }: { texto: string }) {
  return (
    <div className="casal-shell">
      <div className="casal-phone">
        <div className="flex h-full items-center justify-center text-sm text-black/40">{texto}</div>
      </div>
    </div>
  );
}

function ComSessao({ children }: { children: ReactNode }) {
  const { pronto, precisaLogin } = useAuth();
  if (!pronto) return <TelaCarregando texto="Carregando…" />;
  if (precisaLogin) {
    return (
      <div className="casal-shell">
        <div className="casal-phone">
          <Login />
        </div>
      </div>
    );
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
