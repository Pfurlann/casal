export function traduzirErroAuth(msg: string, codigo?: string): string {
  const m = `${codigo ?? ""} ${msg}`.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request")) {
    return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  }
  if (m.includes("supabase não configurado") || m.includes("supabase nao configurado")) {
    return "Não foi possível conectar. Tente de novo em instantes.";
  }
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("user already")) return "Esse e-mail já tem conta. Entre com a senha.";
  if (m.includes("password") && m.includes("6")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("email") && (m.includes("invalid") || m.includes("not_confirmed") || m.includes("not confirmed"))) {
    if (m.includes("confirm")) return "Confirme o e-mail da conta antes de ativar o Face ID. Enquanto isso, entre com a senha.";
    return "E-mail inválido.";
  }
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Espere um minuto.";
  if (m.includes("auth session missing") || m.includes("session missing")) {
    return "A sessão caiu. Entre de novo com e-mail e senha.";
  }
  if (m.includes("notallowed") || m.includes("the operation either timed out or was not allowed") || m.includes("aborted")) {
    return "O Safari bloqueou ou o Face ID foi cancelado. Toque de novo em Ativar Face ID.";
  }
  if (m.includes("passkey_disabled") || m.includes("passkeys are disabled")) {
    return "Passkeys não estão ligadas neste projeto. No Supabase: Authentication → Passkeys, ligue com o domínio casal-liard.vercel.app. Enquanto isso, entre com e-mail e senha.";
  }
  if (m.includes("securityerror") || m.includes("relying party") || m.includes("rp id") || m.includes("not allowed by this document's origin")) {
    return "Abra pelo site casal-liard.vercel.app. Este endereço não pode usar o Face ID.";
  }
  if (m.includes("webauthn_credential_exists")) {
    return "Este aparelho já tem Face ID nesta conta. Toque em Agora não e entre de novo pela biometria.";
  }
  if (m.includes("does not support webauthn")) {
    return "Este Safari não oferece Face ID para sites. Atualize o iOS ou entre com e-mail e senha.";
  }
  return msg.trim() || "Não deu para usar a biometria. Entre com e-mail e senha.";
}

export function textoFalha(error: { message: string; code?: string } | null): string | null {
  if (!error) return null;
  return traduzirErroAuth(error.message, error.code);
}
