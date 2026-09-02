import { CartaoDetalhe } from "@/components/telas/CartaoDetalhe";

export default async function PaginaCartao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CartaoDetalhe id={id} />;
}
