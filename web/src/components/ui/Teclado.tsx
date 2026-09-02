"use client";

import { useEffect } from "react";
import { IconeApagar, IconeMaisOpcoes } from "@/components/Icones";

function emCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || alvo.isContentEditable;
}

export function Teclado({
  aoDigitar,
  aoApagar,
  aoSalvar,
  aoFechar,
  aoMaisOpcoes,
  podeSalvar = false,
  mostraSalvar = false,
}: {
  aoDigitar: (d: number) => void;
  aoApagar: () => void;
  aoSalvar?: () => void;
  aoFechar?: () => void;
  aoMaisOpcoes?: () => void;
  podeSalvar?: boolean;
  mostraSalvar?: boolean;
}) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (emCampoDeTexto(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        aoDigitar(Number(e.key));
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        aoApagar();
        return;
      }
      if (e.key === "Enter" && aoSalvar && podeSalvar) {
        e.preventDefault();
        aoSalvar();
        return;
      }
      if (e.key === "Escape" && aoFechar) {
        e.preventDefault();
        aoFechar();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoDigitar, aoApagar, aoSalvar, aoFechar, podeSalvar]);

  return (
    <div className="px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={aoApagar}
          aria-label="Apagar último dígito"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-controle text-grafite"
        >
          <IconeApagar size={22} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Tecla key={n} aoClicar={() => aoDigitar(n)}>
            {n}
          </Tecla>
        ))}
        {mostraSalvar && aoMaisOpcoes ? (
          <Tecla aoClicar={aoMaisOpcoes} rotulo="Mais opções">
            <IconeMaisOpcoes size={22} />
          </Tecla>
        ) : (
          <div />
        )}
        <Tecla aoClicar={() => aoDigitar(0)}>0</Tecla>
        {mostraSalvar ? (
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={aoSalvar}
            className="min-h-[44px] rounded-controle bg-grafite font-texto text-[14px] font-semibold uppercase tracking-[0.1em] text-ar disabled:opacity-40"
          >
            Salvar
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function Tecla({
  children,
  aoClicar,
  rotulo,
}: {
  children: React.ReactNode;
  aoClicar: () => void;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      className="flex min-h-[44px] items-center justify-center rounded-controle border border-nevoa font-numero text-[18px] tabular-nums text-grafite"
    >
      {children}
    </button>
  );
}
