"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  CATEGORIAS,
  CORES_CARTAO,
  ROTULO_CARTEIRA,
  ROTULO_TIPO_CONTA,
  competenciaDaCompra,
  competenciaDe,
  horizonte,
  rotuloCurto,
  type Cartao,
  type Conta,
  type Fatura,
  type RotuloCarteira,
  type TipoConta,
} from "@/lib/domain";
import { EntradaValor, formatarBRL } from "@/lib/money";
import {
  faturaAtualOuRascunho,
  faturaDaCompetencia,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { CartaoFace } from "./CartaoFace";
import {
  IconeBanco,
  IconeCartao,
  IconeCategoria,
  IconeChevron,
  IconeMeta,
  IconePessoas,
  IconeVoltar,
} from "./Icones";
import { Teclado } from "./Teclado";

export type Aba = "inicio" | "cartoes" | "metas" | "mais";
type Tela =
  | { nome: "app" }
  | { nome: "lancamento" }
  | { nome: "cartao-form"; id?: string; depois?: Tela }
  | { nome: "cartao-detalhe"; id: string }
  | { nome: "pagar"; cartaoId: string; fatura: Fatura; depois?: Tela }
  | { nome: "contas" }
  | { nome: "conta-form"; id?: string; depois?: Tela }
  | { nome: "carteiras" }
  | { nome: "carteira-form" };

export function CasalApp({
  aba,
  iniciar,
}: {
  aba: Aba;
  iniciar?: "lancamento";
}) {
  const loja = useLoja();
  const [tela, setTela] = useState<Tela>(
    iniciar === "lancamento" ? { nome: "lancamento" } : { nome: "app" },
  );

  if (!loja.pronto) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/40">Carregando…</div>
    );
  }

  const fechar = () => setTela({ nome: "app" });

  return (
    <>
      {tela.nome === "lancamento" && <Lancamento onClose={fechar} />}
      {tela.nome === "cartao-form" && (
        <CartaoForm id={tela.id} onClose={() => setTela(tela.depois ?? { nome: "app" })} />
      )}
      {tela.nome === "cartao-detalhe" && (
        <CartaoDetalhe
          id={tela.id}
          onClose={fechar}
          onEditar={(id) => setTela({ nome: "cartao-form", id, depois: { nome: "cartao-detalhe", id } })}
          onPagar={(cartaoId, fatura) =>
            setTela({ nome: "pagar", cartaoId, fatura, depois: { nome: "cartao-detalhe", id: cartaoId } })
          }
        />
      )}
      {tela.nome === "pagar" && (
        <PagarFatura
          cartaoId={tela.cartaoId}
          fatura={tela.fatura}
          onClose={() => setTela(tela.depois ?? { nome: "cartao-detalhe", id: tela.cartaoId })}
          onCadastrarConta={() =>
            setTela({
              nome: "conta-form",
              depois: {
                nome: "pagar",
                cartaoId: tela.cartaoId,
                fatura: tela.fatura,
                depois: tela.depois,
              },
            })
          }
        />
      )}
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
          {aba === "cartoes" && (
            <Cartoes
              onNovo={() => setTela({ nome: "cartao-form" })}
              onAbrir={(id) => setTela({ nome: "cartao-detalhe", id })}
            />
          )}
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

function Cartoes({ onNovo, onAbrir }: { onNovo: () => void; onAbrir: (id: string) => void }) {
  const { cartoes, transacoes, faturas } = useLoja();
  const agora = new Date();
  const c0 = competenciaDe(agora);
  const totais = cartoes.map((cartao) => {
    const atual = faturaAtualOuRascunho(cartao, faturas, agora);
    const prox = faturaDaCompetencia(cartao, faturas, { ano: c0.ano, mes: c0.mes === 12 ? 1 : c0.mes + 1 });
    const curva = horizonte(6, c0, transacoes, cartao);
    return {
      cartao,
      atual: totalDaFatura(atual, transacoes, cartao),
      aPagar: saldoDevedor(atual, totalDaFatura(atual, transacoes, cartao)),
      proxima: totalDaFatura(prox, transacoes, cartao),
      fecha: atual.fechaEm,
      vence: atual.venceEm,
      curva,
    };
  });
  const totalMes = totais.reduce((s, t) => s + t.aPagar, 0);
  const curva = [0, 1, 2, 3, 4, 5].map((i) => {
    const competencia = { ano: c0.ano, mes: c0.mes };
    const c = i === 0 ? competencia : { ano: c0.ano + Math.floor((c0.mes - 1 + i) / 12), mes: ((c0.mes - 1 + i) % 12) + 1 };
    return {
      competencia: c,
      total: totais.reduce((s, t) => s + (t.curva[i]?.total ?? 0), 0),
    };
  });
  const max = Math.max(...curva.map((x) => x.total), 1);

  return (
    <div className="px-4">
      <div className="flex items-end justify-between pt-[max(12px,env(safe-area-inset-top))]">
        <h1 className="text-[34px] font-bold">Cartões</h1>
        <button type="button" onClick={onNovo} className="text-[22px]" style={{ color: "#7C5CFF" }} aria-label="Adicionar cartão">
          +
        </button>
      </div>
      {cartoes.length === 0 ? (
        <div className="mt-20 flex flex-col items-center text-center">
          <div className="text-[#7C5CFF]"><IconeCartao /></div>
          <div className="mt-2 font-semibold">Nenhum cartão</div>
          <p className="mt-1 max-w-[240px] text-[13px] text-black/45">Cadastre um cartão para acompanhar faturas e parcelas.</p>
          <button type="button" onClick={onNovo} className="mt-4 rounded-full px-4 py-2 text-[15px] font-semibold text-white" style={{ background: "#7C5CFF" }}>
            Adicionar cartão
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg,#7C5CFF,#5b3fd6)" }}>
            <div className="text-[12px] font-semibold opacity-85">Total a pagar neste mês</div>
            <div className="mt-1 text-[30px] font-bold tabular-nums">{formatarBRL(totalMes)}</div>
            <div className="text-[12px] opacity-80">{cartoes.length} {cartoes.length === 1 ? "cartão" : "cartões"}</div>
          </div>
          <ul className="mt-2">
            {totais.map((t) => (
              <li key={t.cartao.id}>
                <button type="button" onClick={() => onAbrir(t.cartao.id)} className="flex w-full items-center gap-2.5 py-2.5 text-left">
                  <div className="w-[52px] shrink-0">
                    <CartaoFace cartao={t.cartao} tamanho="miniatura" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{t.cartao.banco} · {t.cartao.apelido}</div>
                    <div className="text-[11px] text-black/40">Fecha {t.fecha.slice(8)} · vence {t.vence.slice(8)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold tabular-nums">{formatarBRL(t.atual)}</div>
                    <div className="text-[11px] text-black/40">próx. {formatarBRL(t.proxima)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <div className="text-[9px] font-bold tracking-wide text-black/40">PRÓXIMAS FATURAS · TODOS OS CARTÕES</div>
            <div className="mt-2 flex h-[76px] items-end gap-1.5">
              {curva.map((p) => (
                <div key={`${p.competencia.ano}-${p.competencia.mes}`} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded"
                    style={{
                      height: Math.max((p.total / max) * 58, 2),
                      background: "linear-gradient(#7C5CFF,#5b3fd6)",
                    }}
                  />
                  <span className="text-[9px] text-black/40">{rotuloCurto(p.competencia)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CartaoForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { cartoes, carteira, salvarCartao } = useLoja();
  const existente = cartoes.find((c) => c.id === id);
  const [apelido, setApelido] = useState(existente?.apelido ?? "");
  const [banco, setBanco] = useState(existente?.banco ?? "");
  const [ultimos4, setUltimos4] = useState(existente?.ultimos4 ?? "");
  const [bandeira, setBandeira] = useState(existente?.bandeira ?? "outra");
  const [cor, setCor] = useState(existente?.cor ?? "#7C5CFF");
  const [diaFechamento, setDiaFechamento] = useState(existente?.diaFechamento ?? 28);
  const [diaVencimento, setDiaVencimento] = useState(existente?.diaVencimento ?? 5);
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.limite ?? 0));
  const [, tick] = useState(0);
  const previa: Cartao = {
    id: existente?.id ?? "previa",
    carteiraID: carteira.id,
    apelido: apelido || "Apelido",
    banco: banco || "Banco",
    ultimos4: ultimos4.padEnd(4, "0").slice(0, 4),
    bandeira,
    cor,
    limite: entrada.centavos,
    diaFechamento,
    diaVencimento,
    arquivado: false,
  };
  const pode = apelido.trim() && banco.trim() && /^\d{4}$/.test(ultimos4) && entrada.centavos > 0;

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo="Cartão"
        esquerda={<BotaoVoltar onClick={onClose} />}
        direita={
          <button
            type="button"
            disabled={!pode}
            className={pode ? "font-semibold" : "text-black/25"}
            onClick={async () => {
              await salvarCartao({
                ...previa,
                id: existente?.id ?? crypto.randomUUID(),
                apelido: apelido.trim(),
                banco: banco.trim(),
                ultimos4,
              });
              onClose();
            }}
          >
            Salvar
          </button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <CartaoFace cartao={previa} tamanho="media" />
        <Campo label="Apelido" value={apelido} onChange={setApelido} />
        <Campo label="Banco" value={banco} onChange={setBanco} />
        <Campo label="Últimos 4 dígitos" value={ultimos4} onChange={(v) => setUltimos4(v.replace(/\D/g, "").slice(0, 4))} />
        <label className="mt-4 block text-[13px] text-black/40">Bandeira</label>
        <select value={bandeira} onChange={(e) => setBandeira(e.target.value as Cartao["bandeira"])} className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-[16px]">
          <option value="visa">Visa</option>
          <option value="mastercard">Mastercard</option>
          <option value="elo">Elo</option>
          <option value="amex">Amex</option>
          <option value="hipercard">Hipercard</option>
          <option value="outra">Outra</option>
        </select>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] text-black/40">Limite total</span>
          <span className="text-[17px] font-semibold tabular-nums">{formatarBRL(entrada.centavos)}</span>
        </div>
        <div className="mt-4 text-[13px] text-black/40">Fecha no dia {diaFechamento}</div>
        <input type="range" min={1} max={31} value={diaFechamento} onChange={(e) => setDiaFechamento(Number(e.target.value))} className="w-full" />
        <div className="mt-2 text-[13px] text-black/40">Vence no dia {diaVencimento}</div>
        <input type="range" min={1} max={31} value={diaVencimento} onChange={(e) => setDiaVencimento(Number(e.target.value))} className="w-full" />
        <p className="mt-1 text-[12px] text-black/40">
          {diaVencimento > diaFechamento ? "A fatura fecha e vence no mesmo mês." : "A fatura fecha num mês e vence no mês seguinte."}
        </p>
        <div className="mt-4 flex gap-2">
          {["#7C5CFF", "#8A2BE2", "#FF9F0A", "#FF453A", "#34C759", "#0A84FF", "#2C2C2E"].map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setCor(hex)}
              className="h-7 w-7 rounded-full"
              style={{ background: hex, outline: cor === hex ? "2px solid #111" : undefined, outlineOffset: 2 }}
            />
          ))}
        </div>
      </div>
      <Teclado
        aoDigitar={(d) => { entrada.digitar(d); tick((n) => n + 1); }}
        aoApagar={() => { entrada.apagar(); tick((n) => n + 1); }}
      />
    </div>
  );
}

function CartaoDetalhe({
  id,
  onClose,
  onEditar,
  onPagar,
}: {
  id: string;
  onClose: () => void;
  onEditar: (id: string) => void;
  onPagar: (cartaoId: string, fatura: Fatura) => void;
}) {
  const { cartoes, transacoes, faturas } = useLoja();
  const [aba, setAba] = useState<"atual" | "proxima" | "futuras">("atual");
  const cartao = cartoes.find((c) => c.id === id);
  if (!cartao) return null;
  const agora = new Date();
  const c0 = competenciaDe(agora);
  const atual = faturaAtualOuRascunho(cartao, faturas, agora);
  const prox = faturaDaCompetencia(cartao, faturas, { ano: c0.ano + (c0.mes === 12 ? 1 : 0), mes: c0.mes === 12 ? 1 : c0.mes + 1 });
  const fatura = aba === "proxima" ? prox : atual;
  const total = totalDaFatura(fatura, transacoes, cartao);
  const lancamentos = transacoes.filter((t) => t.tipo === "despesa" && t.cartaoID === cartao.id).filter((t) => {
    const x = competenciaDaCompra(new Date(t.data), cartao);
    return x.ano === fatura.ano && x.mes === fatura.mes;
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-8">
      <Cabecalho
        titulo={cartao.apelido}
        esquerda={<BotaoVoltar onClick={onClose} />}
        direita={<button type="button" onClick={() => onEditar(cartao.id)}>Editar</button>}
      />
      <div className="px-4">
        <CartaoFace cartao={cartao} tamanho="grande" faturaAtual={total} />
        <div className="mt-4 flex rounded-xl bg-[#f2f2f7] p-1 text-[13px] font-semibold">
          {(["atual", "proxima", "futuras"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              className={`flex-1 rounded-lg py-1.5 ${aba === a ? "bg-white shadow-sm" : "text-black/40"}`}
            >
              {a === "atual" ? "Atual" : a === "proxima" ? "Próxima" : "Futuras"}
            </button>
          ))}
        </div>
        {aba !== "futuras" && (
          <>
            <div className="mt-4 text-[13px] text-black/40">
              Fecha {fatura.fechaEm.split("-").reverse().join("/")} · vence {fatura.venceEm.split("-").reverse().join("/")}
            </div>
            <div className="text-[22px] font-bold tabular-nums">{formatarBRL(total)}</div>
            {fatura.status !== "paga" && total > 0 && (
              <button
                type="button"
                onClick={() => onPagar(cartao.id, fatura)}
                className="mt-3 w-full rounded-xl py-3 font-semibold text-white"
                style={{ background: "#7C5CFF" }}
              >
                Pagar
              </button>
            )}
            <ul className="mt-4">
              {lancamentos.map((t) => (
                <li key={t.id} className="flex justify-between py-2 text-[15px]">
                  <span>{t.descricao || "Sem descrição"}{t.parcelaTotal > 1 ? ` · ${t.parcelaN}/${t.parcelaTotal}` : ""}</span>
                  <span className="font-semibold tabular-nums">{formatarBRL(t.valor)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {aba === "futuras" && (
          <div className="mt-4 space-y-2">
            {[2, 3, 4, 5].map((i) => {
              const mes = ((c0.mes - 1 + i) % 12) + 1;
              const ano = c0.ano + Math.floor((c0.mes - 1 + i) / 12);
              const f = faturaDaCompetencia(cartao, faturas, { ano, mes });
              const tot = totalDaFatura(f, transacoes, cartao);
              return (
                <div key={`${ano}-${mes}`} className="flex justify-between rounded-xl bg-[#f2f2f7] px-3 py-3">
                  <span className="capitalize">{rotuloCurto({ ano, mes })} {ano}</span>
                  <span className="font-semibold tabular-nums">{formatarBRL(tot)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PagarFatura({
  cartaoId,
  fatura,
  onClose,
  onCadastrarConta,
}: {
  cartaoId: string;
  fatura: Fatura;
  onClose: () => void;
  onCadastrarConta: () => void;
}) {
  const { cartoes, contas, transacoes, pagarFatura } = useLoja();
  const cartao = cartoes.find((c) => c.id === cartaoId);
  const [contaID, setContaID] = useState(contas[0]?.id ?? "");
  const total = cartao ? totalDaFatura(fatura, transacoes, cartao) : 0;
  const saldo = saldoDevedor(fatura, total);
  const [entrada] = useState(() => EntradaValor.deCentavos(saldo));
  const [, tick] = useState(0);
  if (!cartao) return null;

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo="Pagar fatura"
        esquerda={<BotaoVoltar onClick={onClose} />}
        direita={
          <button
            type="button"
            disabled={!entrada.podeSalvar || !contaID}
            className={entrada.podeSalvar && contaID ? "font-semibold" : "text-black/25"}
            onClick={async () => {
              await pagarFatura({ cartao, fatura, valor: entrada.centavos, contaID });
              onClose();
            }}
          >
            Pagar
          </button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="text-[12px] text-black/40">Saldo devedor</div>
        <div className="text-[26px] font-bold tabular-nums">{formatarBRL(saldo)}</div>
        <div className="mt-4 text-center text-[22px] font-semibold tabular-nums">{formatarBRL(entrada.centavos)}</div>
        {contas.length === 0 ? (
          <div className="mt-4 rounded-xl bg-[#f2f2f7] p-3 text-[13px] text-black/55">
            Cadastre uma conta para escolher de onde sai o pagamento.
            <button type="button" className="mt-2 block font-semibold" style={{ color: "#7C5CFF" }} onClick={onCadastrarConta}>
              Cadastrar conta
            </button>
          </div>
        ) : (
          <label className="mt-4 block">
            <span className="text-[13px] text-black/40">Sai de</span>
            <select value={contaID} onChange={(e) => setContaID(e.target.value)} className="mt-1 w-full rounded-xl bg-[#f2f2f7] px-3 py-3 text-[16px]">
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} · {ROTULO_TIPO_CONTA[c.tipo]}</option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-4 text-[12px] text-black/40">
          O pagamento entra como transferência, não como gasto novo — a compra já foi contada quando aconteceu.
        </p>
      </div>
      <Teclado aoDigitar={(d) => { entrada.digitar(d); tick((n) => n + 1); }} aoApagar={() => { entrada.apagar(); tick((n) => n + 1); }} />
    </div>
  );
}

function Lancamento({ onClose }: { onClose: () => void }) {
  const { cartoes, lancar } = useLoja();
  const [entrada] = useState(() => new EntradaValor());
  const [, tick] = useState(0);
  const [categoriaID, setCategoriaID] = useState(CATEGORIAS[0].id);
  const [descricao, setDescricao] = useState("");
  const [cartaoID, setCartaoID] = useState<string>("");
  const [parcelas, setParcelas] = useState(1);
  const [mais, setMais] = useState(false);
  const despesas = CATEGORIAS.filter((c) => c.tipo === "despesa");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Cabecalho titulo="Lançamento" esquerda={<BotaoVoltar onClick={onClose} />} />
      <div className="px-4">
        <div className="text-center text-[40px] font-bold tabular-nums tracking-tight">{formatarBRL(entrada.centavos)}</div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {despesas.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaID(c.id)}
              className="flex min-h-11 items-center justify-center gap-1 rounded-full px-2 py-2 text-[12px] font-medium leading-tight"
              style={{
                background: categoriaID === c.id ? "#7C5CFF" : "#f2f2f7",
                color: categoriaID === c.id ? "white" : "#111",
              }}
            >
              <IconeCategoria nome={c.icone} size={14} />
              {c.nome}
            </button>
          ))}
        </div>
      </div>
      {mais && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <Campo label="Onde foi o gasto" value={descricao} onChange={setDescricao} />
          <label className="mt-3 block text-[13px] text-black/40">Pago com</label>
          <select value={cartaoID} onChange={(e) => { setCartaoID(e.target.value); if (!e.target.value) setParcelas(1); }} className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3">
            <option value="">Dinheiro, Pix ou débito</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>{c.banco} ••{c.ultimos4}</option>
            ))}
          </select>
          {cartaoID && (
            <>
              <label className="mt-3 block text-[13px] text-black/40">Parcelar em</label>
              <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="w-full rounded-xl bg-[#f2f2f7] px-3 py-3">
                <option value={1}>À vista</option>
                {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
      <div className="mt-auto">
        <Teclado
          mostraSalvar
          podeSalvar={entrada.podeSalvar}
          aoMaisOpcoes={() => setMais((v) => !v)}
          aoDigitar={(d) => { entrada.digitar(d); tick((n) => n + 1); }}
          aoApagar={() => { entrada.apagar(); tick((n) => n + 1); }}
          aoSalvar={async () => {
            if (!entrada.podeSalvar) return;
            await lancar({
              valor: entrada.centavos,
              categoriaID,
              descricao,
              data: new Date(),
              cartaoID: cartaoID || undefined,
              parcelas: cartaoID ? parcelas : 1,
            });
            onClose();
          }}
        />
        <button type="button" onClick={() => setMais((v) => !v)} className="w-full py-2 text-[13px]" style={{ color: "#7C5CFF" }}>
          {mais ? "Ocultar opções" : "Mais opções · cartão e parcelas"}
        </button>
      </div>
    </div>
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
