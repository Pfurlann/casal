import { ImportarOfx } from "@/components/telas/ImportarOfx";

export default async function PaginaImportarOfx({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ImportarOfx cartaoId={id} />;
}
