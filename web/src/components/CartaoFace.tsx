"use client";

import type { Cartao } from "@/lib/domain";
import { ROTULO_BANDEIRA } from "@/lib/domain";
import { formatarBRL } from "@/lib/money";

export function CartaoFace({
  cartao,
  tamanho,
  faturaAtual,
}: {
  cartao: Cartao;
  tamanho: "miniatura" | "media" | "grande";
  faturaAtual?: number;
}) {
  const h = tamanho === "miniatura" ? 34 : tamanho === "media" ? 110 : 150;
  const r = tamanho === "miniatura" ? 7 : tamanho === "media" ? 14 : 16;
  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        height: h,
        borderRadius: r,
        background: `linear-gradient(135deg, ${cartao.cor}, ${cartao.cor}b8)`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      {tamanho === "miniatura" ? (
        <div className="absolute bottom-1 left-1.5 text-[8px] font-bold uppercase">
          {cartao.banco.slice(0, 2)}
        </div>
      ) : (
        <div className="relative flex h-full flex-col p-3">
          <div className="flex justify-between">
            <div>
              <div className="text-[11.5px] font-bold">{cartao.banco || "Banco"}</div>
              <div className="text-[9.5px] opacity-75">{cartao.apelido || "Apelido"}</div>
            </div>
            <div className="text-[8.5px] font-bold opacity-85">
              {cartao.bandeira === "outra" ? "" : ROTULO_BANDEIRA[cartao.bandeira].toUpperCase()}
            </div>
          </div>
          <div className="mt-auto font-mono text-[11px] tracking-wide opacity-90">
            •••• {cartao.ultimos4 || "0000"}
          </div>
          {tamanho === "grande" && faturaAtual != null && (
            <div className="mt-2">
              <div className="text-[7.5px] font-semibold opacity-65">FATURA ATUAL</div>
              <div className="text-[13.5px] font-bold">{formatarBRL(faturaAtual)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
