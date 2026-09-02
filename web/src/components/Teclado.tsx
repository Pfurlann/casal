"use client";

import { IconeApagar, IconeMaisOpcoes } from "./Icones";

export function Teclado({
  aoDigitar,
  aoApagar,
  aoSalvar,
  aoMaisOpcoes,
  podeSalvar,
  mostraSalvar = false,
}: {
  aoDigitar: (d: number) => void;
  aoApagar: () => void;
  aoSalvar?: () => void;
  aoMaisOpcoes?: () => void;
  podeSalvar?: boolean;
  mostraSalvar?: boolean;
}) {
  return (
    <div className="bg-[#f2f2f7] px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <div className="mb-1.5 flex justify-end">
        <button
          type="button"
          onClick={aoApagar}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-black/5 text-lg text-[#3c3c43]"
          aria-label="Apagar último dígito"
        >
          <IconeApagar size={22} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Tecla key={n} onClick={() => aoDigitar(n)}>
            {n}
          </Tecla>
        ))}
        {mostraSalvar && aoMaisOpcoes ? (
          <Tecla onClick={aoMaisOpcoes} ariaLabel="Mais opções">
            <span className="inline-flex items-center justify-center"><IconeMaisOpcoes size={22} /></span>
          </Tecla>
        ) : (
          <div />
        )}
        <Tecla onClick={() => aoDigitar(0)}>0</Tecla>
        {mostraSalvar ? (
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={aoSalvar}
            className="min-h-14 rounded-xl text-[16px] font-bold text-white disabled:bg-black/20"
            style={{ background: podeSalvar ? "#7C5CFF" : undefined }}
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
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex min-h-14 items-center justify-center rounded-xl bg-black/[0.06] text-[24px] font-semibold tabular-nums"
    >
      {children}
    </button>
  );
}
