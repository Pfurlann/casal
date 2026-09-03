import { DespesaFixaForm } from "@/components/telas/DespesaFixaForm";

export default async function PaginaFixa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DespesaFixaForm id={id} />;
}
