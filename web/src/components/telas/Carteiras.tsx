"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ROTULO_CARTEIRA } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";

export function formatarCodigoConvite(codigo: string): string {
  const x = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (x.length !== 6) return x;
  return `${x.slice(0, 3)}-${x.slice(3)}`;
}

export function Carteiras() {
  const {
    carteira,
    carteiras,
    membros,
    convite,
    remoto,
    criarConvite,
    aceitarConvite,
    selecionarCarteira,
  } = useLoja();
  const { usuario } = useAuth();
  const { avisar } = useAviso();

  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const souDono = membros.some((m) => m.userId === usuario?.id && m.papel === "dono");
  const aceitaConvite =
    carteira.visibilidade !== "fechada" && carteira.rotulo !== "pessoal";
  const limpo = codigo.replace(/[^A-Za-z0-9]/g, "");

  async function gerar() {
    setEnviando(true);
    const falha = await criarConvite();
    setEnviando(false);
    if (falha) avisar("erro", falha);
  }

  async function entrar() {
    setEnviando(true);
    const falha = await aceitarConvite(codigo);
    setEnviando(false);
    if (falha) avisar("erro", falha);
    else {
      avisar("ok", "Você entrou na carteira conjunta.");
      setCodigo("");
    }
  }

  async function copiar() {
    if (!convite) return;
    try {
      await navigator.clipboard.writeText(formatarCodigoConvite(convite.codigo));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      avisar("erro", "Não deu para copiar. Anote o código.");
    }
  }

  return (
    <div>
      <Cabecalho
        titulo="carteiras"
        voltarPara="/mais"
        acao={
          <Link
            href="/mais/carteiras/nova"
            aria-label="Nova carteira"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <div>
          {carteiras.map((c) => (
            <LinhaLista
              key={c.id}
              titulo={c.id === carteira.id ? `${c.nome} · atual` : c.nome}
              subtitulo={`${ROTULO_CARTEIRA[c.rotulo]}${
                c.membrosN > 1 ? ` · ${c.membrosN} pessoas` : " · só você"
              }`}
              aoClicar={() => void selecionarCarteira(c.id)}
            />
          ))}
        </div>

        <div className="mt-8">
          <Rotulo>quem está em {carteira.nome}</Rotulo>
          <div className="mt-2">
            {membros.length === 0 ? (
              <p className="text-[14px] text-cinza">Ninguém listado ainda.</p>
            ) : (
              membros.map((m) => {
                const voce = m.userId === usuario?.id;
                return (
                  <LinhaLista
                    key={m.userId}
                    titulo={voce ? "Você" : m.email || "Parceiro"}
                    subtitulo={
                      voce
                        ? `${m.papel === "dono" ? "Dono" : "Parceiro"} · ${m.email}`
                        : m.papel === "dono"
                          ? "Dono"
                          : "Parceiro"
                    }
                  />
                );
              })
            )}
          </div>
        </div>

        {souDono && aceitaConvite && (
          <div className="mt-8">
            <Rotulo>convidar parceiro</Rotulo>
            <p className="mt-2 text-[12px] text-cinza">
              Gere um código e mande no WhatsApp. A outra pessoa entra com a conta
              dela e cola o código aqui.
            </p>
            {convite ? (
              <div className="mt-4">
                <p className="font-numero text-[24px] tabular-nums tracking-[0.18em] text-grafite">
                  {formatarCodigoConvite(convite.codigo)}
                </p>
                <p className="mt-1 font-numero text-[12px] tabular-nums text-cinza">
                  válido até {new Date(convite.expiraEm).toLocaleDateString("pt-BR")}
                </p>
                <div className="mt-3">
                  <Botao variante="secundario" onClick={copiar}>
                    {copiado ? "Copiado" : "Copiar código"}
                  </Botao>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Botao variante="primario" onClick={gerar} disabled={!remoto || enviando}>
                  {enviando ? "Gerando…" : "Gerar convite"}
                </Botao>
              </div>
            )}
          </div>
        )}

        {souDono && !aceitaConvite && (
          <p className="mt-8 text-[14px] text-cinza">
            Carteira pessoal não aceita convite. Crie uma conjunta para compartilhar.
          </p>
        )}

        <div className="mt-8">
          <Rotulo>tenho um código</Rotulo>
          <p className="mt-2 text-[12px] text-cinza">
            Entra na carteira conjunta da outra pessoa, sem sair da sua pessoal.
          </p>
          <Campo
            label="Código do convite"
            value={codigo}
            onChange={(v) => setCodigo(v.toUpperCase())}
            placeholder="ABC-DEF"
          />
          <div className="mt-3">
            <Botao
              variante="primario"
              onClick={entrar}
              disabled={!remoto || enviando || limpo.length < 6}
            >
              Entrar na carteira
            </Botao>
          </div>
        </div>

        {!remoto && (
          <p className="mt-6 text-[12px] text-cinza">
            Convites só funcionam com login na nuvem.
          </p>
        )}
      </div>
    </div>
  );
}
