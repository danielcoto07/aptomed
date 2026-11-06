import { redirect } from "next/navigation";
import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Rol } from "@/lib/tipos";

export type Perfil = {
  id: string;
  nombre: string;
  rol: Rol;
  empresa_id: string | null;
  codigo_profesional: string | null;
};

// Devuelve el perfil del usuario con sesión, o null si no hay sesión.
// cache(): el layout y la página comparten una sola consulta por visita.
export const obtenerPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, empresa_id, codigo_profesional")
    .eq("id", user.id)
    .single();
  return data as Perfil | null;
});

// Para páginas de un rol: si no hay sesión o el rol no coincide, redirige.
export async function exigirRol(rol: Rol): Promise<Perfil> {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/login");
  if (perfil.rol !== rol) redirect(rutaDeInicio(perfil.rol));
  return perfil;
}

export function rutaDeInicio(rol: Rol) {
  return rol === "medico" ? "/medico" : "/rrhh";
}
