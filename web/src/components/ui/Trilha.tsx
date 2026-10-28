/**
 * Trilha de 3px, dois segmentos, sem raio. Substitui o card herói:
 * mesma informação, um trigésimo do peso visual.
 */
export function Trilha({
  consumido,
  total,
}: {
  consumido: number;
  total: number;
}) {
  const usado = total > 0 ? Math.min(consumido, total) : 0;
  const resta = total > 0 ? total - usado : 1;
  return (
    <div aria-hidden="true" className="flex h-2 gap-[3px] overflow-hidden rounded-full">
      <div className="bg-marca" style={{ flexGrow: usado }} />
      <div className="bg-nevoa" style={{ flexGrow: resta }} />
    </div>
  );
}
