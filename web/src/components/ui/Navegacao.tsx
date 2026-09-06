"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLoja } from "@/lib/store";
import { IconeAba, type NomeAba } from "../Icones";
import { Assinatura } from "../marca/Assinatura";

const DESTINOS: readonly {
  href: string;
  nome: string;
  icone: NomeAba;
  soDesktop?: boolean;
}[] = [
  { href: "/mes", nome: "mês", icone: "inicio" },
  { href: "/relatorios", nome: "relatórios", icone: "relatorios" },
  { href: "/cartoes", nome: "cartões", icone: "cartoes" },
  { href: "/metas", nome: "metas", icone: "metas" },
  { href: "/mais", nome: "mais", icone: "mais" },
];

function ativa(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function Navegacao() {
  const caminho = usePathname();
  const { carteira } = useLoja();
  const { usuario, sair } = useAuth();

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
      <div className="hidden lg:mb-10 lg:block lg:px-2 lg:text-left">
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
              "lg:min-h-[40px] lg:w-full lg:flex-none lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:rounded-controle lg:px-3 lg:py-2 lg:text-left lg:text-[14px] " +
              (atual
                ? "font-semibold text-grafite lg:bg-nevoa lg:shadow-[inset_3px_0_0_0_var(--grafite)]"
                : "text-cinza lg:hover:bg-nevoa lg:hover:text-grafite")
            }
          >
            <span aria-hidden className="shrink-0">
              <IconeAba nome={d.icone} />
            </span>
            <span>{d.nome}</span>
          </Link>
        );
      })}

      {/* Mobile FAB — só +; Sair fica em Mais, não na bottom nav. */}
      <Link
        href="/lancar"
        aria-label="Novo lançamento"
        className={
          "casal-toque absolute left-1/2 -translate-x-1/2 -top-[68px] flex h-[52px] w-[52px] items-center justify-center " +
          "rounded-etiqueta bg-grafite text-[24px] text-ar shadow-elevacao " +
          "lg:hidden"
        }
      >
        <span aria-hidden>+</span>
      </Link>

      {/* Desktop rail footer: um bloco de conta/carteira + Novo lançamento. Não copia no mobile. */}
      <div className="mt-auto hidden lg:flex lg:flex-col lg:gap-3 lg:px-2 lg:pb-8 lg:pt-6">
        <div className="flex flex-col gap-2 rounded-controle border border-nevoa bg-ar px-3 py-3">
          <Link
            href="/mais/carteiras"
            aria-label={`Carteira ${carteira?.nome ?? "carteira"}`}
            className="casal-toque inline-flex max-w-full items-center self-start rounded-etiqueta border border-nevoa px-2.5 py-1 text-[12px] font-semibold text-grafite"
          >
            <span className="truncate">{carteira?.nome ?? "carteira"}</span>
          </Link>
          {usuario?.email ? (
            <p className="truncate text-[12px] text-cinza" title={usuario.email}>
              {usuario.email}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void sair()}
            className="casal-toque self-start text-left text-[13px] font-semibold text-cinza hover:text-grafite"
          >
            Sair
          </button>
        </div>
        <Link
          href="/lancar"
          aria-label="Novo lançamento"
          className={
            "casal-toque flex h-[44px] w-full items-center justify-center rounded-controle " +
            "bg-grafite text-[14px] font-semibold text-ar"
          }
        >
          Novo lançamento
        </Link>
      </div>
    </nav>
  );
}
