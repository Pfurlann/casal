"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Tema = "sistema" | "claro" | "escuro";

const CHAVE = "casal-tema";
const VALIDOS: Tema[] = ["sistema", "claro", "escuro"];

function guardado(): Tema {
  try {
    const v = localStorage.getItem(CHAVE);
    return VALIDOS.includes(v as Tema) ? (v as Tema) : "sistema";
  } catch {
    return "sistema";
  }
}

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", tema);
}

const Ctx = createContext<{ tema: Tema; escolher: (t: Tema) => void } | null>(null);

export function useTema() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTema fora do provedor");
  return v;
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() =>
    typeof window === "undefined" ? "sistema" : guardado(),
  );

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  const escolher = useCallback((t: Tema) => {
    setTema(t);
    try {
      localStorage.setItem(CHAVE, t);
    } catch {
      // navegador com armazenamento bloqueado: a escolha vale só nesta sessão
    }
  }, []);

  return <Ctx.Provider value={{ tema, escolher }}>{children}</Ctx.Provider>;
}
