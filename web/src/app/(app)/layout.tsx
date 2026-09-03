import { Providers } from "@/components/Providers";
import { ProvedorAviso } from "@/components/ui/Aviso";
import { Navegacao } from "@/components/ui/Navegacao";

export default function LayoutApp({
  children,
  folha,
}: {
  children: React.ReactNode;
  folha: React.ReactNode;
}) {
  return (
    <Providers>
      <ProvedorAviso>
        <div className="casal-shell">
          <Navegacao />
          <main className="casal-principal">
            {children}
          </main>
        </div>
        {folha}
      </ProvedorAviso>
    </Providers>
  );
}
