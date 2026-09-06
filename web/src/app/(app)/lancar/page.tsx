import { Lancar, tipoLancarDaQuery } from "@/components/telas/Lancar";

export default async function PaginaLancar({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  return <Lancar tipoInicial={tipoLancarDaQuery(tipo)} />;
}
