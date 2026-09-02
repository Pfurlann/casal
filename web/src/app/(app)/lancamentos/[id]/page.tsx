import { EditarLancamento } from "@/components/telas/EditarLancamento";

export default async function PaginaEditarLancamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditarLancamento id={id} />;
}
