import { CarteiraForm } from "@/components/telas/CarteiraForm";

export default async function PaginaEditarCarteira({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CarteiraForm id={id} />;
}
