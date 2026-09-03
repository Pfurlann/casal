"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoriasVisiveis } from "@/lib/categorias";
import { ROTULO_TIPO_CONTA, type Meta, type TipoMeta } from "@/lib/domain";
import {
  cabimentoNaConta,
  ehEconomia,
  marcarMetaConcluida,
  validarAlocacao,
  validarMeta,
} from "@/lib/metas";
import { EntradaValor, formatarBRL } from "@/lib/money";
import { saldoDaConta } from "@/lib/contas";
import { useLoja } from "@/lib/store";
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

export function MetaForm({ id }: { id?: string }) {
  const { metas, categorias, carteira, contas, transacoes, salvarMeta, apagarMeta } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = (metas ?? []).find((m) => m.id === id);
  const tipoInicial: TipoMeta =
    existente?.tipo === "economia_mensal"
      ? "economia_mensal"
      : existente?.tipo === "objetivo"
        ? "objetivo"
        : "teto_categoria";
  const cats = categoriasVisiveis(categorias, "despesa");

  const [tipo, setTipo] = useState<TipoMeta>(tipoInicial);
  const [nome, setNome] = useState(existente?.nome ?? "");
  const [categoriaID, setCategoriaID] = useState(existente?.categoriaID ?? cats[0]?.id ?? "");
  const [contaID, setContaID] = useState(existente?.contaID ?? "");
  const [dataAlvo, setDataAlvo] = useState(existente?.dataAlvo?.slice(0, 10) ?? "");
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.valorAlvo ?? 0));
  const [reserva] = useState(() => EntradaValor.deCentavos(existente?.alocado ?? 0));
  const [campo, setCampo] = useState<"alvo" | "reserva">("alvo");
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const ehTeto = tipo === "teto_categoria";
  const ehLongo = tipo === "objetivo";
  const eco = ehEconomia({ tipo } as Meta);
  const saldoDa = (id: string) => {
    const conta = contas.find((c) => c.id === id);
    return conta ? saldoDaConta(conta, transacoes ?? []) : 0;
  };
  const livreMaisAtual = contaID
    ? cabimentoNaConta(metas, contaID, saldoDa(contaID), existente?.id)
    : 0;
  const erroMeta = validarMeta({
    tipo,
    nome,
    valorAlvo: entrada.centavos,
    categoriaID: ehTeto ? categoriaID : undefined,
    outras: metas ?? [],
    id: existente?.id,
  });
  const erroReserva =
    eco && contaID
      ? validarAlocacao({ alocado: reserva.centavos, livreMaisAtual })
      : null;
  const erro = erroMeta ?? erroReserva;
  const pode = !erro && !salvando;
  const voltar = () => router.push("/metas");
  const titulo = existente
    ? ehTeto
      ? "editar teto"
      : ehLongo
        ? "editar objetivo"
        : "editar economia"
    : ehTeto
      ? "novo teto"
      : ehLongo
        ? "novo objetivo"
        : "nova economia";

  function escolherTipo(proximo: TipoMeta) {
    if (proximo === tipo) return;
    setTipo(proximo);
    if (proximo === "teto_categoria") {
      setCampo("alvo");
      setContaID("");
    }
  }

  function escolherConta(idConta: string) {
    setContaID(idConta);
    if (!idConta) return;
    const cabimento = cabimentoNaConta(
      metas,
      idConta,
      saldoDa(idConta),
      existente?.id,
    );
    if (reserva.centavos === 0 && entrada.centavos > 0) {
      const quanto = Math.min(entrada.centavos, cabimento);
      while (reserva.centavos !== 0) reserva.apagar();
      for (const d of String(quanto)) reserva.digitar(Number(d));
      tick((n) => n + 1);
    }
  }

  function montar(ativa = existente?.ativa ?? true): Meta {
    const cat = cats.find((c) => c.id === categoriaID);
    const nomeTeto = nome.trim() || cat?.nome || "Teto";
    const nomeEco = nome.trim() || (ehLongo ? "Objetivo" : "Economia do mês");
    return {
      id: existente?.id ?? crypto.randomUUID(),
      carteiraID: carteira.id,
      tipo,
      nome: ehTeto ? nomeTeto : nomeEco,
      valorAlvo: entrada.centavos,
      categoriaID: ehTeto ? categoriaID : undefined,
      periodo: ehLongo ? "longo_prazo" : "mensal",
      dataAlvo: ehLongo && dataAlvo ? dataAlvo : undefined,
      ativa,
      contaID: eco && contaID ? contaID : undefined,
      alocado: eco && contaID ? reserva.centavos : 0,
    };
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarMeta(montar());
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar a meta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function concluir() {
    if (!existente) return;
    setSalvando(true);
    try {
      await salvarMeta(marcarMetaConcluida(montar()));
      voltar();
    } catch {
      avisar("erro", "Não deu para concluir a meta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!existente) return;
    setSalvando(true);
    try {
      await apagarMeta(existente.id);
      voltar();
    } catch {
      avisar("erro", "Não deu para apagar a meta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  function digitar(d: number) {
    (campo === "reserva" ? reserva : entrada).digitar(d);
    tick((n) => n + 1);
  }

  function apagarDigito() {
    (campo === "reserva" ? reserva : entrada).apagar();
    tick((n) => n + 1);
  }

  if (id && !existente) {
    return (
      <div>
        <Cabecalho titulo="editar meta" voltarPara="/metas" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Esta meta não existe mais.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho titulo={titulo} voltarPara="/metas" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="pt-2 text-[12px] text-cinza">
          em {carteira.nome}
          {ehLongo ? " · longo prazo" : " · este mês"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Tipo da meta">
          <Etiqueta ativa={ehTeto} aoClicar={() => escolherTipo("teto_categoria")}>
            Teto
          </Etiqueta>
          <Etiqueta ativa={tipo === "economia_mensal"} aoClicar={() => escolherTipo("economia_mensal")}>
            Economia
          </Etiqueta>
          <Etiqueta ativa={ehLongo} aoClicar={() => escolherTipo("objetivo")}>
            Longo prazo
          </Etiqueta>
        </div>

        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder={ehTeto ? "Mercado, restaurante…" : ehLongo ? "Viagem, reserva…" : "Economia do mês"}
        />

        <div
          className="mt-6"
          role="status"
          aria-live="polite"
          aria-label={campo === "reserva" ? "Valor reservado" : ehTeto ? "Valor do teto" : "Valor da economia"}
        >
          <Rotulo>{campo === "reserva" ? "reservar" : "alvo"}</Rotulo>
          <div className="mt-2">
            <Numero
              centavos={campo === "reserva" ? reserva.centavos : entrada.centavos}
              tamanho="secao"
            />
          </div>
        </div>

        {ehTeto && (
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
        )}

        {ehLongo && (
          <div className="mt-4">
            <Rotulo>data alvo</Rotulo>
            <input
              type="date"
              value={dataAlvo}
              onChange={(e) => setDataAlvo(e.target.value)}
              aria-label="Data alvo"
              className={classeSelect()}
            />
            <p className="mt-1 text-[12px] text-cinza">Opcional. Sem cofre e sem transferência.</p>
          </div>
        )}

        {eco && (
          <div className="mt-4">
            <Rotulo>reservar na conta</Rotulo>
            <select
              value={contaID}
              aria-label="Conta da reserva"
              onChange={(e) => escolherConta(e.target.value)}
              className={classeSelect()}
            >
              <option value="">Sem reservar agora</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} · {ROTULO_TIPO_CONTA[c.tipo]}
                </option>
              ))}
            </select>
            {contaID && (
              <>
                <p className="mt-2 text-[12px] text-cinza">
                  Livre nesta conta: {formatarBRL(Math.max(0, livreMaisAtual - reserva.centavos))}.
                  Reservar baixa o livre, sem lançamento.
                </p>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="O que o teclado edita">
                  <Etiqueta ativa={campo === "alvo"} aoClicar={() => setCampo("alvo")}>
                    Alvo
                  </Etiqueta>
                  <Etiqueta ativa={campo === "reserva"} aoClicar={() => setCampo("reserva")}>
                    Reservar
                  </Etiqueta>
                </div>
              </>
            )}
            {!contaID && tipo === "economia_mensal" && (
              <p className="mt-2 text-[12px] text-cinza">
                Sem conta, medimos receitas menos despesas deste mês. Com conta, o progresso é o
                reservado.
              </p>
            )}
          </div>
        )}

        {existente && eco && existente.ativa && (
          <div className="mt-6">
            <Botao variante="secundario" onClick={() => void concluir()} disabled={salvando}>
              Marcar concluída
            </Botao>
          </div>
        )}

        {existente && (
          <div className="mt-4">
            <Botao variante="destrutivo" onClick={() => void apagar()} disabled={salvando}>
              Apagar meta
            </Botao>
          </div>
        )}
      </div>
      <Teclado
        aoDigitar={digitar}
        aoApagar={apagarDigito}
        aoSalvar={salvar}
        aoFechar={voltar}
        podeSalvar={pode}
        mostraSalvar
      />
    </div>
  );
}
