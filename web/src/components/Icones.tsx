"use client";

import type { ReactNode, SVGProps } from "react";

const comum: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function Svg({ size = 22, children, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg {...comum} width={size} height={size} {...rest}>
      {children}
    </svg>
  );
}

export function IconeVoltar({ size = 22 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M15 5 7 12l8 7" />
    </Svg>
  );
}

export function IconeApagar({ size = 22 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M9.5 6H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 18H9.5L3 12l6.5-6Z" />
      <path d="m13 10 4 4M17 10l-4 4" />
    </Svg>
  );
}

export function IconeMaisOpcoes({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18" cy="12" r="1.7" />
    </svg>
  );
}

export function IconePessoas({ size = 22 }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.4-3.2 2.5-5 5.5-5s5.1 1.8 5.5 5" />
      <circle cx="16.5" cy="9" r="2.4" />
      <path d="M16 14c2.6.3 4.4 1.9 4.8 4.4" />
    </Svg>
  );
}

export function IconeChevron({ size = 18 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function IconeVazio({ size = 36 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7" />
    </Svg>
  );
}

export function IconeCartao({ size = 36 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
      <path d="M2.5 10h19" />
      <path d="M6 15.2h4" />
    </Svg>
  );
}

export function IconeBanco({ size = 36 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 18h18M12 4 3.5 9h17L12 4Z" />
    </Svg>
  );
}

export function IconeMeta({ size = 36 }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

const categorias: Record<string, (size: number) => ReactNode> = {
  mercado: (s) => (
    <Svg size={s}>
      <path d="M5 7h14l-1.2 9.2A2 2 0 0 1 15.8 18H8.2a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M8 7V6a4 4 0 0 1 8 0v1" />
    </Svg>
  ),
  restaurante: (s) => (
    <Svg size={s}>
      <path d="M8 4v7M6 4v4a2 2 0 0 0 4 0V4M8 11v9M16 4v16M16 4c2 2 2 5 0 7" />
    </Svg>
  ),
  combustivel: (s) => (
    <Svg size={s}>
      <rect x="4" y="4" width="10" height="16" rx="1.6" />
      <path d="M7 8h4M16 7h2.2A1.8 1.8 0 0 1 20 8.8V15a2 2 0 0 1-2 2h-1" />
    </Svg>
  ),
  transporte: (s) => (
    <Svg size={s}>
      <path d="M4 14h16l-1.4-6.2A2 2 0 0 0 16.7 6H7.3a2 2 0 0 0-1.9 1.8L4 14Z" />
      <path d="M6 14v2.5M18 14v2.5" />
      <circle cx="7.5" cy="15.5" r="1.5" />
      <circle cx="16.5" cy="15.5" r="1.5" />
    </Svg>
  ),
  moradia: (s) => (
    <Svg size={s}>
      <path d="m3 11 9-7 9 7" />
      <path d="M6 10.5V19h12v-8.5" />
    </Svg>
  ),
  saude: (s) => (
    <Svg size={s}>
      <rect x="9" y="4" width="6" height="16" rx="1" />
      <rect x="4" y="9" width="16" height="6" rx="1" />
    </Svg>
  ),
  educacao: (s) => (
    <Svg size={s}>
      <path d="M4 9.5 12 5l8 4.5-8 4.5L4 9.5Z" />
      <path d="M7 12v4.5c2 1.5 8 1.5 10 0V12" />
    </Svg>
  ),
  lazer: (s) => (
    <Svg size={s}>
      <rect x="3" y="8" width="18" height="10" rx="3" />
      <path d="M8 13h.01M16 12v2M15 13h2" />
    </Svg>
  ),
  assinaturas: (s) => (
    <Svg size={s}>
      <path d="M7 7a6 6 0 0 1 10 0M17 7h3.5M17 7V3.5M17 17a6 6 0 0 1-10 0M7 17H3.5M7 17v3.5" />
    </Svg>
  ),
  vestuario: (s) => (
    <Svg size={s}>
      <path d="M8 6.5 12 9l4-2.5 3 2.5-2 2.5V20H7V11L5 8.5 8 6.5Z" />
    </Svg>
  ),
  presentes: (s) => (
    <Svg size={s}>
      <rect x="4" y="10" width="16" height="10" rx="1.2" />
      <path d="M4 14h16M12 10v10M12 10c0-3 4-4 5-2s-3 3-5 2Zm0 0c0-3-4-4-5-2s3 3 5 2Z" />
    </Svg>
  ),
  outros: (s) => (
    <Svg size={s}>
      <circle cx="12" cy="12" r="7.5" />
    </Svg>
  ),
  salario: (s) => (
    <Svg size={s}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
    </Svg>
  ),
  reembolso: (s) => (
    <Svg size={s}>
      <path d="M9 7H5v4" />
      <path d="M5 11a7 7 0 1 0 2-5.5" />
    </Svg>
  ),
};

export function IconeCategoria({ nome, size = 16 }: { nome?: string; size?: number }) {
  const desenhar = categorias[nome ?? ""] ?? categorias.outros;
  return <>{desenhar(size)}</>;
}

export type NomeAba = "visao" | "inicio" | "cartoes" | "metas" | "mais";

export function IconeAba({ nome }: { nome: NomeAba }) {
  const comum = { viewBox: "0 0 24 24", width: 22, height: 22, "aria-hidden": true } as const;
  switch (nome) {
    case "visao":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="var(--traco-icone)">
          <path d="M5 17V11M10 17V7M15 17v-5M20 17V9" strokeLinecap="round" />
        </svg>
      );
    case "inicio":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="var(--traco-icone)">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="3.6" />
        </svg>
      );
    case "cartoes":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="var(--traco-icone)">
          <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
          <path d="M2.5 10h19" />
          <path d="M6 15.2h4" strokeLinecap="round" />
        </svg>
      );
    case "metas":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="var(--traco-icone)">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="4.6" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "mais":
      return (
        <svg {...comum} fill="currentColor">
          <circle cx="5.5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="18.5" cy="12" r="1.7" />
        </svg>
      );
    default: {
      const _nunca: never = nome;
      return _nunca;
    }
  }
}
