"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { construirPacote, lancsDoDfcl, type DadosBrutos } from "@/lib/dados-dfcl";
import { montarDfcl, type LinhaDfcl } from "@/lib/dfcl";
import { gravarPacote, lerMetasEContas, type ClienteRemoto } from "@/lib/dfcl-remoto";
import { PESSOAS, type Pessoa } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { clienteSupabase } from "@/lib/supabase";
import { usePacote } from "@/lib/usar-pacote";
import { Cabecalho } from "../ui/Cabecalho";
import { Esqueleto } from "../ui/Esqueleto";
import { Vazio } from "../ui/Vazio";

const JANELA = 6;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function competenciasA(partida: Date, deslocamento: number): string[] {
  return Array.from({ length: JANELA }, (_, i) => {
    const d = new Date(partida.getFullYear(), partida.getMonth() + deslocamento + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

const rotuloMes = (c: string) => `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(2, 4)}`;

const reais = (centavos: number) =>
  centavos === 0 ? "–" : Math.round(centavos / 100).toLocaleString("pt-BR");

/** Entradas: bater a meta é bom. Saídas: ficar dentro da meta é bom. */
function tomDoPercentual(linha: LinhaDfcl, pct: number | null): string {
  if (pct === null) return "text-cinza";
  const entrada = linha.id.startsWith("Entrada");
  const bom = entrada ? pct >= 100 : pct <= 100;
  return bom ? "text-[var(--pago)]" : "text-ambar-texto";
}

export function Dfcl() {
  const { transacoes, categorias, pronto, carteira } = useLoja();
  const { usuario } = useAuth();
  const entrada = useRef<HTMLInputElement>(null);

  const { pacote, lido, definir } = usePacote();
  const [pessoa, setPessoa] = useState<Pessoa | "Todos">("Todos");
  const [deslocamento, setDeslocamento] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [gravacao, setGravacao] = useState<string | null>(null);

  const remoto = useMemo(
    () => (usuario && pronto ? (clienteSupabase() as unknown as ClienteRemoto | null) : null),
    [usuario, pronto],
  );

  // Sem dados neste navegador: traz do banco as metas que o outro login já gravou.
  useEffect(() => {
    if (!lido || pacote || !remoto) return;
    let ativo = true;
    lerMetasEContas(remoto, carteira.id)
      .then((r) => {
        if (ativo && r) {
          definir({ ...r, lancs: [], avisos: [], importadoEm: new Date().toISOString() });
        }
      })
      .catch(() => {
        /* sem rede ou sem a migração: segue sem metas */
      });
    return () => {
      ativo = false;
    };
  }, [lido, pacote, remoto, carteira.id, definir]);

  const competencias = useMemo(() => competenciasA(new Date(), deslocamento), [deslocamento]);

  const resultado = useMemo(() => {
    if (!pacote) return null;
    const lancs = lancsDoDfcl(pacote, transacoes ?? [], categorias ?? []);
    const saldoInicial = lancs
      .filter((l) => l.conta === "Saldo Inicial" && (pessoa === "Todos" || l.pessoa === pessoa))
      .reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);
    return montarDfcl({
      competencias,
      contas: pacote.contas,
      metas: pacote.metas,
      lancs,
      pessoa,
      saldoInicial,
    });
  }, [pacote, transacoes, categorias, competencias, pessoa]);

  async function importar(arquivo: File | undefined) {
    if (!arquivo) return;
    try {
      const dados = JSON.parse(await arquivo.text()) as DadosBrutos;
      if (!Array.isArray(dados.realizados) || !Array.isArray(dados.metas) || !Array.isArray(dados.config)) {
        throw new Error("formato");
      }
      const novo = construirPacote(dados);
      definir(novo);
      setErro(null);
      if (remoto) {
        try {
          const r = await gravarPacote(remoto, carteira.id, novo);
          setGravacao(`Gravado no banco: ${r.metas} metas, ${r.contas} contas, ${r.portadoresNovos} portadores novos.`);
        } catch {
          setGravacao("Importado neste navegador, mas não consegui gravar no banco. Tente de novo.");
        }
      }
    } catch {
      setErro("Esse arquivo não parece ser o dados.json gerado pelo script de planilhas.");
    }
  }

  const botaoImportar = (
    <>
      <input
        ref={entrada}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Arquivo dados.json"
        onChange={(e) => void importar(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        className="casal-toque min-h-[44px] rounded-controle border border-nevoa px-3 text-[13px] font-semibold text-grafite"
      >
        importar planilhas
      </button>
    </>
  );

  if (!pronto || !lido) {
    return (
      <div>
        <Cabecalho titulo="dfcl" marca />
        <div role="status" aria-busy="true" className="space-y-4 px-4 pt-8 lg:px-0">
          <Esqueleto className="h-10 w-52" />
          <Esqueleto className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!pacote || !resultado) {
    return (
      <div>
        <Cabecalho titulo="dfcl" marca />
        <div className="px-4 pt-8 lg:px-0">
          <Vazio
            frase="Sem dados do DFCL ainda. Gere o dados.json com o script das planilhas e traga o arquivo para cá."
            acao={botaoImportar}
          />
          {erro ? (
            <p role="alert" className="mt-3 text-[13px] text-ambar-texto">
              {erro}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Cabecalho titulo="dfcl · previsto x realizado" marca acao={botaoImportar} />

      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 lg:px-0">
        {(["Todos", ...PESSOAS] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={pessoa === p}
            onClick={() => setPessoa(p)}
            className={
              "casal-toque min-h-[44px] rounded-etiqueta border px-3 text-[13px] " +
              (pessoa === p ? "border-grafite font-semibold text-grafite" : "border-nevoa text-cinza")
            }
          >
            {p}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[13px] text-cinza">
          <button
            type="button"
            aria-label="Meses anteriores"
            onClick={() => setDeslocamento((d) => d - JANELA)}
            className="casal-toque min-h-[44px] min-w-[44px] text-grafite"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximos meses"
            onClick={() => setDeslocamento((d) => d + JANELA)}
            className="casal-toque min-h-[44px] min-w-[44px] text-grafite"
          >
            ›
          </button>
        </span>
      </div>

      {gravacao ? (
        <p role="status" className="px-4 pt-2 text-[12px] text-cinza lg:px-0">
          {gravacao}
        </p>
      ) : null}

      {pacote.avisos.length > 0 ? (
        <p className="px-4 pt-2 text-[12px] text-cinza lg:px-0">
          {pacote.avisos.length} aviso(s) na importação. Veja as contas sem cadastro no C03.
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto px-4 pb-24 lg:px-0 lg:pb-8">
        <table className="w-full border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr className="text-cinza">
              <th rowSpan={2} className="sticky left-0 bg-ar px-2 py-2 text-left font-semibold">
                Descrição
              </th>
              {competencias.map((c) => (
                <th key={c} colSpan={3} className="border-l-2 border-nevoa px-2 py-2 text-center font-semibold">
                  {rotuloMes(c)}
                </th>
              ))}
            </tr>
            <tr className="text-[11px] text-cinza">
              {competencias.map((c) => (
                <FragmentoCab key={c} />
              ))}
            </tr>
          </thead>
          <tbody>
            {resultado.linhas.map((l) => (
              <tr key={l.id} className={l.nivel <= 1 ? "border-t border-nevoa font-semibold" : ""}>
                <td
                  className="sticky left-0 bg-ar px-2 py-1.5 text-left"
                  style={{ paddingLeft: `${8 + l.nivel * 12}px` }}
                >
                  {l.rotulo}
                </td>
                {competencias.map((c, i) => (
                  <Celulas key={c} linha={l} i={i} />
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-nevoa font-semibold">
              <td className="sticky left-0 bg-ar px-2 py-2 text-left">Saldo acumulado</td>
              {competencias.map((c, i) => (
                <FragmentoSaldo key={c} prev={resultado.acumulado.prev[i]} real={resultado.acumulado.real[i]} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentoCab() {
  return (
    <>
      <th className="border-l-2 border-nevoa px-2 pb-2 text-right font-normal">Prev</th>
      <th className="px-2 pb-2 text-right font-normal">Real</th>
      <th className="px-2 pb-2 text-right font-normal">%</th>
    </>
  );
}

function Celulas({ linha, i }: { linha: LinhaDfcl; i: number }) {
  const pct = linha.pct[i];
  return (
    <>
      <td className="border-l-2 border-nevoa px-2 py-1.5 text-right tabular-nums">{reais(linha.prev[i])}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{reais(linha.real[i])}</td>
      <td className={`px-2 py-1.5 text-right tabular-nums ${tomDoPercentual(linha, pct)}`}>
        {pct === null ? "" : `${pct}%`}
      </td>
    </>
  );
}

function FragmentoSaldo({ prev, real }: { prev: number; real: number }) {
  return (
    <>
      <td className="border-l-2 border-nevoa px-2 py-2 text-right tabular-nums">{reais(prev)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{reais(real)}</td>
      <td className="px-2 py-2" />
    </>
  );
}
