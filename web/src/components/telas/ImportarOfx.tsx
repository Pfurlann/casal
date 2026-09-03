"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import {
  competenciaDaCompra,
  dataDeLocalISO,
  hrefDoMes,
  rotuloCurto,
  type Cartao,
  type Competencia,
} from "@/lib/domain";
import {
  ACCEPT_ARQUIVO_OFX,
  classificarCategoria,
  erroSeNaoForOfx,
  fraseParcelaOfx,
  hashDedupOfx,
  jaImportada,
  lancamentosDaLinha,
  lerTextoDoArquivo,
  parseOfx,
  type LinhaOfx,
} from "@/lib/ofx";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Botao } from "../ui/Botao";
import { useAviso } from "../ui/Aviso";

const SELECT =
  "mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite";

function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ImportarOfx({ cartaoId }: { cartaoId: string }) {
  const { cartoes, categorias, transacoes, importarOfx, carteira } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const cartao = cartoes.find((c) => c.id === cartaoId);

  const [texto, setTexto] = useState<string | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [marcar, setMarcar] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  const extraido = useMemo(() => (texto ? parseOfx(texto) : null), [texto]);
  const cats = categoriasVisiveis(categorias, "despesa");

  const extraidas = extraido
    ? [...extraido.gastos, ...extraido.creditos].sort((a, b) =>
        a.data < b.data ? -1 : a.data > b.data ? 1 : 0,
      )
    : [];

  const linhas = useMemo(
    () =>
      cartao
        ? extraidas.map((g) => {
            const hash = hashDedupOfx(cartao.id, g.fitId);
            const jaTem = jaImportada(transacoes, hash);
            return {
              ...g,
              hashDedup: hash,
              categoriaID: escolhas[hash] ?? classificarCategoria(g.descricao, categorias),
              jaTem,
              lancar: jaTem ? false : (marcar[hash] ?? g.tipo === "gasto"),
            };
          })
        : [],
    [cartao, extraidas, escolhas, marcar, categorias, transacoes],
  );

  const escolhidas = linhas.filter((l) => l.lancar && !l.jaTem);
  const totalNovos = escolhidas.reduce((s, l) => s + l.valorCentavos, 0);
  const lancamentosNovos = escolhidas.reduce((s, l) => s + lancamentosDaLinha(l), 0);

  async function lerArquivo(file: File | undefined) {
    setErroArquivo(null);
    if (!file) return;
    try {
      const raw = await lerTextoDoArquivo(file);
      const recusa = erroSeNaoForOfx(file.name, raw);
      if (recusa) {
        setErroArquivo(recusa);
        setTexto(null);
        return;
      }
      const parsed = parseOfx(raw);
      if (parsed.gastos.length === 0 && parsed.creditos.length === 0) {
        setErroArquivo("Não achei lançamentos nesse arquivo.");
        setTexto(null);
        return;
      }
      const iniciais: Record<string, string> = {};
      const marcas: Record<string, boolean> = {};
      if (cartao) {
        for (const g of [...parsed.gastos, ...parsed.creditos]) {
          const hash = hashDedupOfx(cartao.id, g.fitId);
          iniciais[hash] = classificarCategoria(g.descricao, categorias);
          marcas[hash] = g.tipo === "gasto";
        }
      }
      setEscolhas(iniciais);
      setMarcar(marcas);
      setTexto(raw);
    } catch {
      setErroArquivo("Não deu para ler esse arquivo.");
      setTexto(null);
    }
  }

  async function salvar() {
    if (!cartao || escolhidas.length === 0 || salvando) return;
    setSalvando(true);
    try {
      const r = await importarOfx({
        cartaoID: cartao.id,
        linhas: escolhidas.map((l) => ({
          descricao: l.descricao,
          valor: l.valorCentavos,
          data: l.data,
          categoriaID: l.categoriaID,
          hashDedup: l.hashDedup,
          parcelaN: l.parcelaN,
          parcelaTotal: l.parcelaTotal,
        })),
      });
      avisar(
        "ok",
        r.importados === 0
          ? "Esses gastos já estavam na fatura."
          : `${r.importados} gasto${r.importados === 1 ? "" : "s"} na fatura.`,
      );
      const comps = escolhidas.map((l) => competenciaDaCompra(dataDeLocalISO(l.data), cartao));
      const destino = comps.reduce<Competencia | undefined>((acc, c) => {
        if (!acc) return c;
        return acc.ano * 12 + acc.mes >= c.ano * 12 + c.mes ? acc : c;
      }, undefined) ?? competenciaDaCompra(new Date(), cartao);
      router.push(hrefDoMes(destino));
    } catch {
      avisar("erro", "Não deu para importar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (!cartao) {
    return (
      <div>
        <Cabecalho titulo="importar OFX" voltarPara="/cartoes" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este cartão não existe mais.</p>
      </div>
    );
  }

  return (
    <div>
      <Cabecalho titulo="importar OFX" voltarPara={`/cartoes/${cartao.id}`} />
      <div className="px-4 pt-6">
        <Rotulo>{cartao.apelido} · em {carteira.nome}</Rotulo>
        <p className="mt-2 text-[14px] text-cinza">
          A competência segue o fechamento do cartão. Desmarque o que não entra — créditos vêm
          desmarcados.
        </p>

        <label className="casal-toque mt-5 flex min-h-[44px] cursor-pointer items-center justify-center rounded-controle border border-nevoa font-texto text-[14px] font-semibold text-grafite">
          Escolher arquivo OFX
          <input
            type="file"
            {...(ACCEPT_ARQUIVO_OFX ? { accept: ACCEPT_ARQUIVO_OFX } : {})}
            className="sr-only"
            onChange={(e) => void lerArquivo(e.target.files?.[0])}
          />
        </label>
        {erroArquivo && <p className="mt-2 text-[12px] text-ambar-texto">{erroArquivo}</p>}

        {extraido && (
          <>
            <div className="mt-8">
              <Rotulo>revisão do arquivo</Rotulo>
              <div className="mt-2">
                <Numero centavos={totalNovos} tamanho="secao" />
              </div>
              <p className="mt-1 text-[12px] text-cinza">
                {escolhidas.length} marcado{escolhidas.length === 1 ? "" : "s"}
                {lancamentosNovos !== escolhidas.length ? ` · ${lancamentosNovos} lançamentos` : ""}
                {linhas.filter((l) => l.jaTem).length > 0
                  ? ` · ${linhas.filter((l) => l.jaTem).length} já na fatura`
                  : ""}
              </p>
            </div>

            <ul className="mt-6">
              {linhas.map((l) => (
                <LinhaRevisao
                  key={l.hashDedup}
                  linha={l}
                  categoriaID={l.categoriaID}
                  categorias={cats.map((c) => ({ id: c.id, nome: c.nome }))}
                  cartao={cartao}
                  onCategoria={(id) => setEscolhas((xs) => ({ ...xs, [l.hashDedup]: id }))}
                  onLancar={(v) => setMarcar((xs) => ({ ...xs, [l.hashDedup]: v }))}
                />
              ))}
            </ul>

            <div className="mt-8 pb-10">
              <Botao
                variante="primario"
                onClick={() => void salvar()}
                disabled={escolhidas.length === 0 || salvando}
              >
                Lançar {lancamentosNovos} gasto{lancamentosNovos === 1 ? "" : "s"}
              </Botao>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LinhaRevisao({
  linha,
  categoriaID,
  categorias,
  cartao,
  onCategoria,
  onLancar,
}: {
  linha: LinhaOfx & { jaTem: boolean; hashDedup: string; lancar: boolean };
  categoriaID: string;
  categorias: { id: string; nome: string }[];
  cartao: Cartao;
  onCategoria: (id: string) => void;
  onLancar: (v: boolean) => void;
}) {
  const competencia = competenciaDaCompra(dataDeLocalISO(linha.data), cartao);
  const parcela = fraseParcelaOfx(linha.parcelaN, linha.parcelaTotal);
  const credito = linha.tipo === "credito";
  return (
    <li className="border-b border-nevoa py-3">
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-h-[44px] min-w-[44px] shrink-0 items-center">
          <input
            type="checkbox"
            checked={linha.lancar}
            disabled={linha.jaTem}
            aria-label={`Lançar ${linha.descricao}`}
            onChange={(e) => onLancar(e.target.checked)}
            className="h-5 w-5"
          />
        </label>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-grafite">{linha.descricao}</span>
          <span className="block text-[12px] text-cinza">
            {dataBr(linha.data)} · fatura {rotuloCurto(competencia)}
            {credito ? " · crédito" : ""}
            {parcela ? ` · ${parcela}` : ""}
            {linha.jaTem ? " · já na fatura" : ""}
          </span>
        </span>
        <Numero centavos={linha.valorCentavos} tamanho="corpo" />
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Categoria de {linha.descricao}</span>
        <select
          aria-label={`Categoria de ${linha.descricao}`}
          className={SELECT}
          value={categoriaID}
          disabled={linha.jaTem || !linha.lancar}
          onChange={(e) => onCategoria(e.target.value)}
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
    </li>
  );
}
