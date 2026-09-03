"use client";

import { montarDiagnostico } from "@/lib/diagnostico";
import { folgaDoPeriodo } from "@/lib/metas";
import { formatarBRL } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Curva } from "../ui/Curva";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Trilha } from "../ui/Trilha";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function Dashboard() {
  const {
    transacoes,
    categorias,
    cartoes,
    faturas,
    contas,
    metas,
    compromissos,
    carteira,
  } = useLoja();
  const agora = new Date();
  const d = montarDiagnostico({
    transacoes: transacoes ?? [],
    categorias,
    cartoes: cartoes ?? [],
    faturas: faturas ?? [],
    contas: contas ?? [],
    metas: metas ?? [],
    compromissos: compromissos ?? [],
    agora,
  });
  const folga = folgaDoPeriodo(metas, transacoes ?? [], d.competencia);
  const maiorCategoria = d.categorias[0]?.total ?? 0;

  return (
    <div>
      <Cabecalho
        titulo={`visão · ${carteira.nome}`}
        marca
        folga={folga}
      />
      <div className="px-4 pt-8">
        <Rotulo>diagnóstico · {MESES[(d.competencia.mes ?? 1) - 1]}</Rotulo>
        <p className="mt-2 text-[16px] leading-snug text-grafite">{d.frase}</p>

        <div className="mt-8">
          <Rotulo>gastos vs receitas</Rotulo>
          <div className="mt-2">
            <Numero centavos={d.gasto} tamanho="heroi" subordinaCentavos />
          </div>
          <p className="mt-1 text-[12px] text-cinza">gastos neste mês</p>
          <div className="mt-3">
            <Numero
              centavos={d.receita}
              tamanho="secao"
              tom={d.fluxo < 0 ? "atencao" : "normal"}
            />
          </div>
          <p className="mt-1 text-[12px] text-cinza">receitas neste mês</p>
          <div className="mt-4">
            <Trilha
              consumido={d.gasto}
              total={d.gasto + d.receita > 0 ? d.gasto + d.receita : 0}
            />
          </div>
        </div>

        <div className="mt-8">
          <Rotulo>fluxo de caixa</Rotulo>
          <div className="mt-2">
            <LinhaLista titulo="Entradas" valor={d.receita} semBorda />
            <LinhaLista titulo="Saídas" valor={d.gasto} semBorda />
            <LinhaLista
              titulo="Fluxo do mês"
              subtitulo="receitas − gastos"
              valor={d.fluxo}
              tom={d.fluxo < 0 ? "atencao" : "normal"}
              semBorda={d.saldoContas === undefined}
            />
            {d.saldoContas !== undefined && (
              <LinhaLista
                titulo="Saldo nas contas"
                subtitulo="o que está no banco hoje"
                valor={d.saldoContas}
                href="/mais/contas"
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 px-4">
        <Rotulo>categorias</Rotulo>
        {d.categorias.length === 0 ? (
          <p className="mt-3 text-[14px] text-cinza">Nenhum gasto categorizado neste mês.</p>
        ) : (
          <div className="mt-2">
            {d.categorias.map((cat) => (
              <div key={cat.categoriaID || cat.nome}>
                <LinhaLista titulo={cat.nome} valor={cat.total} semBorda />
                <div className="pb-3">
                  <Trilha consumido={cat.total} total={maiorCategoria} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 px-4">
        <Rotulo>cartões · fatura / comprometido</Rotulo>
        {d.cartoes.length === 0 ? (
          <p className="mt-3 text-[14px] text-cinza">Nenhum cartão nesta carteira.</p>
        ) : (
          <div className="mt-2">
            {d.cartoes.map((cartao) => (
              <div key={cartao.cartaoID}>
                <LinhaLista
                  titulo={cartao.nome}
                  subtitulo={
                    cartao.limite > 0
                      ? `fatura ${formatarBRL(cartao.fatura)} · ${cartao.usadoX100}% do limite`
                      : `fatura ${formatarBRL(cartao.fatura)}`
                  }
                  valor={cartao.comprometido}
                  tom={cartao.usadoX100 >= 80 ? "atencao" : "normal"}
                  href={`/cartoes/${cartao.cartaoID}`}
                />
                {cartao.limite > 0 && (
                  <div className="pb-3">
                    <Trilha consumido={cartao.fatura} total={cartao.limite} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 px-4">
        <Rotulo>problemas</Rotulo>
        {d.problemas.length === 0 ? (
          <p className="mt-3 text-[14px] text-cinza">Nenhum alerta nesta carteira.</p>
        ) : (
          <div className="mt-2">
            {d.problemas.map((p, i) => (
              <LinhaLista
                key={`${p.tipo}-${p.href ?? p.titulo}-${i}`}
                titulo={p.titulo}
                subtitulo={p.detalhe}
                valor={p.valor}
                tom="atencao"
                href={p.href}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 px-4">
        <Rotulo>evolução de gastos</Rotulo>
        <div className="mt-3">
          <Curva pontos={d.evolucao.map((p) => ({ rotulo: p.rotulo, total: p.gasto }))} />
        </div>
      </div>

      <div className="mt-8 px-4 pb-4">
        <Rotulo>metas</Rotulo>
        {d.metas.length === 0 ? (
          <p className="mt-3 text-[14px] text-cinza">Nenhuma meta ativa.</p>
        ) : (
          <div className="mt-2">
            {d.metas.map((m) => {
              const atencao = m.tipo === "teto_categoria" && m.faixa !== "folga";
              return (
                <div key={m.metaID}>
                  <LinhaLista
                    titulo={m.nome}
                    subtitulo={`${formatarBRL(m.atual)} de ${formatarBRL(m.alvo)}`}
                    valor={m.alvo}
                    tom={atencao ? "atencao" : "normal"}
                    href={m.href}
                  />
                  <div className="pb-3">
                    <Trilha
                      consumido={m.atual > 0 ? m.atual : 0}
                      total={m.alvo}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
