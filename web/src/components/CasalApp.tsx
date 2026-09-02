"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  CORES_CARTAO,
  ROTULO_CARTEIRA,
  ROTULO_TIPO_CONTA,
  type Conta,
  type RotuloCarteira,
  type TipoConta,
} from "@/lib/domain";
import { EntradaValor, formatarBRL } from "@/lib/money";
import { useLoja } from "@/lib/store";
import {
  IconeBanco,
  IconeChevron,
  IconeMeta,
  IconePessoas,
  IconeVoltar,
} from "./Icones";
import { Teclado } from "./ui/Teclado";

export type Aba = "inicio" | "cartoes" | "metas" | "mais";
type Tela =
  | { nome: "app" }
  | { nome: "contas" }
  | { nome: "conta-form"; id?: string; depois?: Tela }
  | { nome: "carteiras" }
  | { nome: "carteira-form" };

export function CasalApp({ aba }: { aba: Aba }) {
  const loja = useLoja();
  const [tela, setTela] = useState<Tela>({ nome: "app" });

  if (!loja.pronto) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/40">Carregando…</div>
    );
  }

  const fechar = () => setTela({ nome: "app" });

  return (
    <>
      {tela.nome === "contas" && (
        <Contas
          onClose={fechar}
          onNova={() => setTela({ nome: "conta-form", depois: { nome: "contas" } })}
          onEditar={(id) => setTela({ nome: "conta-form", id, depois: { nome: "contas" } })}
        />
      )}
      {tela.nome === "conta-form" && (
        <ContaForm id={tela.id} onClose={() => setTela(tela.depois ?? { nome: "contas" })} />
      )}
      {tela.nome === "carteiras" && (
        <Carteiras
          onClose={fechar}
          onNova={() => setTela({ nome: "carteira-form" })}
        />
      )}
      {tela.nome === "carteira-form" && (
        <CarteiraForm onClose={() => setTela({ nome: "carteiras" })} />
      )}
      {tela.nome === "app" && (
        <>
          {aba === "metas" && (
            <Placeholder titulo="Metas" detalhe="Em breve você vai poder definir tetos de gasto e acompanhar objetivos por aqui." />
          )}
          {aba === "mais" && (
            <Mais
              onContas={() => setTela({ nome: "contas" })}
              onCarteiras={() => setTela({ nome: "carteiras" })}
            />
          )}
        </>
      )}
    </>
  );
}

function Cabecalho({ titulo, esquerda, direita }: { titulo: string; esquerda?: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[44px] items-center justify-between px-2 pb-1 pt-[max(8px,env(safe-area-inset-top))]">
      <div className="z-10 flex min-w-[88px] shrink-0 items-center">{esquerda}</div>
      <div className="pointer-events-none absolute inset-x-[88px] top-[max(8px,env(safe-area-inset-top))] truncate text-center text-[17px] font-semibold">
        {titulo}
      </div>
      <div className="z-10 flex min-w-[88px] shrink-0 items-center justify-end pr-2 text-[17px]" style={{ color: "#7C5CFF" }}>{direita}</div>
    </div>
  );
}

function BotaoVoltar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center gap-0.5 pl-1 text-[17px]"
      style={{ color: "#7C5CFF" }}
      aria-label="Voltar"
    >
      <IconeVoltar size={20} />
      Voltar
    </button>
  );
}

function Mais({ onContas, onCarteiras }: { onContas: () => void; onCarteiras: () => void }) {
  const { contas, carteira, remoto } = useLoja();
  const { usuario, sair } = useAuth();
  return (
    <div className="px-4">
      <h1 className="pt-[max(12px,env(safe-area-inset-top))] text-[34px] font-bold">Mais</h1>
      {usuario?.email && (
        <div className="mt-4 rounded-2xl bg-[#f2f2f7] px-4 py-4">
          <div className="text-[13px] text-black/40">Conta</div>
          <div className="mt-0.5 font-semibold">{usuario.email}</div>
          <button type="button" onClick={() => void sair()} className="mt-3 text-[15px] font-semibold" style={{ color: "#7C5CFF" }}>
            Sair
          </button>
        </div>
      )}
      <button type="button" onClick={onCarteiras} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-[#f2f2f7] px-4 py-4 text-left">
        <div>
          <div className="font-semibold">Carteiras</div>
          <div className="text-[13px] text-black/45">
            Pessoal e conjunta · {carteira.nome}
          </div>
        </div>
        <span className="text-black/25"><IconeChevron /></span>
      </button>
      <button type="button" onClick={onContas} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-[#f2f2f7] px-4 py-4 text-left">
        <div>
          <div className="font-semibold">Contas</div>
          <div className="text-[13px] text-black/45">
            Portadores: corrente, poupança e dinheiro
            {contas.length ? ` · ${contas.length}` : ""}
          </div>
        </div>
        <span className="text-black/25"><IconeChevron /></span>
      </button>
      <p className="mt-6 text-[11px] text-black/35">
        {remoto ? "Dados neste dispositivo e no Supabase (projeto casal)." : "Dados só neste aparelho — configure o Supabase para sincronizar."}
      </p>
    </div>
  );
}

function formatarCodigoConvite(codigo: string) {
  const x = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (x.length !== 6) return x;
  return `${x.slice(0, 3)}-${x.slice(3)}`;
}

function Carteiras({ onClose, onNova }: { onClose: () => void; onNova: () => void }) {
  const { carteira, carteiras, membros, convite, remoto, criarConvite, aceitarConvite, selecionarCarteira } = useLoja();
  const { usuario } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const souDono = membros.some((m) => m.userId === usuario?.id && m.papel === "dono");
  const aceitaConvite = carteira.visibilidade !== "fechada" && carteira.rotulo !== "pessoal";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Cabecalho
        titulo="Carteiras"
        esquerda={<BotaoVoltar onClick={onClose} />}
        direita={<button type="button" onClick={onNova} className="text-[22px]" aria-label="Nova carteira">+</button>}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <ul>
          {carteiras.map((c) => {
            const ativa = c.id === carteira.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => void selecionarCarteira(c.id)}
                  className="flex w-full items-center gap-3 border-b border-black/5 py-3.5 text-left"
                >
                  <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: c.cor }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{c.nome}</div>
                    <div className="text-[12px] text-black/40">
                      {ROTULO_CARTEIRA[c.rotulo]}
                      {c.membrosN > 1 ? ` · ${c.membrosN} pessoas` : " · só você"}
                    </div>
                  </div>
                  {ativa && <span className="text-[13px] font-semibold" style={{ color: "#7C5CFF" }}>Atual</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={onNova} className="mt-3 w-full rounded-xl bg-[#f2f2f7] py-3 text-[15px] font-semibold" style={{ color: "#7C5CFF" }}>
          Nova carteira
        </button>

        <div className="mt-6 text-[11px] font-bold tracking-wide text-black/40">QUEM ESTÁ EM {carteira.nome.toUpperCase()}</div>
        <ul className="mt-2">
          {membros.map((m) => {
            const voce = m.userId === usuario?.id;
            return (
              <li key={m.userId} className="flex items-center gap-3 border-b border-black/5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7C5CFF]/15 text-[#7C5CFF]">
                  <IconePessoas size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{voce ? "Você" : m.email || "Parceiro"}</div>
                  <div className="text-[12px] text-black/40">
                    {m.papel === "dono" ? "Dono" : "Parceiro"}
                    {voce && m.email ? ` · ${m.email}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
          {membros.length === 0 && (
            <li className="py-3 text-[13px] text-black/45">Ninguém listado ainda.</li>
          )}
        </ul>

        {souDono && aceitaConvite && (
          <div className="mt-6">
            <div className="text-[11px] font-bold tracking-wide text-black/40">CONVIDAR PARCEIRO</div>
            <p className="mt-1 text-[13px] text-black/45">
              Gere um código e mande no WhatsApp. A outra pessoa entra com a conta dela e cola o código aqui.
            </p>
            {convite ? (
              <div className="mt-3 rounded-2xl bg-[#f2f2f7] px-4 py-4 text-center">
                <div className="text-[28px] font-bold tracking-[0.18em] tabular-nums">{formatarCodigoConvite(convite.codigo)}</div>
                <div className="mt-1 text-[12px] text-black/40">
                  Válido até {new Date(convite.expiraEm).toLocaleDateString("pt-BR")}
                </div>
                <button
                  type="button"
                  className="mt-3 text-[15px] font-semibold"
                  style={{ color: "#7C5CFF" }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(formatarCodigoConvite(convite.codigo));
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2000);
                    } catch {
                      setErro("Não deu para copiar. Anote o código.");
                    }
                  }}
                >
                  {copiado ? "Copiado" : "Copiar código"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!remoto || enviando}
                className="mt-3 w-full rounded-xl py-3 font-semibold text-white disabled:bg-black/20"
                style={{ background: remoto ? "#7C5CFF" : undefined }}
                onClick={async () => {
                  setEnviando(true);
                  setErro(null);
                  const falha = await criarConvite();
                  setEnviando(false);
                  if (falha) setErro(falha);
                }}
              >
                {enviando ? "Gerando…" : "Gerar convite"}
              </button>
            )}
          </div>
        )}

        {souDono && !aceitaConvite && (
          <p className="mt-6 text-[13px] text-black/45">Carteira pessoal não aceita convite. Crie uma conjunta para compartilhar.</p>
        )}

        <div className="mt-6">
          <div className="text-[11px] font-bold tracking-wide text-black/40">TENHO UM CÓDIGO</div>
          <p className="mt-1 text-[13px] text-black/45">
            Entra na carteira conjunta da outra pessoa, sem sair da sua pessoal.
          </p>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="ABC-DEF"
            autoCapitalize="characters"
            className="mt-3 w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-center text-[20px] font-semibold tracking-[0.2em] outline-none"
          />
          <button
            type="button"
            disabled={!remoto || enviando || codigo.replace(/[^A-Za-z0-9]/g, "").length < 6}
            className="mt-3 w-full rounded-xl py-3 font-semibold text-white disabled:bg-black/20"
            style={{
              background:
                remoto && codigo.replace(/[^A-Za-z0-9]/g, "").length >= 6 ? "#7C5CFF" : undefined,
            }}
            onClick={async () => {
              setEnviando(true);
              setErro(null);
              setOk(null);
              const falha = await aceitarConvite(codigo);
              setEnviando(false);
              if (falha) setErro(falha);
              else {
                setOk("Você entrou na carteira conjunta.");
                setCodigo("");
              }
            }}
          >
            Entrar na carteira
          </button>
        </div>

        {!remoto && (
          <p className="mt-4 text-[13px] text-black/45">Convites só funcionam com login na nuvem.</p>
        )}
        {erro && <p className="mt-3 text-[13px] text-red-500">{erro}</p>}
        {ok && <p className="mt-3 text-[13px] text-[#34C759]">{ok}</p>}
      </div>
    </div>
  );
}

function CarteiraForm({ onClose }: { onClose: () => void }) {
  const { criarCarteira } = useLoja();
  const [nome, setNome] = useState("");
  const [rotulo, setRotulo] = useState<RotuloCarteira>("pessoal");
  const [cor, setCor] = useState(CORES_CARTAO[0]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const pode = nome.trim().length > 0 && !enviando;

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo="Nova carteira"
        esquerda={<BotaoVoltar onClick={onClose} />}
        direita={
          <button
            type="button"
            disabled={!pode}
            className={pode ? "font-semibold" : "text-black/25"}
            onClick={async () => {
              setEnviando(true);
              setErro(null);
              const falha = await criarCarteira({ nome: nome.trim(), rotulo, cor });
              setEnviando(false);
              if (falha) setErro(falha);
              else onClose();
            }}
          >
            Criar
          </button>
        }
      />
      <div className="px-4">
        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder={rotulo === "pessoal" ? "Meu, Pessoal…" : "Nosso, Casal…"}
        />
        <label className="mt-3 block text-[13px] text-black/40">Tipo</label>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {(["pessoal", "compartilhada"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRotulo(t)}
              className="rounded-xl py-2 text-[13px] font-semibold"
              style={{
                background: rotulo === t ? "#7C5CFF" : "#f2f2f7",
                color: rotulo === t ? "white" : "#111",
              }}
            >
              {ROTULO_CARTEIRA[t]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-black/45">
          {rotulo === "pessoal"
            ? "Só você vê. Não aceita convite."
            : "Você convida o parceiro com um código."}
        </p>
        <div className="mt-4 flex gap-2">
          {CORES_CARTAO.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setCor(hex)}
              className="h-7 w-7 rounded-full"
              style={{ background: hex, outline: cor === hex ? "2px solid #111" : undefined, outlineOffset: 2 }}
            />
          ))}
        </div>
        {erro && <p className="mt-3 text-[13px] text-red-500">{erro}</p>}
      </div>
    </div>
  );
}


function Contas({
  onClose,
  onNova,
  onEditar,
}: {
  onClose: () => void;
  onNova: () => void;
  onEditar: (id: string) => void;
}) {
  const { contas } = useLoja();
  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo="Contas"
        esquerda={<BotaoVoltar onClick={onClose} />}
        direita={<button type="button" onClick={onNova} className="text-[22px]" aria-label="Adicionar conta">+</button>}
      />
      <div className="px-4">
        <p className="text-[13px] text-black/45">O que você tem no banco — usados ao pagar fatura (Sai de).</p>
        {contas.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="text-[#7C5CFF]"><IconeBanco /></div>
            <div className="mt-2 font-semibold">Nenhuma conta</div>
            <button type="button" onClick={onNova} className="mt-4 rounded-full px-4 py-2 font-semibold text-white" style={{ background: "#7C5CFF" }}>
              Adicionar conta
            </button>
          </div>
        ) : (
          <ul className="mt-3">
            {contas.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onEditar(c.id)} className="flex w-full items-center justify-between border-b border-black/5 py-3.5 text-left">
                  <div>
                    <div className="font-semibold">{c.nome}</div>
                    <div className="text-[12px] text-black/40">{ROTULO_TIPO_CONTA[c.tipo]}</div>
                  </div>
                  <div className="text-[15px] font-semibold tabular-nums">{formatarBRL(c.saldoInicial)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ContaForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { contas, carteira, salvarConta } = useLoja();
  const existente = contas.find((c) => c.id === id);
  const [nome, setNome] = useState(existente?.nome ?? "");
  const [tipo, setTipo] = useState<TipoConta>(existente?.tipo ?? "corrente");
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.saldoInicial ?? 0));
  const [, tick] = useState(0);
  const pode = nome.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo="Conta"
        esquerda={<BotaoVoltar onClick={onClose} />}
        direita={
          <button
            type="button"
            disabled={!pode}
            className={pode ? "font-semibold" : "text-black/25"}
            onClick={async () => {
              const conta: Conta = {
                id: existente?.id ?? crypto.randomUUID(),
                carteiraID: carteira.id,
                nome: nome.trim(),
                tipo,
                saldoInicial: entrada.centavos,
                arquivada: false,
              };
              await salvarConta(conta);
              onClose();
            }}
          >
            Salvar
          </button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <Campo label="Nome" value={nome} onChange={setNome} placeholder="Nubank, Itaú, Carteira…" />
        <label className="mt-3 block text-[13px] text-black/40">Tipo</label>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {(["corrente", "poupanca", "dinheiro"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className="rounded-xl py-2 text-[13px] font-semibold"
              style={{
                background: tipo === t ? "#7C5CFF" : "#f2f2f7",
                color: tipo === t ? "white" : "#111",
              }}
            >
              {ROTULO_TIPO_CONTA[t]}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[13px] text-black/40">Saldo inicial</span>
          <span className="text-[17px] font-semibold tabular-nums">{formatarBRL(entrada.centavos)}</span>
        </div>
        {existente && (
          <button
            type="button"
            className="mt-6 text-[15px] text-red-500"
            onClick={async () => {
              await salvarConta({ ...existente, nome: nome.trim() || existente.nome, tipo, saldoInicial: entrada.centavos, arquivada: true });
              onClose();
            }}
          >
            Arquivar conta
          </button>
        )}
      </div>
      <Teclado aoDigitar={(d) => { entrada.digitar(d); tick((n) => n + 1); }} aoApagar={() => { entrada.apagar(); tick((n) => n + 1); }} />
    </div>
  );
}

function Campo({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="mt-3 block">
      <span className="text-[13px] text-black/40">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-[16px] outline-none"
      />
    </label>
  );
}

function Placeholder({ titulo, detalhe }: { titulo: string; detalhe: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
      <div className="text-[#7C5CFF]"><IconeMeta /></div>
      <h1 className="mt-3 text-[22px] font-bold">{titulo}</h1>
      <p className="mt-2 text-[14px] text-black/45">{detalhe}</p>
    </div>
  );
}
