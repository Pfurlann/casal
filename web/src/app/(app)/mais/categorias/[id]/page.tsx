import { CategoriaForm } from "@/components/telas/CategoriaForm";

export default async function PaginaEditarCategoria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CategoriaForm id={id} />;
}
