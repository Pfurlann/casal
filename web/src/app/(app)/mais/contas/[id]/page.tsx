import { ContaForm } from "@/components/telas/ContaForm";

export default async function PaginaConta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContaForm id={id} />;
}
