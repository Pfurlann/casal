"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Sobreposição que prende o foco enquanto está aberta e devolve ao
 * elemento de origem ao fechar — requisito 6 da seção 12 da spec.
 */
export function Folha({
  aoFechar,
  children,
  rotulo = "Novo gasto",
  trava = false,
}: {
  aoFechar: () => void;
  children: ReactNode;
  rotulo?: string;
  trava?: boolean;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const origem = useRef<Element | null>(null);

  useEffect(() => {
    origem.current = document.activeElement;
    const primeiro = caixa.current?.querySelector<HTMLElement>(FOCAVEIS);
    primeiro?.focus();
    return () => {
      if (origem.current instanceof HTMLElement) origem.current.focus();
    };
  }, []);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        aoFechar();
        return;
      }
      if (e.key !== "Tab" || !caixa.current) return;

      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      if (e.shiftKey && (atual === primeiro || !caixa.current.contains(atual))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      {/*
        Botão (não div) + faixa acima da safe-area: no iPhone/PWA o fundo a 92dvh
        caía na status bar e o tap “fora” não registrava.
      */}
      <button
        type="button"
        data-testid="folha-fundo"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 z-0 cursor-default bg-grafite/40"
      />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className={`relative z-10 flex w-full max-w-[430px] flex-col rounded-t-[22px] bg-ar shadow-elevacao sm:rounded-[22px] lg:max-w-[560px] ${
          trava
            ? "h-[calc(100dvh-max(56px,env(safe-area-inset-top)+24px))] min-h-0 overflow-hidden sm:h-[min(840px,88dvh)]"
            : "max-h-[calc(100dvh-max(56px,env(safe-area-inset-top)+24px))] overflow-y-auto sm:max-h-[min(840px,88dvh)] lg:max-h-[min(840px,88dvh)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
