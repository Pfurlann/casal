"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAba, type NomeAba } from "../Icones";
import { Assinatura } from "../marca/Assinatura";

const DESTINOS: readonly {
  href: string;
  nome: string;
  icone: NomeAba;
  soDesktop?: boolean;
}[] = [
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
    <nav
      aria-label="Seções"
      className={
        // até lg: barra fixa no rodapé. de lg em diante: trilho à esquerda.
        "fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-nevoa bg-ar " +
        "pb-[env(safe-area-inset-bottom)] " +
        "lg:sticky lg:top-0 lg:h-dvh lg:w-[260px] lg:shrink-0 lg:flex-col lg:items-stretch " +
        "lg:overflow-y-auto lg:border-r lg:border-t-0 lg:px-4 lg:pt-8 lg:pb-0"
      }
    >
      <div className="hidden lg:mb-10 lg:block lg:px-2">
        <Assinatura variante="base" largura={112} />
      </div>

      {DESTINOS.map((d) => {
        const atual = ativa(caminho, d.href);
        return (
          <Link
            key={d.href}
            href={d.href}
            aria-current={atual ? "page" : undefined}
            className={
              "casal-toque min-h-[44px] flex-1 flex-col items-center justify-center gap-1 text-[10px] " +
              (d.soDesktop ? "hidden lg:flex " : "flex ") +
              "lg:min-h-[40px] lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:rounded-controle lg:px-3 lg:py-2 lg:text-[14px] " +
              (atual
                ? "text-grafite lg:bg-nevoa"
                : "text-cinza lg:hover:bg-nevoa lg:hover:text-grafite")
            }
          >
            <span aria-hidden>
              <IconeAba nome={d.icone} />
            </span>
            <span className={atual ? "font-semibold" : undefined}>{d.nome}</span>
          </Link>
        );
      })}

      <Link
        href="/lancar"
        aria-label="Novo lançamento"
        className={
          "casal-toque absolute left-1/2 -translate-x-1/2 -top-[68px] flex h-[52px] w-[52px] items-center justify-center " +
          "rounded-etiqueta bg-grafite text-[24px] text-ar shadow-elevacao " +
          "lg:static lg:mt-auto lg:mb-8 lg:h-[44px] lg:w-full lg:translate-x-0 lg:rounded-controle lg:text-[14px] lg:font-semibold lg:shadow-none"
        }
      >
        <span aria-hidden className="lg:hidden">+</span>
        <span className="hidden lg:inline">Novo gasto</span>
      </Link>
    </nav>
  );
}
