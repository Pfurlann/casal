"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import {
  competenciaDaCompra,
  dataDeLocalISO,
  dataLocalISO,
  hrefDoCartao,
  rotuloCurto,
  type Cartao,
  type Competencia,
} from "@/lib/domain";
import {
  ACCEPT_ARQUIVO_OFX,
  classificarCategoria,
  competenciaDoPeriodoOfx,
  creditoRelevanteNaFatura,
  deveDesmarcadoPadrao,
  erroSeNaoForOfx,
  fraseCompletarParcelas,
  fraseParcelaOfx,
  hashDedupOfx,
  lancamentosPendentesDaLinha,
  lerTextoDoArquivo,
  parceladasCanceladasPorEstorno,
  parcelaDaLinha,
  parseOfx,
  precisaCompletarParcelas,
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

/**
 * Define se a linha vem marcada por padrão na UI de importação.
 * Desmarca: pagamentos, valor pendente, encargos de atraso, créditos não-relevantes.
 */
function marcarPorPadrao(linha: LinhaOfx): boolean {
  if (deveDesmarcadoPadrao(linha.descricao)) return false;
  if (linha.tipo === "credito") return creditoRelevanteNaFatura(linha.descricao);
  return true;
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
  /** Override opcional da data OFX — a API já aceita `data` por linha. */
  const [datasEfetivas, setDatasEfetivas] = useState<Record<string, string>>({});
  const [dataLote, setDataLote] = useState(() => dataLocalISO());
  const [salvando, setSalvando] = useState(false);

  const extraido = useMemo(() => (texto ? parseOfx(texto) : null), [texto]);
  const cats = categoriasVisiveis(categorias, "despesa");

  const extraidas = useMemo(() => {
    if (!extraido) return [];
    return [...extraido.gastos, ...extraido.creditos].sort((a, b) =>
      a.data < b.data ? -1 : a.data > b.data ? 1 : 0,
    );
  }, [extraido]);

  const linhas = useMemo(() => {
    if (!cartao) return [];
    const comHashes = extraidas.map((g) => ({
      ...g,
      hashDedup: hashDedupOfx(cartao.id, g.fitId),
    }));
    const canceladasPorEstorno = parceladasCanceladasPorEstorno(comHashes);
    return comHashes.map((g) => {
      const hash = g.hashDedup;
      const foiEstornada = canceladasPorEstorno.has(hash);
      const parc = parcelaDaLinha(g);
      const base = {
        ...g,
        descricao: g.descricao,
        parcelaN: foiEstornada ? 1 : g.parcelaN,
        parcelaTotal: foiEstornada ? 1 : g.parcelaTotal,
      };
      const pendentes = lancamentosPendentesDaLinha(base, transacoes);
      const completar = precisaCompletarParcelas(base, transacoes);
      const jaTem = pendentes === 0;
      const dataEfetiva = datasEfetivas[hash] ?? g.data;
      const padrao = completar ? true : marcarPorPadrao(g);
      return {
        ...g,
        hashDedup: hash,
        dataOriginal: g.data,
        dataEfetiva,
        categoriaID: escolhas[hash] ?? classificarCategoria(g.descricao, categorias),
        jaTem,
        completar,
        pendentes,
        lancar: jaTem ? false : (marcar[hash] ?? padrao),
        estornada: foiEstornada,
        parcelaNEfetiva: base.parcelaN,
        parcelaTotalEfetiva: base.parcelaTotal,
      };
    });
  }, [cartao, extraidas, escolhas, marcar, datasEfetivas, categorias, transacoes]);

  const marcaveis = linhas.filter((l) => !l.jaTem);
  const todosMarcados =
    marcaveis.length > 0 && marcaveis.every((l) => l.lancar);
  const escolhidas = linhas.filter((l) => l.lancar && !l.jaTem);
  const totalNovos = escolhidas.reduce(
    (s, l) => (l.completar ? s : s + l.valorCentavos),
    0,
  );
  const lancamentosNovos = escolhidas.reduce((s, l) => s + l.pendentes, 0);
  const completarCount = linhas.filter((l) => l.completar).length;
  const jaNaFaturaCount = linhas.filter((l) => l.jaTem).length;

  function marcarTodos(v: boolean) {
    setMarcar((xs) => {
      const next = { ...xs };
      for (const l of marcaveis) next[l.hashDedup] = v;
      return next;
    });
  }

  function aplicarDataSelecionados() {
    if (!dataLote || escolhidas.length === 0) return;
    setDatasEfetivas((xs) => {
      const next = { ...xs };
      for (const l of escolhidas) next[l.hashDedup] = dataLote;
      return next;
    });
  }

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
          marcas[hash] = marcarPorPadrao(g);
        }
      }
      setEscolhas(iniciais);
      setMarcar(marcas);
      setDatasEfetivas({});
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
      const doExtrato = competenciaDoPeriodoOfx(extraido?.periodo);
      const linhasParaImportar = escolhidas.map((l) => ({
        descricao: l.descricao,
        valor: l.valorCentavos,
        data: l.dataOriginal,
        ...(l.dataEfetiva !== l.dataOriginal ? { dataOverride: l.dataEfetiva } : {}),
        categoriaID: l.categoriaID,
        hashDedup: l.hashDedup,
        tipo: l.tipo,
        parcelaN: l.parcelaNEfetiva,
        parcelaTotal: l.parcelaTotalEfetiva,
      }));
      const compsParaDestino = escolhidas.map((l) =>
        competenciaDaCompra(dataDeLocalISO(l.dataEfetiva), cartao),
      );
      const destino =
        doExtrato ??
        compsParaDestino.reduce<Competencia | undefined>((acc, c) => {
          if (!acc) return c;
          return acc.ano * 12 + acc.mes >= c.ano * 12 + c.mes ? acc : c;
        }, undefined) ??
        competenciaDaCompra(new Date(), cartao);

      const r = await importarOfx({
        cartaoID: cartao.id,
        competenciaExtrato: doExtrato,
        linhas: linhasParaImportar,
      });

      setTexto(null);
      setEscolhas({});
      setMarcar({});
      setDatasEfetivas({});

      avisar(
        "ok",
        r.importados === 0
          ? "Esses gastos já estavam na fatura."
          : `${r.importados} gasto${r.importados === 1 ? "" : "s"} na fatura.`,
      );
      router.push(hrefDoCartao(cartao.id, destino));
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
          A competência da fatura vem do período do extrato (DTSTART/DTEND) — linhas com
          DTPOSTED fora dessa fatura são carimbadas nela. Parcelas N/M lançam as restantes
          nas competências seguintes (só as que faltam). Se a parcela n já está na fatura,
          dá para completar só as futuras. Desmarque o que não entra — créditos vêm
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
                {completarCount > 0
                  ? ` · ${completarCount} completar parcelas futuras`
                  : ""}
                {jaNaFaturaCount > 0 ? ` · ${jaNaFaturaCount} já na fatura` : ""}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-controle border border-nevoa p-3">
              <label
                htmlFor="importar-ofx-selecionar-todos"
                className="relative z-[1] flex min-h-[44px] cursor-pointer items-center gap-3 text-[14px] text-grafite"
              >
                <input
                  id="importar-ofx-selecionar-todos"
                  type="checkbox"
                  checked={todosMarcados}
                  disabled={marcaveis.length === 0}
                  aria-label="Selecionar todos"
                  onChange={(e) => marcarTodos(e.target.checked)}
                  className="pointer-events-auto h-5 w-5 shrink-0"
                />
                Selecionar todos
              </label>
              {/* Botao w-full em flex-row esmagava o date — largura auto + wrap. */}
              <div className="flex flex-row flex-wrap items-end gap-2">
                <div className="min-w-[14rem] flex-1 basis-64">
                  <label htmlFor="importar-ofx-data-lote" className="block whitespace-nowrap">
                    <Rotulo>aplicar data aos selecionados</Rotulo>
                  </label>
                  <input
                    id="importar-ofx-data-lote"
                    type="date"
                    value={dataLote}
                    aria-label="Data a aplicar aos selecionados"
                    onChange={(e) => setDataLote(e.target.value)}
                    className={SELECT}
                  />
                </div>
                <Botao
                  variante="secundario"
                  largura="auto"
                  onClick={aplicarDataSelecionados}
                  disabled={escolhidas.length === 0 || !dataLote}
                >
                  Aplicar data
                </Botao>
              </div>
            </div>

            <ul className="mt-6">
              {linhas.map((l) => (
                <LinhaRevisao
                  key={l.hashDedup}
                  linha={l}
                  categoriaID={l.categoriaID}
                  categorias={cats.map((c) => ({ id: c.id, nome: c.nome }))}
                  cartao={cartao}
                  competenciaExtrato={competenciaDoPeriodoOfx(extraido?.periodo)}
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
  competenciaExtrato,
  onCategoria,
  onLancar,
}: {
  linha: LinhaOfx & {
    jaTem: boolean;
    completar: boolean;
    pendentes: number;
    hashDedup: string;
    lancar: boolean;
    dataOriginal: string;
    dataEfetiva: string;
    estornada?: boolean;
    parcelaNEfetiva: number;
    parcelaTotalEfetiva: number;
  };
  categoriaID: string;
  categorias: { id: string; nome: string }[];
  cartao: Cartao;
  competenciaExtrato?: Competencia | null;
  onCategoria: (id: string) => void;
  onLancar: (v: boolean) => void;
}) {
  const competencia =
    competenciaExtrato ?? competenciaDaCompra(dataDeLocalISO(linha.dataEfetiva), cartao);
  const parcela = linha.estornada
    ? undefined
    : fraseParcelaOfx(linha.parcelaNEfetiva, linha.parcelaTotalEfetiva);
  const completar =
    linha.completar ? fraseCompletarParcelas(linha.pendentes) : undefined;
  const credito = linha.tipo === "credito";
  const dataMudou = linha.dataEfetiva !== linha.dataOriginal;
  return (
    <li className="border-b border-nevoa py-3">
      <div className="flex items-start justify-between gap-3">
        <label className="relative z-[1] flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={linha.lancar}
            disabled={linha.jaTem}
            aria-label={
              linha.completar
                ? `Completar parcelas futuras de ${linha.descricao}`
                : `Lançar ${linha.descricao}`
            }
            onChange={(e) => onLancar(e.target.checked)}
            className="pointer-events-auto h-5 w-5 shrink-0"
          />
        </label>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-grafite">{linha.descricao}</span>
          <span className="block text-[12px] text-cinza">
            {dataMudou
              ? `OFX ${dataBr(linha.dataOriginal)} → efetiva ${dataBr(linha.dataEfetiva)}`
              : dataBr(linha.dataOriginal)}
            {" · fatura "}
            {rotuloCurto(competencia)}
            {credito ? " · crédito" : ""}
            {linha.completar
              ? completar
                ? ` · ${completar}`
                : ""
              : parcela
                ? ` · ${parcela}`
                : ""}
            {linha.estornada ? " · estornada" : ""}
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
