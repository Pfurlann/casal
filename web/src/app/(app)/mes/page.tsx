import { Mes } from "@/components/telas/Mes";

export default async function PaginaMes({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  return <Mes competenciaRota={c} />;
}
