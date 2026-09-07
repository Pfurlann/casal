const VARIANTE = {
  primario: "bg-grafite text-ar",
  secundario: "border border-nevoa text-grafite",
  destrutivo: "text-ambar-texto",
} as const;

export function Botao({
  variante,
  onClick,
  disabled,
  carregando,
  type = "button",
  largura = "cheia",
  children,
}: {
  variante: keyof typeof VARIANTE;
  onClick?: () => void;
  disabled?: boolean;
  carregando?: boolean;
  type?: "button" | "submit";
  /** cheia = w-full (padrão). auto = encolhe ao conteúdo — use em toolbars flex-row. */
  largura?: "cheia" | "auto";
  children: React.ReactNode;
}) {
  const larguraCls = largura === "auto" ? "w-auto shrink-0 px-4" : "w-full px-4";
  const desabilitado = disabled || carregando;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={desabilitado}
      aria-busy={carregando || undefined}
      className={`casal-toque flex min-h-[44px] items-center justify-center rounded-controle font-texto text-[14px] font-semibold disabled:opacity-40 ${larguraCls} ${VARIANTE[variante]}`}
    >
      {carregando ? (
        <span className="casal-spinner" aria-label="Carregando">
          <span />
        </span>
      ) : (
        children
      )}
    </button>
  );
}
