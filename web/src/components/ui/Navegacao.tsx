"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAba, type NomeAba } from "../Icones";

const DESTINOS: ReadonlyArray<{ href: string; nome: string; icone: NomeAba }> = [
  { href: "/mes", nome: "mês", icone: "inicio" },
  { href: "/cartoes", nome: "cartões", icone: "cartoes" },
  { href: "/metas", nome: "metas", icone: "metas" },
  { href: "/mais", nome: "mais", icone: "mais" },
];

function ativa(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function Navegacao() {
  const caminho = usePathname();
  return (
    <>
      <nav className="casal-tabbar" aria-label="Seções">
        {DESTINOS.map((d) => {
          const atual = ativa(caminho, d.href);
          return (
            <Link
              key={d.href}
              href={d.href}
              aria-current={atual ? "page" : undefined}
              className="flex h-[49px] w-full min-w-0 flex-col items-center justify-center gap-0.5 text-[10px]"
            >
              <span
                className={
                  atual
                    ? "rounded-lg bg-nevoa px-2.5 py-0.5 text-grafite"
                    : "rounded-lg px-2.5 py-0.5 text-cinza"
                }
              >
                <IconeAba nome={d.icone} />
              </span>
              <span
                className={
                  atual
                    ? "max-w-full truncate font-semibold text-grafite"
                    : "max-w-full truncate text-cinza"
                }
              >
                {d.nome}
              </span>
            </Link>
          );
        })}
      </nav>
      <Link href="/lancar" aria-label="Novo lançamento" className="casal-fab">
        +
      </Link>
    </>
  );
}
