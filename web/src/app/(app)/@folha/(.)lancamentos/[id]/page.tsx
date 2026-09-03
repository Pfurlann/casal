"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Folha } from "@/components/ui/Folha";
import { EditarLancamento } from "@/components/telas/EditarLancamento";
import { fecharFolha } from "@/lib/folha-nav";

export default function FolhaEditarLancamento() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const fechar = useCallback(() => fecharFolha(router), [router]);
  return (
    <Folha aoFechar={fechar} rotulo="Editar lançamento" trava>
      <EditarLancamento id={id} aoSair={fechar} />
    </Folha>
  );
}
