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
function pillDoPercentual(entrada: boolean, pct: number | null): string {
  if (pct === null) return "casal-pill";
  const bom = entrada ? pct >= 100 : pct <= 100;
  return bom ? "casal-pill casal-pill-bom" : "casal-pill casal-pill-ruim";
}

const moeda = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Indicador({
  titulo,
  prev,
  real,
  entrada,
  resultado = false,
}: {
  titulo: string;
  prev: number;
  real: number;
  entrada: boolean;
  resultado?: boolean;
}) {
  const pct = prev === 0 ? null : Math.round((real / prev) * 100);
  const positivo = resultado ? real >= 0 : null;
  return (
    <div className="casal-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-cinza">{titulo}</p>
        {resultado ? null : <span className={pillDoPercentual(entrada, pct)}>{pct === null ? "–" : `${pct}%`}</span>}
      </div>
      <p
        className={
          "mt-2 text-[26px] font-bold tabular-nums " +
          (positivo === null ? "text-grafite" : positivo ? "text-entrada" : "text-saida")
        }
      >
        {moeda(real)}
      </p>
      <p className="mt-1 text-[12px] text-cinza">previsto {moeda(prev)}</p>
    </div>
  );
}

export function Dfcl() {
  const { transacoes, categoriasTodas, pronto, carteira } = useLoja();
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

  // As metas e contas do banco valem mais que o que ficou no navegador: traz sempre ao abrir.
  const pacoteAtual = useRef(pacote);
  pacoteAtual.current = pacote;
  useEffect(() => {
    if (!lido || !remoto) return;
    let ativo = true;
    lerMetasEContas(remoto, carteira.id)
      .then((r) => {
        if (ativo && r) {
          const local = pacoteAtual.current;
          definir({
            ...r,
            lancs: local?.lancs ?? [],
            avisos: local?.avisos ?? [],
            importadoEm: new Date().toISOString(),
          });
        }
      })
      .catch(() => {
        /* sem rede ou sem a migração: segue com o que há no navegador */
      });
    return () => {
      ativo = false;
    };
  }, [lido, remoto, carteira.id, definir]);

  const competencias = useMemo(() => competenciasA(new Date(), deslocamento), [deslocamento]);

  const resultado = useMemo(() => {
    if (!pacote) return null;
    const lancs = lancsDoDfcl(pacote, transacoes ?? [], categoriasTodas ?? []);
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
  }, [pacote, transacoes, categoriasTodas, competencias, pessoa]);

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
        className="casal-toque min-h-[40px] shrink-0 rounded-controle border border-nevoa bg-ar px-3 text-[12px] font-semibold text-grafite lg:text-[13px]"
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

  const hojeYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const iKpi = Math.max(0, competencias.indexOf(hojeYm));
  const totalEntradas = resultado.linhas.find((l) => l.id === "Entrada");
  const totalSaidas = resultado.linhas.find((l) => l.id === "Saída");
  const kpiEntradaPrev = totalEntradas?.prev[iKpi] ?? 0;
  const kpiEntradaReal = totalEntradas?.real[iKpi] ?? 0;
  const kpiSaidaPrev = totalSaidas?.prev[iKpi] ?? 0;
  const kpiSaidaReal = totalSaidas?.real[iKpi] ?? 0;

  return (
    <div>
      <Cabecalho titulo="dfcl" marca acao={botaoImportar} />
      <p className="px-4 pt-1 text-[14px] text-cinza lg:px-0">Previsto x realizado, mês a mês</p>

      <section
        aria-label={`Resumo de ${rotuloMes(competencias[iKpi]!)}`}
        className="grid gap-3 px-4 pt-5 sm:grid-cols-3 lg:px-0"
      >
        <Indicador titulo={`Entradas · ${rotuloMes(competencias[iKpi]!)}`} prev={kpiEntradaPrev} real={kpiEntradaReal} entrada />
        <Indicador titulo={`Saídas · ${rotuloMes(competencias[iKpi]!)}`} prev={kpiSaidaPrev} real={kpiSaidaReal} entrada={false} />
        <Indicador
          titulo={`Resultado · ${rotuloMes(competencias[iKpi]!)}`}
          prev={kpiEntradaPrev - kpiSaidaPrev}
          real={kpiEntradaReal - kpiSaidaReal}
          entrada
          resultado
        />
      </section>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-5 lg:px-0">
        {(["Todos", ...PESSOAS] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={pessoa === p}
            onClick={() => setPessoa(p)}
            className={
              "casal-toque min-h-[40px] rounded-etiqueta border px-4 text-[13px] font-semibold " +
              (pessoa === p
                ? "border-marca bg-marca-suave text-marca-texto"
                : "border-nevoa bg-ar text-cinza hover:text-grafite")
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

      <div className="mx-4 mt-4 mb-24 lg:mx-0 lg:mb-8">
        <div className="casal-card overflow-x-auto">
          <table className="w-full border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr className="text-cinza">
              <th rowSpan={2} className="sticky left-0 z-10 bg-ar px-4 py-3 text-left font-semibold">
                Descrição
              </th>
              {competencias.map((c) => (
                <th key={c} colSpan={3} className="border-l border-nevoa px-3 py-3 text-center font-semibold text-grafite">
                  {rotuloMes(c)}
                </th>
              ))}
            </tr>
            <tr className="border-b border-nevoa text-[11px] uppercase tracking-wide text-cinza">
              {competencias.map((c) => (
                <FragmentoCab key={c} />
              ))}
            </tr>
          </thead>
          <tbody>
            {resultado.linhas.map((l) => {
              const fundo = l.nivel === 0 ? "bg-marca-suave" : "bg-ar";
              return (
                <tr
                  key={l.id}
                  className={
                    (l.nivel === 0
                      ? "bg-marca-suave font-bold text-marca-texto"
                      : l.nivel === 1
                        ? "border-t border-nevoa font-semibold"
                        : l.nivel === 2
                          ? "text-grafite"
                          : "text-cinza") + " hover:bg-fundo"
                  }
                >
                  <td
                    className={`sticky left-0 z-10 px-4 py-2 text-left ${fundo}`}
                    style={{ paddingLeft: `${16 + l.nivel * 14}px` }}
                  >
                    {l.rotulo}
                  </td>
                  {competencias.map((c, i) => (
                    <Celulas key={c} linha={l} i={i} futuro={c > hojeYm} />
                  ))}
                </tr>
              );
            })}
            <tr className="border-t-2 border-nevoa font-bold">
              <td className="sticky left-0 z-10 bg-ar px-4 py-3 text-left">Saldo acumulado</td>
              {competencias.map((c, i) => (
                <FragmentoSaldo key={c} prev={resultado.acumulado.prev[i]} real={resultado.acumulado.real[i]} />
              ))}
            </tr>
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentoCab() {
  return (
    <>
      <th className="border-l border-nevoa px-3 pb-2 text-right font-semibold">Prev</th>
      <th className="px-3 pb-2 text-right font-semibold">Real</th>
      <th className="px-3 pb-2 text-right font-semibold">%</th>
    </>
  );
}

function Celulas({ linha, i, futuro }: { linha: LinhaDfcl; i: number; futuro: boolean }) {
  // Mês que ainda não aconteceu: 0% não é desvio, é só falta de realizado.
  const pct = futuro && linha.real[i] === 0 ? null : linha.pct[i];
  const entrada = linha.id.startsWith("Entrada");
  return (
    <>
      <td className="border-l border-nevoa px-3 py-2 text-right tabular-nums">{reais(linha.prev[i])}</td>
      <td className="px-3 py-2 text-right tabular-nums">{reais(linha.real[i])}</td>
      <td className="px-3 py-2 text-right">
        {pct === null ? null : <span className={pillDoPercentual(entrada, pct)}>{`${pct}%`}</span>}
      </td>
    </>
  );
}

function FragmentoSaldo({ prev, real }: { prev: number; real: number }) {
  return (
    <>
      <td className="border-l border-nevoa px-3 py-3 text-right tabular-nums">{reais(prev)}</td>
      <td className={"px-3 py-3 text-right tabular-nums " + (real < 0 ? "text-saida" : "")}>{reais(real)}</td>
      <td className="px-3 py-3" />
    </>
  );
}
