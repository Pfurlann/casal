"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatarBRL } from "@/lib/money";

const TAMANHO = {
  heroi: "text-[36px] tracking-[-0.03em] lg:text-[48px]",
  secao: "text-[24px] tracking-[-0.03em] lg:text-[30px]",
  corpo: "text-[14px] lg:text-[15px]",
  legenda: "text-[12px]",
} as const;

const TOM = {
  normal: "text-grafite",
  atencao: "text-ambar-texto",
} as const;

const DURACAO_MS = 720;

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function prefereMenosMovimento(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Único formatador de dinheiro da interface.
 *
 * Monoespaçada tabular não é estética: é o motivo pelo qual o valor não
 * dança quando o dígito muda e pelo qual coluna de dinheiro alinha.
 */
export function Numero({
  centavos,
  tamanho,
  tom = "normal",
  subordinaCentavos = false,
  animar = false,
}: {
  centavos: number;
  tamanho: keyof typeof TAMANHO;
  tom?: keyof typeof TOM;
  subordinaCentavos?: boolean;
  animar?: boolean;
}) {
  const classe = `font-numero font-medium tabular-nums ${TAMANHO[tamanho]} ${TOM[tom]}`;

  const devePular = !animar || process.env.VITEST || prefereMenosMovimento();
  const [valorAtual, setValorAtual] = useState(devePular ? centavos : 0);
  const rafRef = useRef<number | null>(null);
  const inicioRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (devePular) {
      setValorAtual(centavos);
      return;
    }

    inicioRef.current = null;

    function tick(timestamp: number) {
      if (inicioRef.current === null) {
        inicioRef.current = timestamp;
      }
      const elapsed = timestamp - inicioRef.current;
      const progress = Math.min(elapsed / DURACAO_MS, 1);
      const easedProgress = easeOutQuart(progress);

      setValorAtual(Math.round(easedProgress * centavos));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [centavos, devePular]);

  const texto = formatarBRL(valorAtual);

  if (!subordinaCentavos) {
    return <span className={classe}>{texto}</span>;
  }

  const corte = texto.lastIndexOf(",");
  const inteiro = texto.slice(0, corte);
  const resto = texto.slice(corte);

  return (
    <span className={classe}>
      {inteiro}
      <span className="text-[47%] opacity-[0.42]">{resto}</span>
    </span>
  );
}
