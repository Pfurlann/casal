import { AuthProvider } from "@/lib/auth";
import { Entrar } from "@/components/telas/Entrar";

export default function PaginaEntrar() {
  return (
    <AuthProvider>
      <Entrar />
    </AuthProvider>
  );
}
