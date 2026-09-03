import { MetaForm } from "@/components/telas/MetaForm";

export default async function PaginaMeta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MetaForm id={id} />;
}
