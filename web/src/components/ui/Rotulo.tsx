/** Etiqueta de seção. Não é título: não entra na hierarquia de cabeçalhos. */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-texto text-[10px] font-semibold uppercase tracking-[0.2em] text-cinza">
      {children}
    </div>
  );
}
