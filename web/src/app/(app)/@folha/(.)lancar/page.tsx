"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Folha } from "@/components/ui/Folha";
import { Lancar } from "@/components/telas/Lancar";
import { fecharFolha } from "@/lib/folha-nav";

export default function FolhaLancar() {
  const router = useRouter();
  const fechar = useCallback(() => fecharFolha(router), [router]);
  return (
    <Folha aoFechar={fechar} trava>
      <Lancar comoFolha aoSair={fechar} />
    </Folha>
  );
}
