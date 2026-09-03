"use client";

import { useParams, useRouter } from "next/navigation";
import { Folha } from "@/components/ui/Folha";
import { EditarLancamento } from "@/components/telas/EditarLancamento";

export default function FolhaEditarLancamento() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  return (
    <Folha aoFechar={() => router.back()} rotulo="Editar lançamento" trava>
      <EditarLancamento id={id} />
    </Folha>
  );
}
