import { notFound } from "next/navigation";
import { competenciaDaRota } from "@/lib/domain";
import { PagarFatura } from "@/components/telas/PagarFatura";

export default async function PaginaPagarFatura({
  params,
}: {
  params: Promise<{ id: string; competencia: string }>;
}) {
  const { id, competencia } = await params;
  try {
    return <PagarFatura cartaoId={id} competencia={competenciaDaRota(competencia)} />;
  } catch {
    notFound();
  }
}
