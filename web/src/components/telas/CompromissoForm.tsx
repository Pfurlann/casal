"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import { montarCompromisso, validarCompromisso, validarLiquidacao } from "@/lib/compromissos";
import { dataLocalISO } from "@/lib/domain";
import { opcoesContaComReserva, parseOrigemPago } from "@/lib/metas";
import { EntradaValor, formatarBRL } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { origensDoPagador } from "@/lib/visibilidade";
import { IconeCategoria } from "../Icones";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";

function classeSelect() {
  return "relative z-10 mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite";
}

export function CompromissoForm({ id }: { id?: string }) {
  const {
    compromissos,
    categorias,
    carteira,
    contas,
    contasTodas,
    cartoes,
    cartoesTodos,
    metas,
    usuarioID,
    salvarCompromisso,
    apagarCompromisso,
    liquidarCompromisso,
  } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = (compromissos ?? []).find((c) => c.id === id);
  const cats = categoriasVisiveis(categorias, "despesa");

  const [nome, setNome] = useState(existente?.nome ?? "");
  const [categoriaID, setCategoriaID] = useState(existente?.categoriaID ?? cats[0]?.id ?? "");
  const [venceEm, setVenceEm] = useState(existente?.venceEm ?? dataLocalISO());
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.valor ?? 0));
  const [pagoCom, setPagoCom] = useState("");
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const contasPagador = useMemo(
    () => origensDoPagador(contasTodas ?? contas, carteira, usuarioID, usuarioID),
    [contasTodas, contas, carteira, usuarioID],
  );
  const cartoesPagador = useMemo(
    () => origensDoPagador(cartoesTodos ?? cartoes, carteira, usuarioID, usuarioID),
    [cartoesTodos, cartoes, carteira, usuarioID],
  );
  const opcoesConta = useMemo(
    () => opcoesContaComReserva(contasPagador, metas),
    [contasPagador, metas],
  );

  const ehNovo = !existente;
  const aPagar = existente?.status === "a_pagar";
  const origem = parseOrigemPago(pagoCom);
  const erroCadastro = validarCompromisso({
    nome,
    valor: ehNovo ? entrada.centavos : existente.valor,
    venceEm,
    categoriaID,
  });
  const erroLiquidar = aPagar ? validarLiquidacao(origem) : null;
  const podeSalvar = ehNovo && !erroCadastro && !salvando;
  const podeLiquidar = aPagar && !erroLiquidar && !salvando;
  const voltar = () => router.push("/mais/compromissos");
  const titulo = ehNovo ? "novo compromisso" : aPagar ? "liquidar" : "compromisso";

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await salvarCompromisso(
        montarCompromisso({
          carteiraID: carteira.id,
          nome,
          valor: entrada.centavos,
          venceEm,
          categoriaID,
        }),
      );
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o compromisso. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function liquidar() {
    if (!existente || !podeLiquidar) return;
    setSalvando(true);
    try {
      await liquidarCompromisso({
        id: existente.id,
        contaID: origem.contaID,
        cartaoID: origem.cartaoID,
        metaID: origem.metaID,
      });
      voltar();
    } catch {
      avisar("erro", "Não deu para liquidar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!existente) return;
    setSalvando(true);
    try {
      await apagarCompromisso(existente.id);
      voltar();
    } catch {
      avisar("erro", "Não deu para apagar o compromisso. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (id && !existente) {
    return (
      <div>
        <Cabecalho titulo="compromisso" voltarPara="/mais/compromissos" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este compromisso não existe mais.</p>
      </div>
    );
  }

  const seletorOrigem = (
    <div className="mt-4">
      <Rotulo>pago com</Rotulo>
      <select
        value={pagoCom}
        aria-label="Forma de pagamento"
        onChange={(e) => setPagoCom(e.target.value)}
        className={classeSelect()}
      >
        <option value="">Escolha conta ou cartão</option>
        {opcoesConta.length > 0 && (
          <optgroup label="Contas">
            {opcoesConta.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </optgroup>
        )}
        {cartoesPagador.length > 0 && (
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
  );

  return (
    <div className="flex h-full flex-col">
      <Cabecalho titulo={titulo} voltarPara="/mais/compromissos" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="pt-2 text-[12px] text-cinza">
          em {carteira.nome}
          {ehNovo
            ? " · já vira lançamento a pagar"
            : aPagar
              ? " · só falta a forma de pagamento"
              : " · liquidado"}
        </p>

        {ehNovo ? (
          <Campo label="Nome" value={nome} onChange={setNome} placeholder="Conta de luz, boleto…" />
        ) : (
          <div className="mt-4">
            <p className="text-[16px] text-grafite">{existente.nome}</p>
            <p className="mt-1 text-[12px] text-cinza">
              vence {existente.venceEm.split("-").reverse().join("/")}
            </p>
          </div>
        )}

        <div
          className="mt-6"
          role="status"
          aria-live="polite"
          aria-label="Valor do compromisso"
        >
          <Rotulo>valor</Rotulo>
          <div className="mt-2">
            <Numero centavos={ehNovo ? entrada.centavos : existente.valor} tamanho="secao" />
          </div>
          {!ehNovo && (
            <p className="mt-1 text-[12px] text-cinza">
              O valor já está no lançamento. Liquidar não pede de novo.
            </p>
          )}
        </div>

        {ehNovo && (
          <>
            <div className="mt-4">
              <Rotulo>vencimento</Rotulo>
              <input
                type="date"
                value={venceEm}
                onChange={(e) => setVenceEm(e.target.value)}
                aria-label="Vencimento"
                className={classeSelect()}
              />
            </div>
            <div className="mt-4">
              <Rotulo>categoria</Rotulo>
              <div className="mt-2 flex flex-wrap gap-2">
                {cats.map((c) => (
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
            </div>
          </>
        )}

        {aPagar && seletorOrigem}

        {aPagar && (
          <div className="mt-6">
            <Botao variante="primario" onClick={() => void liquidar()} disabled={!podeLiquidar}>
              Liquidar {formatarBRL(existente.valor)}
            </Botao>
          </div>
        )}

        {existente && (
          <div className="mt-4">
            <Botao variante="destrutivo" onClick={() => void apagar()} disabled={salvando}>
              Apagar compromisso
            </Botao>
          </div>
        )}
      </div>
      {ehNovo && (
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
          podeSalvar={podeSalvar}
          mostraSalvar
        />
      )}
    </div>
  );
}
