"use client";

import { useRouter } from "next/navigation";
import { Folha } from "@/components/ui/Folha";
import { Lancar } from "@/components/telas/Lancar";

export default function FolhaLancar() {
  const router = useRouter();
  return (
    <Folha aoFechar={() => router.back()}>
      <Lancar />
    </Folha>
  );
}
