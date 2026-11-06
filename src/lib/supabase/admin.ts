import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la clave secreta: ignora RLS. Solo para rutas del candidato,
// que no tiene cuenta y siempre se valida por su token. Nunca llega al navegador.
export function crearClienteAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, opciones) => fetch(url, { ...opciones, cache: "no-store" }) },
  });
}
