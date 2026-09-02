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
        <div className="lg:flex lg:justify-center">
          <Navegacao />
          <main className="mx-auto w-full max-w-[560px] pb-[132px] lg:mx-0 lg:max-w-[640px] lg:pb-12">
            {children}
          </main>
        </div>
        {folha}
      </ProvedorAviso>
    </Providers>
  );
}
