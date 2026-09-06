import { Relatorios } from "@/components/telas/Relatorios";

export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  return <Relatorios competenciaRota={c} />;
}
