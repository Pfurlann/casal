"use client";

import { COR_AR, COR_GRAFITE } from "@/design/tema-chrome";
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

function coresChrome(tema: Tema): { clara: string; escura: string } {
  switch (tema) {
    case "claro":
      return { clara: COR_AR, escura: COR_AR };
    case "escuro":
      return { clara: COR_GRAFITE, escura: COR_GRAFITE };
    case "sistema":
      return { clara: COR_AR, escura: COR_GRAFITE };
    default: {
      const _esgotado: never = tema;
      return _esgotado;
    }
  }
}

function aplicarChrome(tema: Tema) {
  const { clara, escura } = coresChrome(tema);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute("media") ?? "";
    meta.setAttribute("content", media.includes("dark") ? escura : clara);
  });
}

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", tema);
  aplicarChrome(tema);
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
