import { Lancar } from "@/components/telas/Lancar";
import { tipoLancarDaQuery } from "@/lib/lancarTipo";

export default async function PaginaLancar({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  return <Lancar tipoInicial={tipoLancarDaQuery(tipo)} />;
}
