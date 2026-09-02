import { Providers } from "@/components/Providers";
import { ProvedorAviso } from "@/components/ui/Aviso";
import { Navegacao } from "@/components/ui/Navegacao";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ProvedorAviso>
        <div className="casal-shell">
          <div className="casal-phone">
            <div className="flex h-full min-h-0 flex-1 flex-col">
              <div className="casal-scroll">{children}</div>
              <Navegacao />
            </div>
          </div>
        </div>
      </ProvedorAviso>
    </Providers>
  );
}
