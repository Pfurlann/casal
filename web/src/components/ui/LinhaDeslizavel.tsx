"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const LIMIAR = 56;

/**
 * Deslizar para a esquerda revela a ação (marcar pago).
 * Toque na ação confirma. Sem ação, só o conteúdo.
 */
export function LinhaDeslizavel({
  acao,
  children,
  desabilitado,
}: {
  acao?: { rotulo: string; aoClicar: () => void };
  children: ReactNode;
  desabilitado?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const inicio = useRef<number | null>(null);
  const pode = Boolean(acao) && !desabilitado;

  function aoPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!pode) return;
    inicio.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function aoPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (inicio.current == null) return;
    const delta = e.clientX - inicio.current;
    setDx(Math.min(0, Math.max(-88, delta)));
  }

  function aoPointerUp() {
    if (inicio.current == null) return;
    inicio.current = null;
    setDx((atual) => (atual < -LIMIAR ? -88 : 0));
  }

  return (
    <div className="relative overflow-hidden border-b border-nevoa">
      {pode && (
        <button
          type="button"
          onClick={acao!.aoClicar}
          className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-grafite text-[12px] font-semibold text-ar"
        >
          {acao!.rotulo}
        </button>
      )}
      <div
        className="relative bg-ar"
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={aoPointerDown}
        onPointerMove={aoPointerMove}
        onPointerUp={aoPointerUp}
        onPointerCancel={aoPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
