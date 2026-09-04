import { ImportarOfxConta } from "@/components/telas/ImportarOfxConta";

export default async function PaginaImportarOfxConta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ImportarOfxConta contaId={id} />;
}
