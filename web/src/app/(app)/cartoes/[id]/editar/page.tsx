import { CartaoForm } from "@/components/telas/CartaoForm";

export default async function PaginaEditarCartao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CartaoForm id={id} />;
}
