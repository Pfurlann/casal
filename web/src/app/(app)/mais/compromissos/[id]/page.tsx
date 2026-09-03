import { CompromissoForm } from "@/components/telas/CompromissoForm";

export default async function PaginaCompromisso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompromissoForm id={id} />;
}
