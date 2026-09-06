import { tipoLancarDaQuery } from "@/lib/lancarTipo";
import { FolhaLancar } from "./FolhaLancar";

export default async function PaginaFolhaLancar({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  return <FolhaLancar tipoInicial={tipoLancarDaQuery(tipo)} />;
}
