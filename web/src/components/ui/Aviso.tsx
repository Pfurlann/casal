"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tipo = "erro" | "ok";
type Estado = { tipo: Tipo; texto: string } | null;

const Ctx = createContext<{ avisar: (tipo: Tipo, texto: string) => void } | null>(null);

export function useAviso() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAviso fora do provedor");
  return v;
}

export function ProvedorAviso({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(null);
  const avisar = useCallback((tipo: Tipo, texto: string) => {
    setEstado({ tipo, texto });
  }, []);

  return (
    <Ctx.Provider value={{ avisar }}>
      {estado && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 border-b border-nevoa px-4 py-3 text-[12px]"
        >
          <span className={estado.tipo === "erro" ? "text-ambar-texto" : "text-grafite"}>
            {estado.texto}
          </span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setEstado(null)}
            className="ml-auto min-h-[44px] min-w-[44px] text-cinza"
          >
            ×
          </button>
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}
