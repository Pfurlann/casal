"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { categoriaPorId, categoriasVisiveis } from "@/lib/categorias";
import {
  ROTULO_TIPO_CONTA,
  competenciaDaCompra,
  competenciaDe,
  dataDeLocalISO,
  dataLocalISO,
  hrefDoMes,
  type Categoria,
  type TipoTransacao,
} from "@/lib/domain";
import {
  fraseTeto,
  gastoDaCategoria,
  opcoesContaComReserva,
  parseOrigemPago,
  progressoTeto,
  tetoDaCategoria,
  valorPagoCom,
} from "@/lib/metas";
import { dividir, EntradaValor, formatarBRL } from "@/lib/money";
import { carteiraMostraPagador } from "@/lib/pagador";
import { useLoja } from "@/lib/store";
import { origensDoPagador } from "@/lib/visibilidade";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { SeletorPagador } from "../ui/SeletorPagador";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { SeletorCategoria } from "../ui/SeletorCategoria";
import { BolinhaCor } from "../ui/SeletorCor";
import { Teclado } from "../ui/Teclado";
import { useAviso } from "../ui/Aviso";
import { fecharFolha } from "@/lib/folha-nav";

function categoriasDoTipo(tipo: "despesa" | "receita", custom?: Categoria[]) {
  return categoriasVisiveis(custom, tipo);
}

function classeSelect() {
  return "relative z-10 mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite";
}

export function Lancar({
  comoFolha = false,
  aoSair,
}: {
  comoFolha?: boolean;
  /** Fecha a folha interceptada com a mesma lógica do backdrop. */
  aoSair?: () => void;
} = {}) {
  const {
    cartoes,
    cartoesTodos,
    contas,
    contasTodas,
    lancar,
    carteira,
    membros,
    usuarioID,
    categorias: categoriasCustom,
    metas,
    transacoes,
  } = useLoja();
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
  const [metaID, setMetaID] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [pagadorEscolhido, setPagadorEscolhido] = useState<string | undefined>(undefined);
  const [salvando, setSalvando] = useState(false);
  const mostraPagador = carteiraMostraPagador(carteira);
  const pagadorID = pagadorEscolhido ?? usuarioID ?? "";
  const contasPagador = useMemo(
    () => origensDoPagador(contasTodas ?? contas, carteira, pagadorID, usuarioID),
    [contasTodas, contas, carteira, pagadorID, usuarioID],
  );
  const cartoesPagador = useMemo(
    () => origensDoPagador(cartoesTodos ?? cartoes, carteira, pagadorID, usuarioID),
    [cartoesTodos, cartoes, carteira, pagadorID, usuarioID],
  );
  const ehReceita = tipo === "receita";
  const origemCartao = !ehReceita && Boolean(cartaoID);
  const temOrigem = origemCartao || Boolean(contaID);
  const descricaoOk = descricao.trim().length > 0;
  const pode = entrada.podeSalvar && temOrigem && descricaoOk && !salvando;
  const titulo = ehReceita ? "nova receita" : "novo gasto";
  const voltar = () => {
    if (aoSair) {
      aoSair();
      return;
    }
    fecharFolha(router);
  };

  /** Soft `push` após salvar deixa @folha/(.)lancar montada no mobile/PWA. */
  const irAposSucesso = (destino: string) => {
    if (comoFolha) {
      router.back();
      // iOS: back precisa assentar o histórico antes do replace do mês certo.
      window.setTimeout(() => {
        router.replace(destino);
      }, 0);
      return;
    }
    router.replace(destino);
  };
  const teto = !ehReceita ? tetoDaCategoria(metas, categoriaID) : undefined;
  const competencia = competenciaDe(dataDeLocalISO(dataISO));
  const gastoTeto = teto?.categoriaID
    ? gastoDaCategoria(transacoes ?? [], teto.categoriaID, competencia, cartoesPagador)
    : 0;
  const progresso = teto
    ? progressoTeto(teto.valorAlvo, gastoTeto + entrada.centavos)
    : undefined;
  const nomeTeto = teto
    ? (categoriaPorId(teto.categoriaID, categoriasCustom)?.nome ?? teto.nome)
    : "";
  const primeiraParcela = parcelas > 1 ? (dividir(entrada.centavos, parcelas)[0] ?? 0) : 0;
  const opcoesConta = useMemo(
    () =>
      ehReceita
        ? contasPagador.map((c) => ({
            valor: `conta:${c.id}`,
            rotulo: `${c.nome} · ${ROTULO_TIPO_CONTA[c.tipo]}`,
          }))
        : opcoesContaComReserva(contasPagador, metas),
    [ehReceita, contasPagador, metas],
  );
  const pagoCom = valorPagoCom({
    contaID: origemCartao ? undefined : contaID || undefined,
    cartaoID: origemCartao ? cartaoID : undefined,
    metaID: origemCartao || ehReceita ? undefined : metaID || undefined,
  });
  const mostraCartoes = !ehReceita && cartoesPagador.length > 0;
  const mostraSelect = contasPagador.length > 0 || mostraCartoes;
  const cartaoEscolhido = origemCartao ? cartoesPagador.find((c) => c.id === cartaoID) : undefined;
  const contaEscolhida = !origemCartao ? contasPagador.find((c) => c.id === contaID) : undefined;
  const corOrigem = cartaoEscolhido?.cor ?? contaEscolhida?.cor;
  const nomeOrigem = cartaoEscolhido
    ? `${cartaoEscolhido.banco} · final ${cartaoEscolhido.ultimos4}`
    : contaEscolhida?.nome;
  const avisoDescricao =
    entrada.podeSalvar && temOrigem && !descricaoOk
      ? ehReceita
        ? "Diz de onde veio."
        : "Diz onde foi o gasto."
      : undefined;

  useEffect(() => {
    const contaVale = contasPagador.some((c) => c.id === contaID);
    const cartaoVale = cartoesPagador.some((c) => c.id === cartaoID);
    if (contaID && !contaVale) setContaID("");
    if (cartaoID && !cartaoVale) setCartaoID("");
    if ((!contaID || !contaVale) && (!cartaoID || !cartaoVale)) {
      const primeira = contasPagador[0];
      if (primeira) setContaID(primeira.id);
    }
  }, [pagadorID, contasPagador, cartoesPagador, contaID, cartaoID]);

  function escolherTipo(proximo: "despesa" | "receita") {
    if (proximo === tipo) return;
    setTipo(proximo);
    setCategoriaID(categoriasDoTipo(proximo, categoriasCustom)[0]?.id ?? "");
    if (proximo === "receita") {
      setCartaoID("");
      setParcelas(1);
      if (!contaID) setContaID(contasPagador[0]?.id ?? "");
    }
  }

  function escolherOrigem(valor: string) {
    const origem = parseOrigemPago(valor);
    if (origem.cartaoID) {
      setCartaoID(origem.cartaoID);
      setContaID("");
      setMetaID("");
      return;
    }
    if (origem.contaID) {
      setContaID(origem.contaID);
      setCartaoID("");
      setMetaID(origem.metaID ?? "");
      setParcelas(1);
      return;
    }
    setContaID("");
    setCartaoID("");
    setMetaID("");
    setParcelas(1);
  }

  async function salvar() {
    if (!descricaoOk) {
      avisar("erro", ehReceita ? "Diz de onde veio." : "Diz onde foi o gasto.");
      return;
    }
    if (!pode) return;
    setSalvando(true);
    try {
      const tipoLancamento: TipoTransacao = tipo;
      const data = dataDeLocalISO(dataISO);
      await lancar({
        valor: entrada.centavos,
        categoriaID,
        descricao: descricao.trim(),
        data,
        cartaoID: origemCartao ? cartaoID : undefined,
        contaID: origemCartao ? undefined : contaID || undefined,
        parcelas: origemCartao ? parcelas : 1,
        pagadorID: pagadorID || undefined,
        tipo: tipoLancamento,
        metaID: origemCartao || ehReceita ? undefined : metaID || undefined,
      });
      const destino = origemCartao && cartaoEscolhido
        ? competenciaDaCompra(data, cartaoEscolhido)
        : competenciaDe(data);
      irAposSucesso(hrefDoMes(destino));
      // Mantém salvando até desmontar — no mobile evita reabrir/reenviar se a nav atrasar.
    } catch {
      avisar("erro", "Não deu para salvar o lançamento. Tente de novo.");
      setSalvando(false);
    }
  }

  const seletorOrigem = (
    <div className="relative z-10">
      {contasPagador.length === 0 && (
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
            {opcoesConta.length > 0 && (
              <optgroup label="Contas">
                {opcoesConta.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </optgroup>
            )}
            {mostraCartoes && (
              <optgroup label="Cartões">
                {cartoesPagador.map((c) => (
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
      <Cabecalho titulo={titulo} aoVoltar={voltar} />
      {carteira?.nome && (
        <p className="px-4 pt-1 text-center text-[12px] text-cinza">em {carteira.nome}</p>
      )}
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
        <div className="px-4">
          <Campo
            label={ehReceita ? "De onde veio" : "Onde foi o gasto"}
            value={descricao}
            onChange={setDescricao}
            erro={avisoDescricao}
          />
        </div>
        <div className="mt-5 px-4">
          <SeletorCategoria
            tipo={tipo}
            custom={categoriasCustom}
            valor={categoriaID}
            onChange={setCategoriaID}
          />
        </div>
        {progresso && (
          <p
            className={`mt-3 px-4 text-center text-[12px] ${
              progresso.faixa === "folga" ? "text-cinza" : "text-ambar-texto"
            }`}
          >
            {fraseTeto(progresso, nomeTeto)}
          </p>
        )}
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
        {corOrigem && nomeOrigem && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-cinza">
            <BolinhaCor cor={corOrigem} />
            <span>{nomeOrigem}</span>
          </div>
        )}
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
          podeSalvar={pode}
          mostraSalvar
        />
      </div>
    </div>
  );
}
