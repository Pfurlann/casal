import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cliente: SupabaseClient | null | undefined;

export function clienteSupabase(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  if (!url || !key) {
    cliente = null;
    return cliente;
  }
  cliente = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      experimental: { passkey: true },
    },
  });
  return cliente;
}
