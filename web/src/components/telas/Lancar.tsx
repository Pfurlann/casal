"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIAS } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { useAviso } from "../ui/Aviso";
import { IconeCategoria } from "../Icones";

const DESPESAS = CATEGORIAS.filter((c) => c.tipo === "despesa");

export function Lancar() {
  const { cartoes, lancar } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();

  const [entrada] = useState(() => new EntradaValor());
  const [, tick] = useState(0);
  const [categoriaID, setCategoriaID] = useState(DESPESAS[0].id);
  const [descricao, setDescricao] = useState("");
  const [cartaoID, setCartaoID] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const pode = entrada.podeSalvar && !salvando;
  const voltar = () => router.push("/mes");

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
      <Cabecalho titulo="novo gasto" voltarPara="/mes" />
      <div className="px-4 pt-6 text-center">
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

      {mais && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
          <Campo label="Onde foi o gasto" value={descricao} onChange={setDescricao} />
          <div className="mt-4">
            <Rotulo>pago com</Rotulo>
            <select
              value={cartaoID}
              aria-label="Forma de pagamento"
              onChange={(e) => {
                setCartaoID(e.target.value);
                if (!e.target.value) setParcelas(1);
              }}
              className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
            >
              <option value="">Dinheiro, Pix ou débito</option>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · final {c.ultimos4}
                </option>
              ))}
            </select>
          </div>
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
            </div>
          )}
        </div>
      )}

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
          aoMaisOpcoes={() => setMais((v) => !v)}
          podeSalvar={pode}
          mostraSalvar
        />
      </div>
    </div>
  );
}
