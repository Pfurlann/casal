"use client";

import { useParams, useRouter } from "next/navigation";
import { Folha } from "@/components/ui/Folha";
import { EditarLancamento } from "@/components/telas/EditarLancamento";

export default function FolhaEditarLancamento() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  return (
    <Folha aoFechar={() => router.back()} rotulo="Editar lançamento">
      <EditarLancamento id={id} />
    </Folha>
  );
}
