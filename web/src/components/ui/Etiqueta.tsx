export function Etiqueta({
  ativa,
  aoClicar,
  children,
}: {
  ativa: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativa}
      className={`flex min-h-[44px] items-center gap-1.5 rounded-etiqueta px-3 text-[12px] ${
        ativa
          ? "bg-grafite text-ar"
          : "border border-nevoa text-grafite"
      }`}
    >
      {children}
    </button>
  );
}
