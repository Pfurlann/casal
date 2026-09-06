"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import {
  competenciaDe,
  dataDeLocalISO,
  dataLocalISO,
  hrefDoMes,
  rotuloCurto,
  type Competencia,
} from "@/lib/domain";
import {
  ACCEPT_ARQUIVO_OFX,
  classificarCategoriaOfxConta,
  erroSeNaoForOfx,
  hashDedupOfxConta,
  jaImportada,
  lerTextoDoArquivo,
  parseOfxConta,
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

export function ImportarOfxConta({ contaId }: { contaId: string }) {
  const { contas, contasTodas, categorias, transacoes, importarOfxConta, carteira } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const conta = (contasTodas ?? contas).find((c) => c.id === contaId);

  const [texto, setTexto] = useState<string | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [marcar, setMarcar] = useState<Record<string, boolean>>({});
  const [datasEfetivas, setDatasEfetivas] = useState<Record<string, string>>({});
  const [dataLote, setDataLote] = useState(() => dataLocalISO());
  const [salvando, setSalvando] = useState(false);

  const extraido = useMemo(() => (texto ? parseOfxConta(texto) : null), [texto]);

  const extraidas = useMemo(() => {
    if (!extraido) return [];
    return [...extraido.gastos, ...extraido.creditos].sort((a, b) =>
      a.data < b.data ? -1 : a.data > b.data ? 1 : 0,
    );
  }, [extraido]);

  const linhas = useMemo(
    () =>
      conta
        ? extraidas.map((g) => {
            const hash = hashDedupOfxConta(conta.id, g.fitId);
            const jaTem = jaImportada(transacoes, hash);
            const dataEfetiva = datasEfetivas[hash] ?? g.data;
            return {
              ...g,
              hashDedup: hash,
              dataOriginal: g.data,
              dataEfetiva,
              categoriaID: escolhas[hash] ?? classificarCategoriaOfxConta(g.descricao, g.tipo, categorias),
              jaTem,
              lancar: jaTem ? false : (marcar[hash] ?? true),
            };
          })
        : [],
    [conta, extraidas, escolhas, marcar, datasEfetivas, categorias, transacoes],
  );

  const marcaveis = linhas.filter((l) => !l.jaTem);
  const todosMarcados =
    marcaveis.length > 0 && marcaveis.every((l) => l.lancar);
  const escolhidas = linhas.filter((l) => l.lancar && !l.jaTem);
  const totalDebitos = escolhidas
    .filter((l) => l.tipo === "gasto")
    .reduce((s, l) => s + l.valorCentavos, 0);
  const totalCreditos = escolhidas
    .filter((l) => l.tipo === "credito")
    .reduce((s, l) => s + l.valorCentavos, 0);

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
      const parsed = parseOfxConta(raw);
      if (parsed.gastos.length === 0 && parsed.creditos.length === 0) {
        setErroArquivo("Não achei lançamentos nesse arquivo.");
        setTexto(null);
        return;
      }
      const iniciais: Record<string, string> = {};
      const marcas: Record<string, boolean> = {};
      if (conta) {
        for (const g of [...parsed.gastos, ...parsed.creditos]) {
          const hash = hashDedupOfxConta(conta.id, g.fitId);
          iniciais[hash] = classificarCategoriaOfxConta(g.descricao, g.tipo, categorias);
          marcas[hash] = true;
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
    if (!conta || escolhidas.length === 0 || salvando) return;
    setSalvando(true);
    try {
      const r = await importarOfxConta({
        contaID: conta.id,
        linhas: escolhidas.map((l) => ({
          descricao: l.descricao,
          valor: l.valorCentavos,
          data: l.dataEfetiva,
          categoriaID: l.categoriaID,
          hashDedup: l.hashDedup,
          tipo: l.tipo,
        })),
      });
      avisar(
        "ok",
        r.importados === 0
          ? "Esses lançamentos já estavam na conta."
          : `${r.importados} lançamento${r.importados === 1 ? "" : "s"} na conta${
              r.repetidos > 0 ? ` · ${r.repetidos} já existiam` : ""
            }.`,
      );
      const comps = escolhidas.map((l) => competenciaDe(dataDeLocalISO(l.dataEfetiva)));
      const destino =
        comps.reduce<Competencia | undefined>((acc, c) => {
          if (!acc) return c;
          return acc.ano * 12 + acc.mes >= c.ano * 12 + c.mes ? acc : c;
        }, undefined) ?? competenciaDe(new Date());
      router.push(hrefDoMes(destino));
    } catch {
      avisar("erro", "Não deu para importar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (!conta) {
    return (
      <div>
        <Cabecalho titulo="importar OFX" voltarPara="/mais/contas" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Esta conta não existe mais.</p>
      </div>
    );
  }

  return (
    <div>
      <Cabecalho titulo="importar OFX" voltarPara={`/mais/contas/${conta.id}`} />
      <div className="px-4 pt-6">
        <Rotulo>
          {conta.nome} · em {carteira.nome}
        </Rotulo>
        <p className="mt-2 text-[14px] text-cinza">
          Extrato da conta: débitos viram despesas e créditos viram receitas, já liquidados no
          saldo. Desmarque o que não entra.
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
              <div className="mt-2 flex flex-wrap gap-4">
                {totalDebitos > 0 && (
                  <div>
                    <p className="text-[12px] text-cinza">saídas</p>
                    <Numero centavos={totalDebitos} tamanho="secao" />
                  </div>
                )}
                {totalCreditos > 0 && (
                  <div>
                    <p className="text-[12px] text-cinza">entradas</p>
                    <Numero centavos={totalCreditos} tamanho="secao" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-[12px] text-cinza">
                {escolhidas.length} marcado{escolhidas.length === 1 ? "" : "s"}
                {linhas.filter((l) => l.jaTem).length > 0
                  ? ` · ${linhas.filter((l) => l.jaTem).length} já na conta`
                  : ""}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-controle border border-nevoa p-3">
              <label className="flex min-h-[44px] items-center gap-3 text-[14px] text-grafite">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  disabled={marcaveis.length === 0}
                  aria-label="Selecionar todos"
                  onChange={(e) => marcarTodos(e.target.checked)}
                  className="h-5 w-5"
                />
                Selecionar todos
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <Rotulo>aplicar data aos selecionados</Rotulo>
                  <input
                    type="date"
                    value={dataLote}
                    aria-label="Data a aplicar aos selecionados"
                    onChange={(e) => setDataLote(e.target.value)}
                    className={SELECT}
                  />
                </label>
                <Botao
                  variante="secundario"
                  onClick={aplicarDataSelecionados}
                  disabled={escolhidas.length === 0 || !dataLote}
                >
                  Aplicar data
                </Botao>
              </div>
            </div>

            <ul className="mt-6">
              {linhas.map((l) => (
                <LinhaRevisaoConta
                  key={l.hashDedup}
                  linha={l}
                  categoriaID={l.categoriaID}
                  categorias={categoriasVisiveis(
                    categorias,
                    l.tipo === "credito" ? "receita" : "despesa",
                  ).map((c) => ({ id: c.id, nome: c.nome }))}
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
                Lançar {escolhidas.length} na conta
              </Botao>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LinhaRevisaoConta({
  linha,
  categoriaID,
  categorias,
  onCategoria,
  onLancar,
}: {
  linha: LinhaOfx & {
    jaTem: boolean;
    hashDedup: string;
    lancar: boolean;
    dataOriginal: string;
    dataEfetiva: string;
  };
  categoriaID: string;
  categorias: { id: string; nome: string }[];
  onCategoria: (id: string) => void;
  onLancar: (v: boolean) => void;
}) {
  const competencia = competenciaDe(dataDeLocalISO(linha.dataEfetiva));
  const credito = linha.tipo === "credito";
  const dataMudou = linha.dataEfetiva !== linha.dataOriginal;
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
            {dataMudou
              ? `OFX ${dataBr(linha.dataOriginal)} → efetiva ${dataBr(linha.dataEfetiva)}`
              : dataBr(linha.dataOriginal)}
            {" · "}
            {rotuloCurto(competencia)}
            {credito ? " · crédito" : " · débito"}
            {linha.jaTem ? " · já na conta" : ""}
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
