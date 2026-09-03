"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import { ROTULO_TIPO_CONTA, type DespesaFixa } from "@/lib/domain";
import { validarDespesaFixa } from "@/lib/despesas-fixas";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { SeletorCategoria } from "../ui/SeletorCategoria";
import { Teclado } from "../ui/Teclado";

export function DespesaFixaForm({ id }: { id?: string }) {
  const {
    despesasFixas,
    contas,
    cartoes,
    carteira,
    categorias,
    salvarDespesaFixa,
    apagarDespesaFixa,
  } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = (despesasFixas ?? []).find((f) => f.id === id);
  const tipoInicial = existente?.tipo === "receita" ? "receita" : "despesa";
  const catsIniciais = categoriasVisiveis(categorias, tipoInicial);

  const [nome, setNome] = useState(existente?.nome ?? "");
  const [tipo, setTipo] = useState<"despesa" | "receita">(tipoInicial);
  const [categoriaID, setCategoriaID] = useState(existente?.categoriaID ?? catsIniciais[0]?.id ?? "");
  const [diaVencimento, setDiaVencimento] = useState(existente?.diaVencimento ?? 10);
  const [contaID, setContaID] = useState(existente?.contaID ?? (existente?.cartaoID ? "" : contas[0]?.id ?? ""));
  const [cartaoID, setCartaoID] = useState(existente?.tipo === "receita" ? "" : existente?.cartaoID ?? "");
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.valor ?? 0));
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const ehReceita = tipo === "receita";
  const origemCartao = !ehReceita && Boolean(cartaoID);
  const pagoCom = origemCartao ? `cartao:${cartaoID}` : contaID ? `conta:${contaID}` : "";
  const erro = validarDespesaFixa({
    nome,
    valor: entrada.centavos,
    diaVencimento,
    contaID: origemCartao ? undefined : contaID || undefined,
    cartaoID: origemCartao ? cartaoID : undefined,
    tipo,
  });
  const pode = !erro && !salvando;
  const voltar = () => router.push("/mais/fixas");
  const mostraCartoes = !ehReceita && cartoes.length > 0;
  const precisaOrigem = contas.length === 0 && !mostraCartoes;

  function escolherTipo(proximo: "despesa" | "receita") {
    if (proximo === tipo) return;
    setTipo(proximo);
    const primeira = categoriasVisiveis(categorias, proximo)[0]?.id ?? "";
    setCategoriaID(primeira);
    if (proximo === "receita") {
      setCartaoID("");
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
      return;
    }
    setContaID("");
    setCartaoID("");
  }

  function montar(): DespesaFixa {
    return {
      id: existente?.id ?? crypto.randomUUID(),
      carteiraID: carteira.id,
      nome: nome.trim(),
      valor: entrada.centavos,
      categoriaID,
      diaVencimento,
      contaID: origemCartao ? undefined : contaID || undefined,
      cartaoID: origemCartao ? cartaoID : undefined,
      tipo,
    };
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarDespesaFixa(montar());
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o fixo. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!existente) return;
    setSalvando(true);
    try {
      await apagarDespesaFixa(existente.id);
      voltar();
    } catch {
      avisar("erro", "Não deu para apagar o fixo. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 bg-ar">
        <Cabecalho
          titulo={existente ? "editar fixo" : "novo fixo"}
          voltarPara="/mais/fixas"
          acao={
            existente ? (
              <button
                type="button"
                aria-label="Apagar fixo"
                onClick={() => void apagar()}
                disabled={salvando}
                className="flex min-h-[44px] items-center text-[14px] font-semibold text-ambar-texto"
              >
                Apagar
              </button>
            ) : undefined
          }
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="pt-2 text-[12px] text-cinza">em {carteira.nome} · todo mês</p>
        <div className="mt-4" role="group" aria-label="Tipo do fixo">
          <Etiqueta ativa={!ehReceita} aoClicar={() => escolherTipo("despesa")}>
            Gasto
          </Etiqueta>
          <span className="inline-block w-2" />
          <Etiqueta ativa={ehReceita} aoClicar={() => escolherTipo("receita")}>
            Receita
          </Etiqueta>
        </div>
        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder={ehReceita ? "Salário, mesada…" : "Aluguel, Netflix, escola…"}
        />

        <div
          className="mt-6"
          role="status"
          aria-live="polite"
          aria-label={ehReceita ? "Valor da receita" : "Valor da despesa"}
        >
          <Rotulo>valor</Rotulo>
          <div className="mt-2">
            <Numero centavos={entrada.centavos} tamanho="secao" />
          </div>
        </div>

        <div className="mt-4">
          <Rotulo>categoria</Rotulo>
          <div className="mt-2">
            <SeletorCategoria
              tipo={tipo}
              custom={categorias}
              valor={categoriaID}
              onChange={setCategoriaID}
            />
          </div>
        </div>

        <div className="mt-4">
          <Rotulo>{ehReceita ? "entra todo dia" : "vence todo dia"}</Rotulo>
          <select
            value={diaVencimento}
            aria-label="Dia do vencimento"
            onChange={(e) => setDiaVencimento(Number(e.target.value))}
            className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[12px] text-cinza">
            Se o mês for mais curto, cai no último dia.
          </p>
        </div>

        {precisaOrigem ? (
          <div className="mt-4">
            <p className="text-[14px] text-cinza">
              {ehReceita
                ? "Cadastre uma conta nesta carteira para receber o valor."
                : "Cadastre uma conta ou um cartão nesta carteira para atrelar o pagamento."}
            </p>
            <Link
              href="/mais/contas/novo"
              className="mt-2 flex min-h-[44px] items-center text-[14px] font-semibold text-grafite"
            >
              Cadastrar conta
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <Rotulo>{ehReceita ? "recebido em" : "pago com"}</Rotulo>
            <select
              value={pagoCom}
              aria-label={ehReceita ? "Conta que recebe" : "Forma de pagamento"}
              onChange={(e) => escolherOrigem(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
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

      </div>
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
  );
}
