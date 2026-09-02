"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIAS, ROTULO_TIPO_CONTA } from "@/lib/domain";
import { dividir, EntradaValor, formatarBRL } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { Botao } from "../ui/Botao";
import { useAviso } from "../ui/Aviso";
import { IconeCategoria } from "../Icones";

const DESPESAS = CATEGORIAS.filter((c) => c.tipo === "despesa");

export function Lancar() {
  const { cartoes, contas, lancar } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();

  const [entrada] = useState(() => new EntradaValor());
  const [, tick] = useState(0);
  const [categoriaID, setCategoriaID] = useState(DESPESAS[0].id);
  const [descricao, setDescricao] = useState("");
  const [contaID, setContaID] = useState(contas[0]?.id ?? "");
  const [cartaoID, setCartaoID] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const temOrigem = Boolean(cartaoID || contaID);
  const pode = entrada.podeSalvar && temOrigem && !salvando;
  const voltar = () => {
    if (window.history.length > 1) router.back();
    else router.push("/mes");
  };
  const primeiraParcela = parcelas > 1 ? (dividir(entrada.centavos, parcelas)[0] ?? 0) : 0;
  const pagoCom = cartaoID ? `cartao:${cartaoID}` : contaID ? `conta:${contaID}` : "";

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
      await lancar({
        valor: entrada.centavos,
        categoriaID,
        descricao,
        data: new Date(),
        cartaoID: cartaoID || undefined,
        contaID: cartaoID ? undefined : contaID || undefined,
        parcelas: cartaoID ? parcelas : 1,
      });
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o lançamento. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Cabecalho titulo={mais ? "mais opções" : "novo gasto"} voltarPara="/mes" />
      <div
        className="px-4 pt-6 text-center"
        role="status"
        aria-live="polite"
        aria-label="Valor do gasto"
      >
        <Numero centavos={entrada.centavos} tamanho="heroi" subordinaCentavos />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2 px-4">
        {DESPESAS.slice(0, 6).map((c) => (
          <Etiqueta
            key={c.id}
            ativa={categoriaID === c.id}
            aoClicar={() => setCategoriaID(c.id)}
          >
            <IconeCategoria nome={c.icone} size={14} />
            {c.nome}
          </Etiqueta>
        ))}
      </div>

      {mais ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Campo label="Onde foi o gasto" value={descricao} onChange={setDescricao} />
          {contas.length === 0 && (
            <div className="mt-4">
              <p className="text-[14px] text-cinza">
                Cadastre uma conta para atrelar o gasto a corrente, poupança ou dinheiro.
              </p>
              <Link
                href="/mais/contas/novo"
                className="mt-2 flex min-h-[44px] items-center text-[14px] font-semibold text-grafite"
              >
                Cadastrar conta
              </Link>
            </div>
          )}
          {(contas.length > 0 || cartoes.length > 0) && (
            <div className="mt-4">
              <Rotulo>pago com</Rotulo>
              <select
                value={pagoCom}
                aria-label="Forma de pagamento"
                onChange={(e) => escolherOrigem(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
              >
                {!pagoCom && <option value="">Escolha de onde sai</option>}
                {contas.length > 0 && (
                  <optgroup label="Contas">
                    {contas.map((c) => (
                      <option key={c.id} value={`conta:${c.id}`}>
                        {c.nome} · {ROTULO_TIPO_CONTA[c.tipo]}
                      </option>
                    ))}
                  </optgroup>
                )}
                {cartoes.length > 0 && (
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
          {cartaoID && (
            <div className="mt-4">
              <Rotulo>parcelar em</Rotulo>
              <select
                value={parcelas}
                aria-label="Parcelas"
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
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
          <div className="mt-6">
            <Botao variante="primario" onClick={() => setMais(false)}>
              Pronto
            </Botao>
          </div>
        </div>
      ) : (
        <div className="mt-auto">
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
      )}
    </div>
  );
}
