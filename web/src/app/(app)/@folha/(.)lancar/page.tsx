import { tipoLancarDaQuery } from "@/components/telas/Lancar";
import { FolhaLancar } from "./FolhaLancar";

export default async function PaginaFolhaLancar({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  return <FolhaLancar tipoInicial={tipoLancarDaQuery(tipo)} />;
}
