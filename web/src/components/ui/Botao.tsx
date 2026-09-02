const VARIANTE = {
  primario: "bg-grafite text-ar",
  secundario: "border border-nevoa text-grafite",
  destrutivo: "text-ambar-texto",
} as const;

export function Botao({
  variante,
  onClick,
  disabled,
  type = "button",
  children,
}: {
  variante: keyof typeof VARIANTE;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[44px] w-full items-center justify-center rounded-controle px-4 font-texto text-[14px] font-semibold disabled:opacity-40 ${VARIANTE[variante]}`}
    >
      {children}
    </button>
  );
}
