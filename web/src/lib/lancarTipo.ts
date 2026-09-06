/** Query `?tipo=gasto|despesa|receita` → tipo interno do lançamento.
 * Shared (sem "use client") — usado por RSC pages e pelo client Lancar.
 */
export function tipoLancarDaQuery(
  raw?: string | null,
): "despesa" | "receita" | undefined {
  if (raw === "receita") return "receita";
  if (raw === "gasto" || raw === "despesa") return "despesa";
  return undefined;
}
