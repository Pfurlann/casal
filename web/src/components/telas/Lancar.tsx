"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import {
  ROTULO_TIPO_CONTA,
  dataDeLocalISO,
  dataLocalISO,
  type Categoria,
  type TipoTransacao,
} from "@/lib/domain";
import { dividir, EntradaValor, formatarBRL } from "@/lib/money";
import { carteiraMostraPagador } from "@/lib/pagador";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { SeletorPagador } from "../ui/SeletorPagador";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { SeletorCategoria } from "../ui/SeletorCategoria";
import { Teclado } from "../ui/Teclado";
import { Botao } from "../ui/Botao";
import { useAviso } from "../ui/Aviso";

function categoriasDoTipo(tipo: "despesa" | "receita", custom?: Categoria[]) {
  return categoriasVisiveis(custom, tipo);
}

function classeSelect() {
  return "relative z-10 mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite";
}

export function Lancar() {
  const { cartoes, contas, lancar, carteira, membros, usuarioID, categorias: categoriasCustom } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();

  const [entrada] = useState(() => new EntradaValor());
  const [, tick] = useState(0);
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [categoriaID, setCategoriaID] = useState(
    () => categoriasDoTipo("despesa", categoriasCustom)[0]?.id ?? "",
  );
  const [descricao, setDescricao] = useState("");
  const [dataISO, setDataISO] = useState(() => dataLocalISO());
  const [contaID, setContaID] = useState(contas[0]?.id ?? "");
  const [cartaoID, setCartaoID] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [pagadorEscolhido, setPagadorEscolhido] = useState<string | undefined>(undefined);
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const mostraPagador = carteiraMostraPagador(carteira);
  const pagadorID = pagadorEscolhido ?? usuarioID ?? "";
  const ehReceita = tipo === "receita";
  const origemCartao = !ehReceita && Boolean(cartaoID);
  const temOrigem = origemCartao || Boolean(contaID);
  const pode = entrada.podeSalvar && temOrigem && !salvando;
  const titulo = mais ? "mais opções" : ehReceita ? "nova receita" : "novo gasto";
  const voltar = () => {
    if (window.history.length > 1) router.back();
    else router.push("/mes");
  };
  const primeiraParcela = parcelas > 1 ? (dividir(entrada.centavos, parcelas)[0] ?? 0) : 0;
  const pagoCom = origemCartao ? `cartao:${cartaoID}` : contaID ? `conta:${contaID}` : "";
  const mostraCartoes = !ehReceita && cartoes.length > 0;
  const mostraSelect = contas.length > 0 || mostraCartoes;

  function escolherTipo(proximo: "despesa" | "receita") {
    if (proximo === tipo) return;
    setTipo(proximo);
    setCategoriaID(categoriasDoTipo(proximo, categoriasCustom)[0]?.id ?? "");
    if (proximo === "receita") {
      setCartaoID("");
      setParcelas(1);
      if (!contaID) setContaID(contas[0]?.id ?? "");
    }
  }

  function escolherOrigem(valor: string) {
    if (valor.startsWith("cartao:")) {
      setCartaoID(valor.slice("cartao:".length));
      setContaID("");
      return;
    }
    if (valor.startsWith("conta:")) {
      setContaID(valor.slice("conta:".length));
      setCartaoID("");
      setParcelas(1);
      return;
    }
    setContaID("");
    setCartaoID("");
    setParcelas(1);
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      const tipoLancamento: TipoTransacao = tipo;
      await lancar({
        valor: entrada.centavos,
        categoriaID,
        descricao,
        data: dataDeLocalISO(dataISO),
        cartaoID: origemCartao ? cartaoID : undefined,
        contaID: origemCartao ? undefined : contaID || undefined,
        parcelas: origemCartao ? parcelas : 1,
        pagadorID: pagadorID || undefined,
        tipo: tipoLancamento,
      });
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o lançamento. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const seletorOrigem = (
    <div className="relative z-10">
      {contas.length === 0 && (
        <div className="mt-3">
          <p className="text-[14px] text-cinza">
            {ehReceita
              ? "Cadastre uma conta para receber o valor — salário, pix ou reembolso."
              : "Cadastre uma conta para atrelar o gasto a corrente, poupança ou dinheiro."}
          </p>
          <Link
            href="/mais/contas/novo"
            className="mt-2 flex min-h-[44px] items-center text-[14px] font-semibold text-grafite"
          >
            Cadastrar conta
          </Link>
        </div>
      )}
      {mostraSelect && (
        <div className="mt-3">
          <Rotulo>{ehReceita ? "recebido em" : "pago com"}</Rotulo>
          <select
            value={pagoCom}
            aria-label={ehReceita ? "Conta que recebe" : "Forma de pagamento"}
            onChange={(e) => escolherOrigem(e.target.value)}
            className={classeSelect()}
          >
            {!pagoCom && (
              <option value="">
                {ehReceita ? "Escolha a conta que recebe" : "Escolha de onde sai"}
              </option>
            )}
            {contas.length > 0 && (
              <optgroup label="Contas">
                {contas.map((c) => (
                  <option key={c.id} value={`conta:${c.id}`}>
                    {c.nome} · {ROTULO_TIPO_CONTA[c.tipo]}
                  </option>
                ))}
              </optgroup>
            )}
            {mostraCartoes && (
              <optgroup label="Cartões">
                {cartoes.map((c) => (
                  <option key={c.id} value={`cartao:${c.id}`}>
                    {c.banco} · final {c.ultimos4}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}
      {origemCartao && (
        <div className="mt-3">
          <Rotulo>parcelar em</Rotulo>
          <select
            value={parcelas}
            aria-label="Parcelas"
            onChange={(e) => setParcelas(Number(e.target.value))}
            className={classeSelect()}
          >
            <option value={1}>À vista</option>
            {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </select>
          {parcelas > 1 && (
            <p className="mt-2 text-[12px] text-cinza">
              {parcelas}x de {formatarBRL(primeiraParcela)}, primeira parcela maior se
              houver sobra
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Cabecalho titulo={titulo} voltarPara="/mes" />
      {carteira?.nome && (
        <p className="px-4 pt-1 text-center text-[12px] text-cinza">em {carteira.nome}</p>
      )}
      {mais ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Campo
            label={ehReceita ? "De onde veio" : "Onde foi o gasto"}
            value={descricao}
            onChange={setDescricao}
          />
          <div className="mt-6">
            <Botao variante="primario" onClick={() => setMais(false)}>
              Pronto
            </Botao>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div
              role="group"
              aria-label="Tipo de lançamento"
              className="mt-4 flex justify-center gap-2 px-4"
            >
              <Etiqueta ativa={!ehReceita} aoClicar={() => escolherTipo("despesa")}>
                Gasto
              </Etiqueta>
              <Etiqueta ativa={ehReceita} aoClicar={() => escolherTipo("receita")}>
                Receita
              </Etiqueta>
            </div>
            <div
              className="px-4 pt-6 text-center"
              role="status"
              aria-live="polite"
              aria-label={ehReceita ? "Valor da receita" : "Valor do gasto"}
            >
              <Numero centavos={entrada.centavos} tamanho="heroi" subordinaCentavos />
            </div>
            <div className="mt-5 px-4">
              <SeletorCategoria
                tipo={tipo}
                custom={categoriasCustom}
                valor={categoriaID}
                onChange={setCategoriaID}
              />
            </div>
            {mostraPagador && (
              <div className="mt-4 px-4">
                <Rotulo>{ehReceita ? "quem recebeu" : "quem pagou"}</Rotulo>
                <SeletorPagador
                  membros={membros ?? []}
                  usuarioID={usuarioID}
                  valor={pagadorID}
                  onChange={setPagadorEscolhido}
                />
              </div>
            )}
          </div>
          <div className="relative z-20 shrink-0 border-t border-nevoa bg-ar px-4 pt-3">
            <Rotulo>data</Rotulo>
            <input
              type="date"
              value={dataISO}
              onChange={(e) => setDataISO(e.target.value)}
              aria-label="Data do lançamento"
              className={classeSelect()}
            />
            {seletorOrigem}
          </div>
          <div className="relative z-0 shrink-0">
            <Teclado
              aoDigitar={(d) => {
                entrada.digitar(d);
                tick((n) => n + 1);
              }}
              aoApagar={() => {
                entrada.apagar();
                tick((n) => n + 1);
              }}
              aoSalvar={salvar}
              aoFechar={voltar}
              aoMaisOpcoes={() => setMais(true)}
              podeSalvar={pode}
              mostraSalvar
            />
          </div>
        </>
      )}
    </div>
  );
}
