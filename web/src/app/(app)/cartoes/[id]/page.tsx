import { CartaoDetalhe } from "@/components/telas/CartaoDetalhe";

export default async function PaginaCartao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c } = await searchParams;
  return <CartaoDetalhe id={id} competenciaRota={c} />;
}
