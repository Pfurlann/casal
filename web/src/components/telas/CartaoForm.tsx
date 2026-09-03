"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Cartao, MoedaAcumulo, ProgramaPontos } from "@/lib/domain";
import { CORES_CARTAO, ROTULO_BANDEIRA } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import {
  escolhaDoPrograma,
  NOMES_PROGRAMA,
  parseMetricaX100,
  parseSaldoPontos,
  parseValorPontoCentavos,
  programaVisivel,
  textoMetricaX100,
  textoValorPonto,
} from "@/lib/pontos";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { useAviso } from "../ui/Aviso";

export function CartaoForm({ id }: { id?: string }) {
  const { cartoes, carteira, salvarCartao } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = cartoes.find((c) => c.id === id);
  const programaInicial = programaVisivel(existente?.programa);

  const [apelido, setApelido] = useState(existente?.apelido ?? "");
  const [banco, setBanco] = useState(existente?.banco ?? "");
  const [ultimos4, setUltimos4] = useState(existente?.ultimos4 ?? "");
  const [bandeira, setBandeira] = useState<Cartao["bandeira"]>(existente?.bandeira ?? "outra");
  const [cor, setCor] = useState(existente?.cor ?? CORES_CARTAO[0]);
  const [diaFechamento, setDiaFechamento] = useState(existente?.diaFechamento ?? 28);
  const [diaVencimento, setDiaVencimento] = useState(existente?.diaVencimento ?? 5);
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.limite ?? 0));
  const [escolhaPrograma, setEscolhaPrograma] = useState(escolhaDoPrograma(programaInicial?.nome));
  const [outroPrograma, setOutroPrograma] = useState(
    escolhaDoPrograma(programaInicial?.nome) === "outro" ? (programaInicial?.nome ?? "") : "",
  );
  const [saldoPontos, setSaldoPontos] = useState(
    programaInicial ? String(programaInicial.saldo) : "",
  );
  const [metrica, setMetrica] = useState(
    programaInicial ? textoMetricaX100(programaInicial.pontosPorUnidadeX100) : "1",
  );
  const [moedaAcumulo, setMoedaAcumulo] = useState<MoedaAcumulo>(programaInicial?.moeda ?? "usd");
  const [valorPonto, setValorPonto] = useState(textoValorPonto(programaInicial?.valorPontoCentavos));
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const pode =
    apelido.trim().length > 0 &&
    banco.trim().length > 0 &&
    /^\d{4}$/.test(ultimos4) &&
    entrada.centavos > 0 &&
    !salvando;

  const voltar = () => router.push(existente ? `/cartoes/${existente.id}` : "/cartoes");

  function montarPrograma(): ProgramaPontos | undefined {
    const nome = escolhaPrograma === "outro" ? outroPrograma.trim() : escolhaPrograma.trim();
    if (!nome) return undefined;
    return {
      nome,
      saldo: parseSaldoPontos(saldoPontos),
      pontosPorUnidadeX100: parseMetricaX100(metrica),
      moeda: moedaAcumulo,
      valorPontoCentavos: parseValorPontoCentavos(valorPonto),
    };
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarCartao({
        id: existente?.id ?? crypto.randomUUID(),
        carteiraID: carteira.id,
        apelido: apelido.trim(),
        banco: banco.trim(),
        ultimos4,
        bandeira,
        cor,
        limite: entrada.centavos,
        diaFechamento,
        diaVencimento,
        arquivado: false,
        programa: montarPrograma(),
      });
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o cartão. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo={existente ? "editar cartão" : "novo cartão"}
        voltarPara={existente ? `/cartoes/${existente.id}` : "/cartoes"}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Campo label="Apelido" value={apelido} onChange={setApelido} placeholder="Roxinho" />
        <Campo label="Banco" value={banco} onChange={setBanco} placeholder="Nubank" />
        <Campo
          label="Últimos 4 dígitos"
          value={ultimos4}
          inputMode="numeric"
          onChange={(v) => setUltimos4(v.replace(/\D/g, "").slice(0, 4))}
        />

        <div className="mt-4">
          <Rotulo>bandeira</Rotulo>
          <select
            value={bandeira}
            onChange={(e) => setBandeira(e.target.value as Cartao["bandeira"])}
            aria-label="Bandeira"
            className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
          >
            {(Object.keys(ROTULO_BANDEIRA) as Cartao["bandeira"][]).map((b) => (
              <option key={b} value={b}>
                {ROTULO_BANDEIRA[b]}
              </option>
            ))}
          </select>
        </div>

        <div
          className="mt-5 flex items-center justify-between"
          role="status"
          aria-live="polite"
          aria-label="Limite do cartão"
        >
          <Rotulo>limite total</Rotulo>
          <Numero centavos={entrada.centavos} tamanho="corpo" />
        </div>

        <div className="mt-5">
          <label htmlFor="fechamento" className="block text-[12px] text-cinza">
            Fecha no dia {diaFechamento}
          </label>
          <input
            id="fechamento"
            type="range"
            min={1}
            max={31}
            value={diaFechamento}
            onChange={(e) => setDiaFechamento(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <label htmlFor="vencimento" className="mt-3 block text-[12px] text-cinza">
            Vence no dia {diaVencimento}
          </label>
          <input
            id="vencimento"
            type="range"
            min={1}
            max={31}
            value={diaVencimento}
            onChange={(e) => setDiaVencimento(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="mt-2 text-[12px] text-cinza">
            {diaVencimento > diaFechamento
              ? "A fatura fecha e vence no mesmo mês."
              : "A fatura fecha num mês e vence no mês seguinte."}
          </p>
        </div>

        <div className="mt-6">
          <Rotulo>pontos</Rotulo>
          <label htmlFor="programa-pontos" className="mt-2 block text-[12px] text-cinza">
            Programa
          </label>
          <select
            id="programa-pontos"
            value={escolhaPrograma}
            onChange={(e) => setEscolhaPrograma(e.target.value)}
            aria-label="Programa de pontos"
            className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
          >
            <option value="">Sem programa</option>
            {NOMES_PROGRAMA.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
            <option value="outro">Outro</option>
          </select>
          {escolhaPrograma === "outro" && (
            <Campo
              label="Nome do programa"
              value={outroPrograma}
              onChange={setOutroPrograma}
              placeholder="C6 Carbon, Esfera…"
            />
          )}
          {escolhaPrograma !== "" && (
            <>
              <Campo
                label="Saldo atual de pontos"
                value={saldoPontos}
                onChange={(v) => setSaldoPontos(v.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="O total de hoje no app do banco"
              />
              <p className="mt-1 text-[12px] text-cinza">
                Você informa o saldo. O app não busca no banco.
              </p>
              <div className="mt-3">
                <label htmlFor="moeda-acumulo" className="block text-[12px] text-cinza">
                  Acumula a cada
                </label>
                <select
                  id="moeda-acumulo"
                  value={moedaAcumulo}
                  onChange={(e) => setMoedaAcumulo(e.target.value as MoedaAcumulo)}
                  aria-label="Moeda da regra de pontos"
                  className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
                >
                  <option value="usd">US$ 1 (fatura em dólar)</option>
                  <option value="brl">R$ 1 (gasto em real)</option>
                </select>
              </div>
              <Campo
                label={moedaAcumulo === "usd" ? "Pontos por US$ 1" : "Pontos por R$ 1"}
                value={metrica}
                onChange={setMetrica}
                inputMode="numeric"
                placeholder="2,2"
              />
              <Campo
                label="Valor do ponto (R$, opcional)"
                value={valorPonto}
                onChange={setValorPonto}
                inputMode="numeric"
                placeholder="0,03"
              />
            </>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          {CORES_CARTAO.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Cor ${hex}`}
              aria-pressed={cor === hex}
              onClick={() => setCor(hex)}
              className="h-7 w-7 rounded-amostra border border-nevoa"
              style={{ background: hex }}
            />
          ))}
        </div>
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
