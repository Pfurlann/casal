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
        color: ativa ? "var(--ar)" : "var(--grafite)",
        backgroundColor: ativa ? "var(--grafite)" : undefined,
      }}
      className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-etiqueta px-3 text-[12px] ${
        ativa ? "bg-grafite" : "border border-nevoa"
      } ${className}`}
    >
      {children}
    </button>
  );
}
