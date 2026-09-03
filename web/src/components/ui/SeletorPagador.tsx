import { rotuloPagador, type MembroPagador } from "@/lib/pagador";

const SELECT =
  "mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite";

export function SeletorPagador({
  membros,
  usuarioID,
  valor,
  onChange,
}: {
  membros: MembroPagador[];
  usuarioID?: string;
  valor: string;
  onChange: (id: string) => void;
}) {
  const base =
    membros.length > 0
      ? membros
      : usuarioID
        ? [{ userId: usuarioID, email: "" }]
        : [];
  const opcoes =
    valor && !base.some((m) => m.userId === valor)
      ? [...base, { userId: valor, email: "" }]
      : base;
  if (opcoes.length === 0) return null;

  return (
    <select
      value={valor}
      aria-label="Quem pagou"
      onChange={(e) => onChange(e.target.value)}
      className={SELECT}
    >
      {opcoes.map((m) => (
        <option key={m.userId} value={m.userId}>
          {rotuloPagador(m, usuarioID)}
        </option>
      ))}
    </select>
  );
}
