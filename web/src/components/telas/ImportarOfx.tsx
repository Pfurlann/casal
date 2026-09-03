"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import {
  competenciaDaCompra,
  dataDeLocalISO,
  rotuloCurto,
  type Cartao,
} from "@/lib/domain";
import {
  classificarCategoria,
  fraseParcelaOfx,
  hashDedupOfx,
  jaImportada,
  lancamentosDaLinha,
  lerTextoDoArquivo,
  parseOfx,
  type LinhaOfx,
} from "@/lib/ofx";
import { formatarBRL } from "@/lib/money";
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
  const [salvando, setSalvando] = useState(false);

  const extraido = useMemo(() => (texto ? parseOfx(texto) : null), [texto]);
  const cats = categoriasVisiveis(categorias, "despesa");

  const gastos = extraido?.gastos ?? [];
  const creditos = extraido?.creditos ?? [];

  const linhas = useMemo(
    () =>
      cartao
        ? gastos.map((g) => {
            const hash = hashDedupOfx(cartao.id, g.fitId);
            return {
              ...g,
              hashDedup: hash,
              categoriaID: escolhas[hash] ?? classificarCategoria(g.descricao, categorias),
              jaTem: jaImportada(transacoes, hash),
            };
          })
        : [],
    [cartao, gastos, escolhas, categorias, transacoes],
  );

  const novos = linhas.filter((l) => !l.jaTem);
  const totalNovos = novos.reduce((s, l) => s + l.valorCentavos, 0);
  const lancamentosNovos = novos.reduce((s, l) => s + lancamentosDaLinha(l), 0);

  async function lerArquivo(file: File | undefined) {
    setErroArquivo(null);
    if (!file) return;
    const nome = file.name.toLowerCase();
    if (!nome.endsWith(".ofx") && !nome.endsWith(".ofc")) {
      setErroArquivo("Escolha um arquivo .ofx ou .ofc.");
      return;
    }
    try {
      const raw = await lerTextoDoArquivo(file);
      const parsed = parseOfx(raw);
      if (parsed.gastos.length === 0 && parsed.creditos.length === 0) {
        setErroArquivo("Não achei lançamentos nesse arquivo.");
        setTexto(null);
        return;
      }
      const iniciais: Record<string, string> = {};
      if (cartao) {
        for (const g of parsed.gastos) {
          iniciais[hashDedupOfx(cartao.id, g.fitId)] = classificarCategoria(g.descricao, categorias);
        }
      }
      setEscolhas(iniciais);
      setTexto(raw);
    } catch {
      setErroArquivo("Não deu para ler esse arquivo.");
      setTexto(null);
    }
  }

  async function salvar() {
    if (!cartao || novos.length === 0 || salvando) return;
    setSalvando(true);
    try {
      const r = await importarOfx({
        cartaoID: cartao.id,
        linhas: novos.map((l) => ({
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
      router.push(`/cartoes/${cartao.id}`);
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
          A competência segue o fechamento do cartão. Créditos e pagamentos ficam de fora.
        </p>

        <label className="mt-5 flex min-h-[44px] cursor-pointer items-center justify-center rounded-controle border border-nevoa font-texto text-[14px] font-semibold text-grafite">
          Escolher arquivo OFX
          <input
            type="file"
            accept=".ofx,.ofc,application/x-ofx,application/ofx,text/xml"
            className="sr-only"
            onChange={(e) => void lerArquivo(e.target.files?.[0])}
          />
        </label>
        {erroArquivo && <p className="mt-2 text-[12px] text-ambar-texto">{erroArquivo}</p>}

        {extraido && (
          <>
            <div className="mt-8">
              <Rotulo>gastos da fatura</Rotulo>
              <div className="mt-2">
                <Numero centavos={totalNovos} tamanho="secao" />
              </div>
              <p className="mt-1 text-[12px] text-cinza">
                {novos.length} novo{novos.length === 1 ? "" : "s"}
                {lancamentosNovos !== novos.length ? ` · ${lancamentosNovos} lançamentos` : ""}
                {linhas.length - novos.length > 0
                  ? ` · ${linhas.length - novos.length} já na fatura`
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
                />
              ))}
            </ul>

            {creditos.length > 0 && (
              <div className="mt-8">
                <Rotulo>créditos e pagamentos · não lançados</Rotulo>
                <ul className="mt-2">
                  {creditos.map((c) => (
                    <li
                      key={c.fitId}
                      className="flex min-h-[44px] items-center justify-between border-b border-nevoa py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] text-grafite">{c.descricao}</span>
                        <span className="block text-[12px] text-cinza">{dataBr(c.data)}</span>
                      </span>
                      <span className="font-numero text-[14px] text-cinza">
                        {formatarBRL(c.valorCentavos)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 pb-10">
              <Botao
                variante="primario"
                onClick={() => void salvar()}
                disabled={novos.length === 0 || salvando}
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
}: {
  linha: LinhaOfx & { jaTem: boolean; hashDedup: string };
  categoriaID: string;
  categorias: { id: string; nome: string }[];
  cartao: Cartao;
  onCategoria: (id: string) => void;
}) {
  const competencia = competenciaDaCompra(dataDeLocalISO(linha.data), cartao);
  const parcela = fraseParcelaOfx(linha.parcelaN, linha.parcelaTotal);
  return (
    <li className="border-b border-nevoa py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[14px] text-grafite">{linha.descricao}</span>
          <span className="block text-[12px] text-cinza">
            {dataBr(linha.data)} · fatura {rotuloCurto(competencia)}
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
          disabled={linha.jaTem}
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
