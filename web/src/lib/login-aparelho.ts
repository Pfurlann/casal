export const CHAVE_EMAIL = "casal-email";

export function validarLogin(email: string, senha: string): string | null {
  if (!email.trim().includes("@")) return "Informe um e-mail válido.";
  if (senha.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  return null;
}

export function lerEmailLembrado(): string {
  try {
    return localStorage.getItem(CHAVE_EMAIL) ?? "";
  } catch {
    return "";
  }
}

export function gravarEmailLembrado(email: string): void {
  try {
    localStorage.setItem(CHAVE_EMAIL, email.trim());
  } catch {
    // armazenamento bloqueado
  }
}

export function apagarEmailLembrado(): void {
  try {
    localStorage.removeItem(CHAVE_EMAIL);
  } catch {
    // armazenamento bloqueado
  }
}

export function rotuloBiometria(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "Face ID";
  if (/Macintosh/.test(ua)) return "Touch ID";
  if (/Windows NT/.test(ua)) return "Windows Hello";
  if (/Android/.test(ua)) return "impressão digital";
  return "biometria deste aparelho";
}

export function textoBotaoBiometria(ua?: string): string {
  const rotulo = rotuloBiometria(ua);
  if (rotulo === "impressão digital") return "Entrar com impressão digital";
  if (rotulo === "biometria deste aparelho") return "Entrar com biometria deste aparelho";
  return `Entrar com ${rotulo}`;
}

export async function biometriaDoAparelhoDisponivel(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  const checar = window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
  if (typeof checar === "function") {
    try {
      return await checar.call(window.PublicKeyCredential);
    } catch {
      return false;
    }
  }
  return typeof navigator.credentials?.get === "function";
}

type CtorSenha = new (dados: { id: string; password: string }) => Credential;

export async function guardarSenhaNoAparelho(email: string, senha: string): Promise<void> {
  if (typeof window === "undefined") return;
  const Ctor = (window as unknown as { PasswordCredential?: CtorSenha }).PasswordCredential;
  if (!Ctor || typeof navigator.credentials?.store !== "function") return;
  try {
    await navigator.credentials.store(new Ctor({ id: email.trim(), password: senha }));
  } catch {
    // o gerenciador do sistema recusou; o e-mail lembrado ainda vale
  }
}
