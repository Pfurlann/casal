export function Etiqueta({
  ativa,
  aoClicar,
  children,
  className = "",
}: {
  ativa: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativa}
      style={{
        color: ativa ? "var(--marca-texto)" : "var(--grafite)",
        backgroundColor: ativa ? "var(--marca-suave)" : undefined,
        borderColor: ativa ? "var(--marca)" : undefined,
      }}
      className={`casal-toque flex min-h-[44px] items-center justify-center gap-1.5 rounded-etiqueta border px-3 text-[12px] font-semibold ${
        ativa ? "bg-marca-suave" : "border-nevoa bg-ar"
      } ${className}`}
    >
      {children}
    </button>
  );
}
